//! Axum HTTP router – replaces `src/server/socketServer.ts`.
//!
//! Builds the full `axum::Router` with:
//! - Security-header middleware (`SecurityLayer`)
//! - HTTP compression (`tower_http::CompressionLayer`)
//! - Request tracing (`tower_http::TraceLayer`)
//! - Static-file serving for the compiled browser client
//! - HTML template routes (`GET /`, `GET /ssh/:user`)
//! - Prometheus metrics route
//! - Service-worker helper route
//! - Socket.IO upgrade layer (socketioxide)

use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::{
    extract::{Path as AxumPath, State},
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::fs;
use tokio::net::TcpListener;
use tower_http::{
    compression::CompressionLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::info;

use crate::config::{ServerConfig, SshConfig, SslConfig};
use crate::metrics::metrics_handler;
use crate::security::SecurityLayer;
use crate::socket::on_connect;

// ── HTML template ─────────────────────────────────────────────────────────────

fn render_html(base: &str, title: &str) -> String {
    // NOTE: Use r##"..."## so that href="#" inside the template does not
    // accidentally terminate the raw string (r##"..."## requires two hashes to
    // close, whereas href="#" only has one).
    format!(
        r##"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#1e1e1e">
    <link rel="icon" type="image/x-icon" href="{base}/client/favicon.ico">
    <link rel="manifest" href="{base}/client/manifest.json">
    <title>{title}</title>
    <link rel="stylesheet" href="{base}/client/wetty.css" />
  </head>
  <body>
    <div id="overlay">
      <div class="error">
        <div id="msg"></div>
        <input type="button" onclick="location.reload();" value="reconnect" />
      </div>
    </div>
    <div id="functions">
      <a class="toggler" href="#" alt="Toggle keyboard" onclick="window.toggleFunctions()">
        <i class="fas fa-keyboard"></i>
      </a>
      <div class="onscreen-buttons">
        <a href="#" onclick="window.pressESC()"><div>Esc</div></a>
        <a href="#" onclick="window.pressTAB()"><div>Tab</div></a>
        <a id="onscreen-ctrl" href="#" onclick="window.toggleCTRL()"><div>Ctrl</div></a>
        <a href="#" onclick="window.pressLEFT()"><div>&#9664;</div></a>
        <a href="#" onclick="window.pressUP()"><div>&#9650;</div></a>
        <a href="#" onclick="window.pressRIGHT()"><div>&#9654;</div></a>
        <a href="#" style="visibility:hidden"><div></div></a>
        <a href="#" onclick="window.pressDOWN()"><div>&#9660;</div></a>
        <a href="#" style="visibility:hidden"><div></div></a>
      </div>
    </div>
    <div id="options">
      <a class="toggler" href="#" alt="Toggle options">
        <i class="fas fa-cogs"></i>
      </a>
      <iframe class="editor" src="{base}/client/xterm_config/index.html"></iframe>
    </div>
    <div id="terminal"></div>
    <script type="module" src="{base}/client/wetty.js"></script>
  </body>
</html>"##
    )
}

// ── Shared app state ──────────────────────────────────────────────────────────

#[derive(Clone)]
struct AppState {
    base: String,
    title: String,
    build_dir: PathBuf,
}

// ── Route handlers ────────────────────────────────────────────────────────────

async fn index_handler(State(state): State<Arc<AppState>>) -> Html<String> {
    Html(render_html(&state.base, &state.title))
}

async fn ssh_user_handler(
    State(state): State<Arc<AppState>>,
    AxumPath(_user): AxumPath<String>,
) -> Html<String> {
    Html(render_html(&state.base, &state.title))
}

async fn sw_handler(State(state): State<Arc<AppState>>) -> Response {
    let path = state.build_dir.join("sw.js");
    match fs::read(&path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "application/javascript")],
            bytes,
        )
            .into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

/// Redirect trailing-slash requests to the canonical path.
async fn redirect_trailing_slash(
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
) -> Response {
    let path = uri.path();
    if path.len() > 1 && path.ends_with('/') {
        let trimmed = path.trim_end_matches('/');
        axum::response::Redirect::permanent(trimmed).into_response()
    } else {
        StatusCode::NOT_FOUND.into_response()
    }
}

// ── Router builder ────────────────────────────────────────────────────────────

/// Normalise the base path: always starts with `/`, never ends with `/`.
pub fn trim_base(base: &str) -> String {
    let b = base.trim_end_matches('/');
    if b.is_empty() { "/".into() } else { b.into() }
}

/// Build the full axum `Router` for the given configuration.
///
/// The `build_dir` argument should point to the compiled client assets
/// directory (i.e. `<repo>/build`).
pub fn build_router(
    server: &ServerConfig,
    ssh: SshConfig,
    command: String,
    forcessh: bool,
    build_dir: PathBuf,
) -> (Router, SocketIo) {
    crate::metrics::init();

    let base = trim_base(&server.base);
    let title = server.title.clone();
    let allow_iframe = server.allow_iframe;

    let state = Arc::new(AppState {
        base: base.clone(),
        title,
        build_dir: build_dir.clone(),
    });

    // ── Socket.IO ─────────────────────────────────────────────────────────────
    // The socket.io client connects to `{base}/socket.io` so we configure
    // socketioxide with a matching req_path.
    let socket_path = format!("{base}/socket.io");
    let (socket_layer, io) = SocketIo::builder()
        .req_path(socket_path)
        .build_layer();

    // Register the connection handler on the root namespace.
    {
        let ssh_clone = ssh.clone();
        let cmd_clone = command.clone();
        io.ns("/", move |socket: SocketRef| {
            let ssh = ssh_clone.clone();
            let cmd = cmd_clone.clone();
            on_connect(socket, ssh, cmd, forcessh);
        });
    }

    // ── Static client files ───────────────────────────────────────────────────
    let client_dir = build_dir.join("client");
    let serve_client = ServeDir::new(&client_dir);

    // ── Route table ───────────────────────────────────────────────────────────
    // Build a nested path: if base == "/", mount at root; otherwise nest.
    let app = if base == "/" {
        Router::new()
            .route("/metrics", get(metrics_handler))
            .route("/", get(index_handler))
            .route("/ssh/{user}", get(ssh_user_handler))
            .route("/sw.js", get(sw_handler))
            .nest_service("/client", serve_client)
    } else {
        Router::new()
            .route(&format!("{base}/metrics"), get(metrics_handler))
            .route(&base, get(index_handler))
            .route(&format!("{base}/ssh/{{user}}"), get(ssh_user_handler))
            .route(&format!("{base}/sw.js"), get(sw_handler))
            .nest_service(&format!("{base}/client"), serve_client)
    };

    let router = app
        // Catch-all for trailing-slash redirects
        .fallback(redirect_trailing_slash)
        .with_state(state)
        // Socket.IO upgrade middleware (must come before compression)
        .layer(socket_layer)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(SecurityLayer::new(allow_iframe));

    (router, io)
}

// ── Server startup ────────────────────────────────────────────────────────────

/// Binds a TCP listener and serves `router` until `shutdown_rx` fires.
pub async fn serve(
    router: Router,
    server: &ServerConfig,
    ssl: Option<&SslConfig>,
    shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if !server.socket.is_empty() {
        // UNIX socket
        #[cfg(unix)]
        {
            use tokio::net::UnixListener;
            let path = Path::new(&server.socket);
            if path.exists() {
                std::fs::remove_file(path)?;
            }
            let listener = UnixListener::bind(path)?;
            info!("Server listening on UNIX socket {}", server.socket);
            axum::serve(listener, router)
                .with_graceful_shutdown(async { let _ = shutdown_rx.await; })
                .await?;
        }
        #[cfg(not(unix))]
        return Err("UNIX sockets are not supported on this platform".into());
    } else if let Some(ssl_conf) = ssl {
        // HTTPS via axum-server with rustls
        use axum_server::tls_rustls::RustlsConfig;

        let tls_config = RustlsConfig::from_pem_file(&ssl_conf.cert, &ssl_conf.key).await?;
        let addr: SocketAddr = format!("{}:{}", server.host, server.port).parse()?;
        info!("Server listening on https://{addr}");

        let handle = axum_server::Handle::new();
        let handle_clone = handle.clone();
        tokio::spawn(async move {
            let _ = shutdown_rx.await;
            handle_clone.graceful_shutdown(Some(std::time::Duration::from_secs(5)));
        });

        axum_server::bind_rustls(addr, tls_config)
            .handle(handle)
            .serve(router.into_make_service())
            .await?;
    } else {
        // Plain HTTP
        let addr: SocketAddr = format!("{}:{}", server.host, server.port).parse()?;
        let listener = TcpListener::bind(addr).await?;
        info!("Server listening on http://{addr}");
        axum::serve(listener, router)
            .with_graceful_shutdown(async { let _ = shutdown_rx.await; })
            .await?;
    }

    info!("Server shut down");
    Ok(())
}
