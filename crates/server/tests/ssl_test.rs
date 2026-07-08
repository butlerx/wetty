//! Integration tests – TLS configuration loading.

use wetty_server::config::SslConfig;
use wetty_server::ssl::load_ssl;

#[test]
fn plain_http_when_ssl_is_none() {
    let result = load_ssl(None).expect("load_ssl(None) should not fail");
    assert!(result.is_none(), "should return None for plain HTTP");
}

#[test]
fn error_when_cert_file_missing() {
    let ssl = SslConfig {
        cert: "/no/such/cert.pem".into(),
        key: "/no/such/key.pem".into(),
    };
    let result = load_ssl(Some(&ssl));
    assert!(result.is_err(), "missing cert file should produce an error");
}

/// Generate a self-signed cert/key pair using `rcgen` and verify that
/// `load_ssl` accepts them.
#[test]
fn accepts_valid_self_signed_cert() {
    use rcgen::generate_simple_self_signed;
    use std::io::Write;

    // rustls requires a process-level CryptoProvider; install one if not set.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let subject_alt_names = vec!["localhost".into()];
    let cert = generate_simple_self_signed(subject_alt_names).expect("generate cert");

    let cert_pem = cert.cert.pem();
    let key_pem = cert.key_pair.serialize_pem();

    let dir = tempfile_path("wetty_ssl_test");
    std::fs::create_dir_all(&dir).unwrap();
    let cert_path = dir.join("cert.pem");
    let key_path = dir.join("key.pem");

    let mut f = std::fs::File::create(&cert_path).unwrap();
    f.write_all(cert_pem.as_bytes()).unwrap();

    let mut f = std::fs::File::create(&key_path).unwrap();
    f.write_all(key_pem.as_bytes()).unwrap();

    let ssl = SslConfig {
        cert: cert_path.to_string_lossy().into(),
        key: key_path.to_string_lossy().into(),
    };
    let result = load_ssl(Some(&ssl)).expect("load_ssl should succeed");
    assert!(result.is_some(), "should return a ServerConfig");
}

fn tempfile_path(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(name)
}
