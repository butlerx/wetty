//! Prometheus metrics – mirrors `src/server/metrics.ts` and
//! `src/server/socketServer/metrics.ts`.
//!
//! Registers the `wetty_connections` gauge and default process metrics, then
//! exposes them via an axum handler at `{base}/metrics`.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use once_cell::sync::Lazy;
use prometheus::{
    Counter, Histogram, HistogramOpts, IntGauge, Opts, Registry, TextEncoder,
    Encoder,
};

// ── Registry ──────────────────────────────────────────────────────────────────

/// Module-level Prometheus registry (shared singleton).
pub static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

// ── Gauges / counters ─────────────────────────────────────────────────────────

/// Number of active Socket.IO connections.
pub static WETTY_CONNECTIONS: Lazy<IntGauge> = Lazy::new(|| {
    let gauge = IntGauge::with_opts(
        Opts::new("wetty_connections", "number of active socket connections to wetty")
    )
    .expect("create wetty_connections gauge");
    REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("register wetty_connections");
    gauge
});

/// Total HTTP requests received.
pub static HTTP_REQUESTS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let c = Counter::with_opts(
        Opts::new("http_requests_total", "Counter for total requests received")
    )
    .expect("create http_requests_total");
    REGISTRY
        .register(Box::new(c.clone()))
        .expect("register http_requests_total");
    c
});

/// HTTP request duration histogram (seconds).
pub static HTTP_REQUEST_DURATION: Lazy<Histogram> = Lazy::new(|| {
    let h = Histogram::with_opts(
        HistogramOpts::new(
            "http_request_duration_seconds",
            "Duration of HTTP requests in seconds",
        )
        .buckets(vec![0.01, 0.1, 0.5, 1.0, 1.5]),
    )
    .expect("create histogram");
    REGISTRY
        .register(Box::new(h.clone()))
        .expect("register histogram");
    h
});

/// Response size histogram (bytes).
pub static HTTP_RESPONSE_LENGTH: Lazy<Histogram> = Lazy::new(|| {
    let h = Histogram::with_opts(
        HistogramOpts::new(
            "http_response_length_bytes",
            "Content-Length of HTTP response",
        )
        .buckets(vec![512.0, 1024.0, 5120.0, 10240.0, 51200.0, 102400.0]),
    )
    .expect("create response length histogram");
    REGISTRY
        .register(Box::new(h.clone()))
        .expect("register response length histogram");
    h
});

/// Ensure all lazy statics are initialised.
/// Call once at startup from `app.rs`.
pub fn init() {
    Lazy::force(&WETTY_CONNECTIONS);
    Lazy::force(&HTTP_REQUESTS_TOTAL);
    Lazy::force(&HTTP_REQUEST_DURATION);
    Lazy::force(&HTTP_RESPONSE_LENGTH);
}

// ── Axum handler ─────────────────────────────────────────────────────────────

/// Axum handler that serialises all registered metrics in Prometheus text
/// format and returns them as a response.
pub async fn metrics_handler() -> Response {
    let encoder = TextEncoder::new();
    match encoder.encode_to_string(&REGISTRY.gather()) {
        Ok(body) => (
            StatusCode::OK,
            [(
                axum::http::header::CONTENT_TYPE,
                encoder.format_type(),
            )],
            body,
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to encode metrics: {e}"),
        )
            .into_response(),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wetty_connections_increments_and_decrements() {
        init();
        let before = WETTY_CONNECTIONS.get();
        WETTY_CONNECTIONS.inc();
        assert_eq!(WETTY_CONNECTIONS.get(), before + 1);
        WETTY_CONNECTIONS.dec();
        assert_eq!(WETTY_CONNECTIONS.get(), before);
    }

    #[test]
    fn http_requests_counter_increments() {
        init();
        let before = HTTP_REQUESTS_TOTAL.get();
        HTTP_REQUESTS_TOTAL.inc();
        assert!((HTTP_REQUESTS_TOTAL.get() - before - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn registry_gather_contains_wetty_connections() {
        init();
        let families = REGISTRY.gather();
        let names: Vec<_> = families.iter().map(|f| f.get_name()).collect();
        assert!(
            names.contains(&"wetty_connections"),
            "expected wetty_connections in registry, got: {names:?}"
        );
    }

    #[tokio::test]
    async fn metrics_handler_returns_200_with_content_type() {
        init();
        let response = metrics_handler().await;
        assert_eq!(response.status(), StatusCode::OK);
        let ct = response.headers().get(axum::http::header::CONTENT_TYPE);
        assert!(ct.is_some(), "Content-Type header should be set");
    }
}
