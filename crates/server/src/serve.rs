//! Server startup – TCP, TLS, and UNIX socket binding.

use std::net::SocketAddr;
use std::path::Path;

use axum::Router;
use tokio::net::TcpListener;
use tracing::info;

use crate::config::{ServerConfig, SslConfig};

/// Binds a TCP listener and serves `router` until `shutdown_rx` fires.
///
/// # Errors
///
/// Returns an error if binding the listener fails, TLS configuration is
/// invalid, or the server encounters a fatal runtime error.
pub async fn serve(
    router: Router,
    server: &ServerConfig,
    ssl: Option<&SslConfig>,
    shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if !server.socket.is_empty() {
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
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await?;
        }
        #[cfg(not(unix))]
        return Err("UNIX sockets are not supported on this platform".into());
    } else if let Some(ssl_conf) = ssl {
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
        let addr: SocketAddr = format!("{}:{}", server.host, server.port).parse()?;
        let listener = TcpListener::bind(addr).await?;
        info!("Server listening on http://{addr}");
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await?;
    }

    info!("Server shut down");
    Ok(())
}
