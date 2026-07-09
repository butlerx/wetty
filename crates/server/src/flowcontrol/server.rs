//! Low/high-watermark flow controller – server side.

/// Low/high-watermark flow controller.
///
/// Call `account(n)` each time `n` bytes are read from the PTY; it returns
/// `true` when the PTY should be **paused**.
///
/// Call `commit(n)` when the client acknowledges `n` bytes have been rendered;
/// it returns `true` when the PTY should be **resumed**.
#[derive(Debug, Clone)]
pub struct FlowControlServer {
    pub counter: i64,
    pub low: i64,
    pub high: i64,
}

impl Default for FlowControlServer {
    fn default() -> Self {
        Self {
            counter: 0,
            low: 524_288,   // 2^19
            high: 2_097_152, // 2^21
        }
    }
}

impl FlowControlServer {
    #[must_use]
    pub fn new(low: i64, high: i64) -> Self {
        Self {
            counter: 0,
            low,
            high,
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_returns_true_when_crossing_high_watermark() {
        let mut fc = FlowControlServer::default();
        assert!(!fc.account(1_000_000));
        assert!(fc.account(1_200_000));
    }

    #[test]
    fn account_returns_false_when_already_above_high() {
        let mut fc = FlowControlServer::default();
        fc.account(2_200_000);
        assert!(!fc.account(100));
    }

    #[test]
    fn commit_returns_true_when_crossing_low_watermark() {
        let mut fc = FlowControlServer::default();
        fc.counter = 600_000;
        assert!(fc.commit(200_000));
    }

    #[test]
    fn commit_returns_false_when_already_below_low() {
        let mut fc = FlowControlServer::default();
        fc.counter = 100_000;
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
        assert!(fc.account(25));
        assert!(fc.commit(20));
    }
}
