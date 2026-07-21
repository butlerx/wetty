//! Flow control – direct port of `src/server/flowcontrol.ts` and
//! `src/client/wetty/flowcontrol.ts`.
//!
//! `FlowControlServer` implements simple low/high-watermark flow control so
//! that a fast PTY cannot overwhelm a slow WebSocket client.
//!
//! `TinyBuffer` batches small PTY output chunks before forwarding them over
//! the socket, reducing WebSocket message count under high data pressure.

mod buffer;
mod server;

pub use buffer::TinyBuffer;
pub use server::FlowControlServer;
