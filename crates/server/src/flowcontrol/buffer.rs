//! Batching buffer for PTY output.
//!
//! Reduces WebSocket message count by buffering small PTY chunks and flushing
//! them as a single message after a short timeout or when a size threshold is
//! exceeded.

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::sleep;

const TINY_BUFFER_MAX: usize = 524_288; // 512 KiB
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
    #[must_use]
    pub fn new(sender: mpsc::Sender<String>) -> Self {
        Self {
            sender,
            state: Arc::new(Mutex::new(TinyBufferState {
                chunks: Vec::new(),
                length: 0,
            })),
        }
    }

    /// # Panics
    ///
    /// Panics if the internal mutex is poisoned.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn tiny_buffer_flushes_on_timeout() {
        let (tx, mut rx) = mpsc::channel(10);
        let buf = TinyBuffer::new(tx);
        buf.push("hello".into());
        let result = tokio::time::timeout(Duration::from_millis(50), rx.recv())
            .await
            .expect("timed out waiting for flush")
            .unwrap();
        assert_eq!(result, "hello");
    }

    #[tokio::test]
    async fn tiny_buffer_flushes_immediately_when_oversized() {
        let (tx, mut rx) = mpsc::channel(10);
        let buf = TinyBuffer::new(tx);
        let big = "x".repeat(TINY_BUFFER_MAX + 1);
        buf.push(big.clone());
        let result = tokio::time::timeout(Duration::from_millis(50), rx.recv())
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
