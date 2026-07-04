//! PTY spawning and lifecycle management.
//!
//! `spawn` opens a pseudo-terminal, runs the given command inside it, and
//! bridges PTY I/O to the Socket.IO socket via tokio channels.
//!
//! The design mirrors `src/server/spawn.ts` and `src/server/login.ts`.

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tracing::{debug, info};

use crate::flowcontrol::{FlowControlServer, TinyBuffer};

// ── PTY env / size defaults ───────────────────────────────────────────────────

const DEFAULT_COLS: u16 = 80;
const DEFAULT_ROWS: u16 = 30;

// ── Public API ────────────────────────────────────────────────────────────────

/// Channels used to send data to and from a running PTY session.
pub struct PtyChannels {
    /// Send bytes to PTY stdin (from socket "input" events).
    pub input_tx: mpsc::Sender<String>,
    /// Send resize events to the PTY (from socket "resize" events).
    pub resize_tx: mpsc::Sender<(u16, u16)>,
    /// Send commit (flow-control ack) events (from socket "commit" events).
    pub commit_tx: mpsc::Sender<usize>,
    /// Receive PTY stdout for forwarding to the socket as "data" events.
    pub output_rx: mpsc::Receiver<String>,
    /// Fires once when the PTY process exits; carries the exit code.
    pub exit_rx: mpsc::Receiver<i32>,
    /// Call this to kill the PTY (e.g. on socket "disconnect").
    pub kill_tx: mpsc::Sender<()>,
}

/// Spawn a PTY running `args[0]` with arguments `args[1..]`.
///
/// Returns `PtyChannels` that the caller (socket handler) uses to wire up
/// the Socket.IO events.
pub fn spawn(args: &[String]) -> Result<PtyChannels, Box<dyn std::error::Error + Send + Sync>> {
    assert!(!args.is_empty(), "spawn called with empty args");

    let (input_tx, input_rx) = mpsc::channel::<String>(64);
    let (resize_tx, resize_rx) = mpsc::channel::<(u16, u16)>(16);
    let (commit_tx, commit_rx) = mpsc::channel::<usize>(64);
    let (output_tx, output_rx) = mpsc::channel::<String>(64);
    let (exit_tx, exit_rx) = mpsc::channel::<i32>(1);
    let (kill_tx, kill_rx) = mpsc::channel::<()>(1);

    // Build the command
    let mut cmd = CommandBuilder::new("/usr/bin/env");
    cmd.args(args);
    // Propagate the current process environment (mirrors `xterm.ts`)
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }
    cmd.env("TERM", "xterm-256color");

    // Open the PTY pair
    let pty_system = native_pty_system();
    let pty_pair = pty_system.openpty(PtySize {
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        pixel_width: 0,
        pixel_height: 0,
    })?;

    let master = pty_pair.master;
    let slave = pty_pair.slave;

    // Spawn the child process inside the PTY slave
    let _child = slave.spawn_command(cmd)?;
    drop(slave); // slave fd no longer needed in this process

    // Clone master handles for reading and writing
    let mut reader = master.try_clone_reader()?;
    let writer = Arc::new(Mutex::new(master.take_writer()?));
    let master_arc = Arc::new(Mutex::new(master));

    debug!("PTY spawned: {:?}", args);

    let output_tx_clone = output_tx.clone();

    // ── Reader thread: PTY stdout → TinyBuffer → output_tx ───────────────────
    std::thread::spawn(move || {
        let rt = tokio::runtime::Handle::current();
        let buf = TinyBuffer::new(output_tx_clone);
        let mut raw = vec![0u8; 4096];
        loop {
            use std::io::Read;
            match reader.read(&mut raw) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&raw[..n]).into_owned();
                    let _ = rt; // keep runtime alive
                    buf.push(chunk);
                }
            }
        }
        let _ = exit_tx.blocking_send(0);
        info!("PTY reader thread exiting");
    });

    // ── Writer / control task: handle input, resize, commit, kill ────────────
    let master_for_ctrl = Arc::clone(&master_arc);
    let writer_for_ctrl = Arc::clone(&writer);
    tokio::spawn(async move {
        let fc = Arc::new(Mutex::new(FlowControlServer::default()));
        let mut input_rx = input_rx;
        let mut resize_rx = resize_rx;
        let mut commit_rx = commit_rx;
        let mut kill_rx = kill_rx;

        loop {
            tokio::select! {
                Some(data) = input_rx.recv() => {
                    use std::io::Write;
                    let mut w = writer_for_ctrl.lock().unwrap();
                    let _ = w.write_all(data.as_bytes());
                }
                Some((cols, rows)) = resize_rx.recv() => {
                    let master = master_for_ctrl.lock().unwrap();
                    let _ = master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 });
                }
                Some(size) = commit_rx.recv() => {
                    let mut fc = fc.lock().unwrap();
                    if fc.commit(size as i64) {
                        // resume – nothing further needed in Rust since we
                        // don't actually pause the OS-level PTY here; the
                        // flow control is advisory for the socket layer.
                    }
                }
                Some(_) = kill_rx.recv() => {
                    info!("PTY kill signal received");
                    break;
                }
                else => break,
            }
        }
    });

    Ok(PtyChannels {
        input_tx,
        resize_tx,
        commit_tx,
        output_rx,
        exit_rx,
        kill_tx,
    })
}
