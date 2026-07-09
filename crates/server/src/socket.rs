//! Socket.IO connection handler – wires `socketioxide` events to the PTY.
//!
//! Mirrors the connection logic in `src/server.ts` and `src/server/spawn.ts`.

use socketioxide::extract::{Data, SocketRef, TryData};
use socketioxide::socket::DisconnectReason;
use tracing::{debug, info, warn};

use crate::command::{get_command, SocketInfo};
use crate::config::SshConfig;
use crate::metrics::WETTY_CONNECTIONS;
use crate::pty;

/// Serde types for the resize event payload.
#[derive(serde::Deserialize, Debug)]
struct ResizePayload {
    cols: u16,
    rows: u16,
}

/// Register the namespace handler on the root `/` namespace.
///
/// `io.ns("/", on_connect(…))` should be called once during app setup.
pub fn on_connect(socket: SocketRef, ssh: &SshConfig, command: &str, forcessh: bool) {
    info!("Connection accepted: {}", socket.id);
    WETTY_CONNECTIONS.inc();

    // Extract handshake metadata needed by get_command
    let referer = socket
        .req_parts()
        .headers
        .get("referer")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let header_user = socket
        .req_parts()
        .headers
        .get("remote-user")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    // Extract /ssh/<user> from the Referer path, if present.
    // Extract the username from the last `/ssh/<user>` segment of the Referer
    // URL, stripping any trailing query-string. `rfind` is used so that the
    // rightmost `/ssh/` segment wins (e.g. `/wetty/ssh/alice` → `"alice"`).
    let path_user = referer.as_deref().and_then(|r| {
        r.rfind("/ssh/").map(|idx| {
            let after = &r[idx + 5..]; // skip the 5-char "/ssh/" prefix
            after.split('?').next().unwrap_or(after).to_string()
        })
    });

    // For now we use the socket's peer address; in axum-socketioxide the
    // remote address comes from the HTTP upgrade request headers.
    let remote_address = socket
        .req_parts()
        .headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("127.0.0.1")
        .to_string();

    let info = SocketInfo {
        referer,
        remote_address,
        path_user,
        header_user,
    };

    let args = get_command(&info, ssh, command, forcessh);
    debug!("Command generated: {:?}", args);

    // Spawn PTY
    let channels = match pty::spawn(&args) {
        Ok(ch) => ch,
        Err(e) => {
            warn!("Failed to spawn PTY: {e}");
            let _ = socket.emit("logout", &());
            WETTY_CONNECTIONS.dec();
            return;
        }
    };

    let pty::PtyChannels {
        input_tx,
        resize_tx,
        commit_tx,
        mut output_rx,
        mut exit_rx,
        kill_tx,
    } = channels;

    // Emit "login" to signal the terminal is ready.
    let _ = socket.emit("login", &());

    // ── socket → PTY: input ───────────────────────────────────────────────────
    socket.on("input", {
        let input_tx = input_tx.clone();
        move |_socket: SocketRef, Data::<String>(data)| {
            let _ = input_tx.try_send(data);
        }
    });

    // ── socket → PTY: resize ─────────────────────────────────────────────────
    socket.on(
        "resize",
        move |_socket: SocketRef, TryData::<ResizePayload>(payload)| {
            if let Ok(p) = payload {
                let _ = resize_tx.try_send((p.cols, p.rows));
            }
        },
    );

    // ── socket → PTY: flow-control commit ────────────────────────────────────
    socket.on(
        "commit",
        move |_socket: SocketRef, Data::<serde_json::Value>(val)| {
            let size = val.as_i64().unwrap_or(0);
            let _ = commit_tx.try_send(size);
        },
    );

    // ── socket disconnect: kill PTY ───────────────────────────────────────────
    socket.on_disconnect(move |_socket: SocketRef, _reason: DisconnectReason| {
        info!("Socket disconnected – killing PTY");
        let _ = kill_tx.try_send(());
    });

    // ── PTY → socket: output data ─────────────────────────────────────────────
    tokio::spawn({
        let socket = socket.clone();
        async move {
            while let Some(data) = output_rx.recv().await {
                if socket.emit("data", &data).is_err() {
                    break;
                }
            }
        }
    });

    // ── PTY exit → socket: logout ─────────────────────────────────────────────
    tokio::spawn(async move {
        if let Some(exit_code) = exit_rx.recv().await {
            info!("PTY process exited with code {exit_code}");
            let _ = socket.emit("logout", &());
        }
        WETTY_CONNECTIONS.dec();
    });
}
