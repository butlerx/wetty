//! Integration tests – full axum app.
//!
//! Spins up the router on a random port and validates HTTP behaviour.

use reqwest::redirect::Policy;
use std::path::PathBuf;
use wetty_server::app::{build_router, trim_base};
use wetty_server::config::{ServerConfig, SshConfig};

fn test_build_dir() -> PathBuf {
    // Tests run from the workspace root; the compiled browser assets live in
    // `build/` but may not exist during a pure Rust test run.  We create a
    // minimal fixture directory so ServeDir does not error.
    let dir = std::env::temp_dir().join("wetty_test_build");
    let client = dir.join("client");
    std::fs::create_dir_all(&client).ok();
    std::fs::write(dir.join("sw.js"), "// service worker").ok();
    dir
}

fn default_server_conf(port: u16) -> ServerConfig {
    ServerConfig {
        port,
        host: "127.0.0.1".into(),
        socket: String::new(),
        base: "/wetty".into(),
        title: "Test WeTTY".into(),
        allow_iframe: false,
    }
}

/// Bind the router on a random OS-assigned port and return the base URL.
async fn spawn_test_server(port: u16) -> String {
    let server_conf = default_server_conf(port);
    let ssh = SshConfig::default();
    let (router, _io) = build_router(
        &server_conf,
        ssh,
        "echo hello".into(),
        false,
        test_build_dir(),
    );

    let addr = format!("127.0.0.1:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    let actual_port = listener.local_addr().unwrap().port();

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    format!("http://127.0.0.1:{actual_port}")
}

#[tokio::test]
async fn index_route_returns_200() {
    let base_url = spawn_test_server(0).await;
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{base_url}/wetty"))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200, "GET /wetty should return 200");
}

#[tokio::test]
async fn index_returns_html() {
    let base_url = spawn_test_server(0).await;
    let body = reqwest::get(format!("{base_url}/wetty"))
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
    assert!(body.contains("<!doctype html>"), "response should be HTML");
    assert!(body.contains("WeTTY"), "response should contain 'WeTTY'");
}

#[tokio::test]
async fn ssh_user_route_returns_200() {
    let base_url = spawn_test_server(0).await;
    let resp = reqwest::get(format!("{base_url}/wetty/ssh/testuser"))
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
}

#[tokio::test]
async fn metrics_route_returns_200_with_content_type() {
    let base_url = spawn_test_server(0).await;
    let resp = reqwest::get(format!("{base_url}/wetty/metrics"))
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
    let ct = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        ct.contains("text/plain"),
        "metrics content-type should be text/plain, got: {ct}"
    );
}

#[tokio::test]
async fn security_headers_are_present() {
    let base_url = spawn_test_server(0).await;
    let resp = reqwest::get(format!("{base_url}/wetty")).await.unwrap();
    let headers = resp.headers();

    assert!(
        headers.contains_key("content-security-policy"),
        "CSP header missing"
    );
    assert!(
        headers.contains_key("x-frame-options"),
        "X-Frame-Options header missing"
    );
    assert!(
        headers.contains_key("referrer-policy"),
        "Referrer-Policy header missing"
    );
}

#[tokio::test]
async fn trailing_slash_is_redirected() {
    let base_url = spawn_test_server(0).await;
    let client = reqwest::Client::builder()
        .redirect(Policy::none())
        .build()
        .unwrap();
    let resp = client
        .get(format!("{base_url}/wetty/"))
        .send()
        .await
        .unwrap();
    // 308 Permanent Redirect (axum's redirect_trailing_slash uses 308,
    // which is the modern equivalent of 301 but preserves the HTTP method).
    assert!(
        resp.status() == 308 || resp.status() == 301,
        "trailing slash should redirect, got {}",
        resp.status()
    );
    let loc = resp
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        loc.ends_with("/wetty"),
        "redirect target should strip trailing slash"
    );
}

#[tokio::test]
async fn sw_js_returns_200() {
    let base_url = spawn_test_server(0).await;
    let resp = reqwest::get(format!("{base_url}/wetty/sw.js"))
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
}

// ── trim_base unit tests ──────────────────────────────────────────────────────

#[test]
fn trim_base_strips_trailing_slash() {
    assert_eq!(trim_base("/wetty/"), "/wetty");
}

#[test]
fn trim_base_root_stays_slash() {
    assert_eq!(trim_base("/"), "/");
}

#[test]
fn trim_base_empty_becomes_slash() {
    assert_eq!(trim_base(""), "/");
}
