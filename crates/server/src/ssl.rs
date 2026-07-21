//! TLS configuration loader – mirrors `src/server/socketServer/ssl.ts`.
//!
//! Reads PEM-encoded certificate and key files from disk and builds a
//! `rustls::ServerConfig` suitable for use with `axum-server` TLS.

use rustls::ServerConfig;
use rustls_pemfile::{certs, private_key};
use std::fs;
use std::io::{self, BufReader};
use std::path::Path;
use thiserror::Error;

use crate::config::SslConfig;

/// Errors that can occur while loading TLS material.
#[derive(Debug, Error)]
pub enum SslError {
    #[error("I/O error reading {path}: {source}")]
    Io { path: String, source: io::Error },

    #[error("No certificates found in {0}")]
    NoCertificates(String),

    #[error("No private key found in {0}")]
    NoPrivateKey(String),

    #[error("TLS configuration error: {0}")]
    Tls(#[from] rustls::Error),
}

/// Load a [`ServerConfig`] from the given paths.
///
/// Returns `None` when `ssl` is `None` (plain HTTP mode).
///
/// # Errors
///
/// Returns `SslError` if certificate/key files cannot be read or are invalid.
pub fn load_ssl(ssl: Option<&SslConfig>) -> Result<Option<ServerConfig>, SslError> {
    let Some(ssl) = ssl else {
        return Ok(None);
    };

    let certs = load_certs(&ssl.cert)?;
    let key = load_private_key(&ssl.key)?;

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)?;

    Ok(Some(config))
}

fn load_certs(path: &str) -> Result<Vec<rustls::pki_types::CertificateDer<'static>>, SslError> {
    let file = fs::read(Path::new(path)).map_err(|e| SslError::Io {
        path: path.into(),
        source: e,
    })?;
    let mut reader = BufReader::new(file.as_slice());
    let cert_chain: Vec<_> =
        certs(&mut reader)
            .collect::<Result<_, _>>()
            .map_err(|e| SslError::Io {
                path: path.into(),
                source: e,
            })?;

    if cert_chain.is_empty() {
        return Err(SslError::NoCertificates(path.into()));
    }
    Ok(cert_chain)
}

fn load_private_key(path: &str) -> Result<rustls::pki_types::PrivateKeyDer<'static>, SslError> {
    let file = fs::read(Path::new(path)).map_err(|e| SslError::Io {
        path: path.into(),
        source: e,
    })?;
    let mut reader = BufReader::new(file.as_slice());
    private_key(&mut reader)
        .map_err(|e| SslError::Io {
            path: path.into(),
            source: e,
        })?
        .ok_or_else(|| SslError::NoPrivateKey(path.into()))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_ssl_none_returns_none() {
        assert!(load_ssl(None).unwrap().is_none());
    }

    #[test]
    fn load_ssl_missing_file_returns_io_error() {
        let ssl = SslConfig {
            cert: "/nonexistent/cert.pem".into(),
            key: "/nonexistent/key.pem".into(),
        };
        let result = load_ssl(Some(&ssl));
        assert!(matches!(result, Err(SslError::Io { .. })));
    }
}
