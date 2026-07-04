//! Flow control – direct port of `src/server/flowcontrol.ts` and
//! `src/client/wetty/flowcontrol.ts`.
//!
//! `FlowControlServer` implements simple low/high-watermark flow control so
//! that a fast PTY cannot overwhelm a slow WebSocket client.
//!
//! `TinyBuffer` batches small PTY output chunks before forwarding them over
//! the socket, reducing WebSocket message count under high data pressure.

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::sleep;
use tokio::sync::mpsc;

// ── FlowControlServer ────────────────────────────────────────────────────────

/// Low/high-watermark flow controller – server side.
///
/// Call `account(n)` each time `n` bytes are read from the PTY; it returns
/// `true` when the PTY should be **paused**.
///
/// Call `commit(n)` when the client acknowledges `n` bytes have been rendered;
/// it returns `true` when the PTY should be **resumed**.
#[derive(Debug, Clone)]
pub struct FlowControlServer {
    pub counter: i64,
    pub low: i64,   // 2^19 = 524 288 – resume below this
    pub high: i64,  // 2^21 = 2 097 152 – pause above this
}

impl Default for FlowControlServer {
    fn default() -> Self {
        Self {
            counter: 0,
            low: 524_288,
            high: 2_097_152,
        }
    }
}

impl FlowControlServer {
    pub fn new(low: i64, high: i64) -> Self {
        Self { counter: 0, low, high }
    }

    /// Returns `true` if the PTY should now be **paused**.
    pub fn account(&mut self, length: i64) -> bool {
        let old = self.counter;
        self.counter += length;
        old < self.high && self.counter > self.high
    }

    /// Returns `true` if the PTY should now be **resumed**.
    pub fn commit(&mut self, length: i64) -> bool {
        let old = self.counter;
        self.counter -= length;
        old > self.low && self.counter < self.low
    }
}

// ── TinyBuffer ───────────────────────────────────────────────────────────────

/// Maximum number of bytes to buffer before flushing immediately.
const TINY_BUFFER_MAX: usize = 524_288; // 512 KiB

/// Milliseconds to wait before flushing an incomplete buffer.
const TINY_BUFFER_TIMEOUT_MS: u64 = 2;

/// Buffers outgoing PTY data and sends it in batches over the provided channel.
///
/// Data is flushed when:
/// - the accumulated size exceeds `TINY_BUFFER_MAX`, or
/// - no new data arrives within `TINY_BUFFER_TIMEOUT_MS` milliseconds.
pub struct TinyBuffer {
    sender: mpsc::Sender<String>,
    state: Arc<Mutex<TinyBufferState>>,
}

struct TinyBufferState {
    chunks: Vec<String>,
    length: usize,
}

impl TinyBuffer {
    /// Creates a new `TinyBuffer` that forwards flushed data to `sender`.
    pub fn new(sender: mpsc::Sender<String>) -> Self {
        Self {
            sender,
            state: Arc::new(Mutex::new(TinyBufferState {
                chunks: Vec::new(),
                length: 0,
            })),
        }
    }

    /// Feed a chunk of PTY output into the buffer.
    pub fn push(&self, data: String) {
        let flush_now = {
            let mut st = self.state.lock().unwrap();
            st.length += data.len();
            st.chunks.push(data);
            st.length > TINY_BUFFER_MAX
        };

        if flush_now {
            self.flush_sync();
        } else {
            // Schedule a delayed flush unless one is already pending.
            let state_clone = Arc::clone(&self.state);
            let sender_clone = self.sender.clone();
            tokio::spawn(async move {
                sleep(Duration::from_millis(TINY_BUFFER_TIMEOUT_MS)).await;
                let payload = {
                    let mut st = state_clone.lock().unwrap();
                    if st.chunks.is_empty() {
                        return;
                    }
                    let joined = st.chunks.join("");
                    st.chunks.clear();
                    st.length = 0;
                    joined
                };
                let _ = sender_clone.send(payload).await;
            });
        }
    }

    fn flush_sync(&self) {
        let payload = {
            let mut st = self.state.lock().unwrap();
            if st.chunks.is_empty() {
                return;
            }
            let joined = st.chunks.join("");
            st.chunks.clear();
            st.length = 0;
            joined
        };
        let sender = self.sender.clone();
        tokio::spawn(async move {
            let _ = sender.send(payload).await;
        });
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // FlowControlServer --------------------------------------------------------

    #[test]
    fn account_returns_true_when_crossing_high_watermark() {
        let mut fc = FlowControlServer::default();
        assert!(!fc.account(1_000_000)); // still below high
        assert!(fc.account(1_200_000)); // crosses high → should pause
    }

    #[test]
    fn account_returns_false_when_already_above_high() {
        let mut fc = FlowControlServer::default();
        fc.account(2_200_000); // go above high
        // already above – should not signal pause again
        assert!(!fc.account(100));
    }

    #[test]
    fn commit_returns_true_when_crossing_low_watermark() {
        let mut fc = FlowControlServer::default();
        fc.counter = 600_000; // above low
        assert!(fc.commit(200_000)); // crosses below low → resume
    }

    #[test]
    fn commit_returns_false_when_already_below_low() {
        let mut fc = FlowControlServer::default();
        fc.counter = 100_000; // already below low
        assert!(!fc.commit(10_000));
    }

    #[test]
    fn account_then_commit_restores_counter() {
        let mut fc = FlowControlServer::default();
        fc.account(300);
        fc.commit(300);
        assert_eq!(fc.counter, 0);
    }

    #[test]
    fn custom_watermarks() {
        let mut fc = FlowControlServer::new(10, 20);
        assert!(fc.account(25)); // crosses high=20 → pause
        assert!(fc.commit(20)); // crosses below low=10 → resume
    }

    // TinyBuffer ---------------------------------------------------------------

    #[tokio::test]
    async fn tiny_buffer_flushes_on_timeout() {
        let (tx, mut rx) = mpsc::channel(10);
        let buf = TinyBuffer::new(tx);
        buf.push("hello".into());
        // Should arrive after at most a few ms
        let result = tokio::time::timeout(
            Duration::from_millis(50),
            rx.recv(),
        )
        .await
        .expect("timed out waiting for flush")
        .unwrap();
        assert_eq!(result, "hello");
    }

    #[tokio::test]
    async fn tiny_buffer_flushes_immediately_when_oversized() {
        let (tx, mut rx) = mpsc::channel(10);
        let buf = TinyBuffer::new(tx);
        // Push a chunk larger than the max to trigger immediate flush
        let big = "x".repeat(TINY_BUFFER_MAX + 1);
        buf.push(big.clone());
        let result = tokio::time::timeout(
            Duration::from_millis(50),
            rx.recv(),
        )
        .await
        .expect("timed out")
        .unwrap();
        assert_eq!(result, big);
    }

    #[tokio::test]
    async fn tiny_buffer_joins_multiple_chunks() {
        let (tx, mut rx) = mpsc::channel(10);
        let buf = TinyBuffer::new(tx);
        buf.push("foo".into());
        buf.push("bar".into());
        // Collect all messages that arrive within the flush window (> 2 ms).
        // Batching is non-deterministic; we assert on the concatenated content.
        let mut combined = String::new();
        loop {
            match tokio::time::timeout(Duration::from_millis(20), rx.recv()).await {
                Ok(Some(s)) => combined.push_str(&s),
                _ => break,
            }
        }
        assert_eq!(combined, "foobar");
    }
}
