//! Security-header middleware – mirrors `src/server/socketServer/security.ts`.
//!
//! Implements an axum middleware function that injects:
//!
//! - A `Content-Security-Policy` header (using the request scheme to build the
//!   correct `ws://` / `wss://` `connect-src` directive).
//! - An `X-Frame-Options` header (`SAMEORIGIN` unless `allow_iframe` is set).
//! - `Referrer-Policy: no-referrer-when-downgrade`.
//! - Standard `X-Content-Type-Options: nosniff`.
//!
//! Implemented as a Tower [`Layer`] + [`Service`] that is compatible with
//! `axum::Router::layer()`.

use axum::{
    body::Body,
    http::{header, HeaderValue, Request, Response},
};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
use tower::{Layer, Service};

// ── Layer (for `.layer()` on Router) ─────────────────────────────────────────

/// Tower [`Layer`] that wraps a service with security-header injection.
#[derive(Clone)]
pub struct SecurityLayer {
    allow_iframe: bool,
}

impl SecurityLayer {
    #[must_use]
    pub fn new(allow_iframe: bool) -> Self {
        Self { allow_iframe }
    }
}

impl<S> Layer<S> for SecurityLayer {
    type Service = SecurityService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        SecurityService {
            inner,
            allow_iframe: self.allow_iframe,
        }
    }
}

// ── Service ───────────────────────────────────────────────────────────────────

/// Tower [`Service`] that adds security headers to every HTTP response.
#[derive(Clone)]
pub struct SecurityService<S> {
    inner: S,
    allow_iframe: bool,
}

impl<S, E> Service<Request<Body>> for SecurityService<S>
where
    S: Service<Request<Body>, Response = Response<Body>, Error = E> + Send + Clone + 'static,
    S::Future: Send + 'static,
    E: Send + 'static,
{
    type Response = Response<Body>;
    type Error = E;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        // Detect whether the original connection was TLS.
        let is_https = req
            .headers()
            .get("x-forwarded-proto")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|s| s == "https");
        let ws_scheme = if is_https { "wss://" } else { "ws://" };

        let host = req
            .headers()
            .get(header::HOST)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        let allow_iframe = self.allow_iframe;
        let fut = self.inner.call(req);

        Box::pin(async move {
            let mut response: Response<Body> = fut.await?;
            let headers = response.headers_mut();

            // Content-Security-Policy
            let connect_src = format!("{ws_scheme}{host}");
            let csp = format!(
                "default-src 'self'; \
                 script-src 'self' 'unsafe-inline' 'unsafe-eval'; \
                 script-src-attr 'unsafe-inline'; \
                 style-src 'self' 'unsafe-inline'; \
                 font-src 'self' data:; \
                 connect-src 'self' {connect_src}"
            );
            if let Ok(v) = HeaderValue::from_str(&csp) {
                headers.insert("content-security-policy", v);
            }

            // X-Frame-Options
            if !allow_iframe {
                headers.insert("x-frame-options", HeaderValue::from_static("SAMEORIGIN"));
            }

            // Referrer-Policy
            headers.insert(
                "referrer-policy",
                HeaderValue::from_static("no-referrer-when-downgrade"),
            );

            // X-Content-Type-Options
            headers.insert(
                "x-content-type-options",
                HeaderValue::from_static("nosniff"),
            );

            Ok(response)
        })
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, Response, StatusCode},
    };
    use std::convert::Infallible;
    use tower::ServiceExt; // for .oneshot()

    /// Construct a fresh `service_fn` inline so the compiler can see the
    /// concrete `ServiceFn<F>` type and verify `Send + 'static` bounds.
    macro_rules! ok_svc {
        ($allow_iframe:expr) => {{
            SecurityLayer::new($allow_iframe).layer(tower::service_fn(
                |_req: Request<Body>| async move {
                    Ok::<_, Infallible>(
                        Response::builder()
                            .status(StatusCode::OK)
                            .body(Body::empty())
                            .unwrap(),
                    )
                },
            ))
        }};
    }

    #[tokio::test]
    async fn sets_csp_header() {
        let svc = ok_svc!(false);
        let req = Request::builder()
            .uri("/")
            .header("host", "localhost:3000")
            .body(Body::empty())
            .unwrap();
        let resp = svc.oneshot(req).await.unwrap();
        let csp = resp
            .headers()
            .get("content-security-policy")
            .expect("CSP header should be present");
        assert!(
            csp.to_str().unwrap().contains("default-src 'self'"),
            "unexpected CSP: {}",
            csp.to_str().unwrap()
        );
    }

    #[tokio::test]
    async fn sets_x_frame_options_when_iframe_not_allowed() {
        let svc = ok_svc!(false);
        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let resp = svc.oneshot(req).await.unwrap();
        assert_eq!(
            resp.headers()
                .get("x-frame-options")
                .and_then(|v| v.to_str().ok()),
            Some("SAMEORIGIN")
        );
    }

    #[tokio::test]
    async fn omits_x_frame_options_when_iframe_allowed() {
        let svc = ok_svc!(true);
        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let resp = svc.oneshot(req).await.unwrap();
        assert!(
            resp.headers().get("x-frame-options").is_none(),
            "X-Frame-Options should be absent when allow_iframe=true"
        );
    }

    #[tokio::test]
    async fn sets_referrer_policy() {
        let svc = ok_svc!(false);
        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let resp = svc.oneshot(req).await.unwrap();
        assert_eq!(
            resp.headers()
                .get("referrer-policy")
                .and_then(|v| v.to_str().ok()),
            Some("no-referrer-when-downgrade")
        );
    }

    #[tokio::test]
    async fn csp_uses_wss_when_https() {
        let svc = ok_svc!(false);
        let req = Request::builder()
            .uri("/")
            .header("host", "example.com")
            .header("x-forwarded-proto", "https")
            .body(Body::empty())
            .unwrap();
        let resp = svc.oneshot(req).await.unwrap();
        let csp = resp
            .headers()
            .get("content-security-policy")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(csp.contains("wss://"), "expected wss:// in CSP, got: {csp}");
    }
}
