//! napi-rs entry point – exposes `start` and `decorateServerWithSsh` to Node.js.
//!
//! The public API is intentionally kept compatible with the TypeScript API
//! defined in `src/server.ts`:
//!
//! ```typescript
//! export function start(ssh?, serverConf?, command?, forcessh?, ssl?): Promise<ServerHandle>
//! export function decorateServerWithSsh(ssh?, serverConf?, command?, forcessh?, ssl?): Promise<ServerHandle>
//! ```
//!
//! `ServerHandle` exposes a single `close()` method that triggers a graceful
//! shutdown of the underlying axum server.
//!
//! ## Testing note
//!
//! All `#[napi]` code is gated behind `#[cfg(feature = "node-binding")]`.
//! Node.js C API symbols are only available at runtime when the `.node` addon
//! is loaded by Node.js; linking them into a regular `cargo test` binary would
//! fail.  Integration tests import the inner modules (`app`, `config`, …) directly.

#![deny(clippy::all)]

pub mod app;
pub mod command;
pub mod config;
pub mod flowcontrol;
pub mod metrics;
pub mod pty;
pub mod security;
pub mod socket;
pub mod ssl;

// ── napi bindings (excluded from test builds) ────────────────────────────────

#[cfg(feature = "node-binding")]
mod napi_bindings {
    use std::path::PathBuf;

    use napi_derive::napi;
    use tokio::sync::{oneshot, Mutex};
    use tokio::task::JoinHandle;

    use super::config::{ServerConfig, SshConfig, SslConfig};

    // ── ServerHandle ─────────────────────────────────────────────────────────

    /// Handle to a running WeTTY server instance.
    ///
    /// Call `close()` to trigger graceful shutdown.
    #[napi]
    pub struct ServerHandle {
        shutdown_tx: Mutex<Option<oneshot::Sender<()>>>,
        join_handle: Mutex<Option<JoinHandle<()>>>,
    }

    #[napi]
    impl ServerHandle {
        /// Gracefully shut down the server.
        #[napi]
        pub fn close(&self) -> napi::Result<()> {
            if let Some(tx) = self.shutdown_tx.blocking_lock().take() {
                let _ = tx.send(());
            }
            Ok(())
        }

        /// Wait for the server to stop. Resolves when the server exits.
        #[napi]
        pub async fn wait(&self) -> napi::Result<()> {
            if let Some(handle) = self.join_handle.lock().await.take() {
                let _ = handle.await;
            }
            Ok(())
        }
    }

    // ── Helper: resolve `build/` directory ───────────────────────────────────

    fn build_dir() -> PathBuf {
        if let Ok(dir) = std::env::var("WETTY_BUILD_DIR") {
            return PathBuf::from(dir);
        }
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        cwd.join("build")
    }

    // ── Internal server starter ───────────────────────────────────────────────

    async fn start_server(
        ssh: SshConfig,
        server_conf: ServerConfig,
        command: String,
        forcessh: bool,
        ssl: Option<SslConfig>,
    ) -> napi::Result<ServerHandle> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        let build = build_dir();
        let (router, _io) = super::app::build_router(&server_conf, ssh, command, forcessh, build);

        let server_conf_clone = server_conf.clone();
        let ssl_clone = ssl.clone();

        let join_handle = tokio::spawn(async move {
            if let Err(e) =
                super::app::serve(router, &server_conf_clone, ssl_clone.as_ref(), shutdown_rx).await
            {
                tracing::error!("Server error: {e}");
            }
        });

        Ok(ServerHandle {
            shutdown_tx: Mutex::new(Some(shutdown_tx)),
            join_handle: Mutex::new(Some(join_handle)),
        })
    }

    // ── Exported napi functions ───────────────────────────────────────────────

    /// Start a WeTTY server with the given options.
    #[napi]
    pub async fn start(
        ssh: Option<SshConfig>,
        server_conf: Option<ServerConfig>,
        command: Option<String>,
        forcessh: Option<bool>,
        ssl: Option<SslConfig>,
    ) -> napi::Result<ServerHandle> {
        let _ = tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "info".into()),
            )
            .try_init();

        start_server(
            ssh.unwrap_or_default(),
            server_conf.unwrap_or_default(),
            command.unwrap_or_else(|| "login".into()),
            forcessh.unwrap_or(false),
            ssl,
        )
        .await
    }

    /// Start a WeTTY server, accepting an existing Express app as the first
    /// argument for backward-compatibility.  The `app` argument is **ignored**.
    #[napi]
    pub async fn decorate_server_with_ssh(
        ssh: Option<SshConfig>,
        server_conf: Option<ServerConfig>,
        command: Option<String>,
        forcessh: Option<bool>,
        ssl: Option<SslConfig>,
    ) -> napi::Result<ServerHandle> {
        let _ = tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "info".into()),
            )
            .try_init();

        start_server(
            ssh.unwrap_or_default(),
            server_conf.unwrap_or_default(),
            command.unwrap_or_else(|| "login".into()),
            forcessh.unwrap_or(false),
            ssl,
        )
        .await
    }
}

// Re-export napi items at crate root when not in test mode so that napi-rs
// can locate the registration functions via the `#[napi]` proc-macro.
#[cfg(feature = "node-binding")]
pub use napi_bindings::*;
