//! Configuration structs that mirror the TypeScript `interfaces.ts`.
//!
//! Each struct derives `napi(object)` (when the `node-binding` feature is
//! enabled) so that Node.js callers can pass plain JavaScript objects.
//! `Default` values replicate `src/shared/defaults.ts`.

use serde::{Deserialize, Serialize};

/// SSH connection options – mirrors the `SSH` TypeScript interface.
#[cfg_attr(feature = "node-binding", napi_derive::napi(object))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub user: String,
    pub host: String,
    /// Authentication method(s), e.g. `"password"` or `"publickey,password"`.
    pub auth: String,
    pub port: u16,
    pub known_hosts: String,
    pub allow_remote_hosts: bool,
    pub allow_remote_command: bool,
    pub pass: Option<String>,
    pub key: Option<String>,
    pub config: Option<String>,
}

impl Default for SshConfig {
    fn default() -> Self {
        Self {
            user: std::env::var("SSHUSER").unwrap_or_default(),
            host: std::env::var("SSHHOST").unwrap_or_else(|_| "localhost".into()),
            auth: std::env::var("SSHAUTH").unwrap_or_else(|_| "password".into()),
            port: std::env::var("SSHPORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(22),
            known_hosts: std::env::var("KNOWNHOSTS").unwrap_or_else(|_| "/dev/null".into()),
            allow_remote_hosts: false,
            allow_remote_command: false,
            pass: std::env::var("SSHPASS").ok(),
            key: std::env::var("SSHKEY").ok(),
            config: std::env::var("SSHCONFIG").ok(),
        }
    }
}

/// HTTP server options – mirrors the `Server` TypeScript interface.
#[cfg_attr(feature = "node-binding", napi_derive::napi(object))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    /// UNIX socket path; empty string means "use TCP".
    pub socket: String,
    pub title: String,
    /// Base URL path, e.g. `"/"` or `"/wetty"`.
    pub base: String,
    pub allow_iframe: bool,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            base: std::env::var("BASE").unwrap_or_else(|_| "/".into()),
            port: std::env::var("PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3000),
            host: "0.0.0.0".into(),
            socket: String::new(),
            title: std::env::var("TITLE")
                .unwrap_or_else(|_| "WeTTY - The Web Terminal Emulator".into()),
            allow_iframe: std::env::var("ALLOWIFRAME").as_deref() == Ok("true"),
        }
    }
}

/// TLS certificate paths – mirrors the `SSL` TypeScript interface.
#[cfg_attr(feature = "node-binding", napi_derive::napi(object))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SslConfig {
    pub key: String,
    pub cert: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ssh_default_port_is_22() {
        let c = SshConfig::default();
        assert_eq!(c.port, 22);
    }

    #[test]
    fn ssh_default_auth_is_password() {
        let c = SshConfig::default();
        assert_eq!(c.auth, "password");
    }

    #[test]
    fn ssh_default_known_hosts_is_dev_null() {
        let c = SshConfig::default();
        assert_eq!(c.known_hosts, "/dev/null");
    }

    #[test]
    fn server_default_port_is_3000() {
        let c = ServerConfig::default();
        assert_eq!(c.port, 3000);
    }

    #[test]
    fn server_default_host_is_any() {
        let c = ServerConfig::default();
        assert_eq!(c.host, "0.0.0.0");
    }

    #[test]
    fn server_default_allow_iframe_is_false() {
        let c = ServerConfig::default();
        assert!(!c.allow_iframe);
    }

    #[test]
    fn serde_roundtrip_ssh() {
        let original = SshConfig::default();
        let json = serde_json::to_string(&original).expect("serialize");
        let restored: SshConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(original.port, restored.port);
        assert_eq!(original.auth, restored.auth);
    }

    #[test]
    fn serde_roundtrip_server() {
        let original = ServerConfig::default();
        let json = serde_json::to_string(&original).expect("serialize");
        let restored: ServerConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(original.port, restored.port);
        assert_eq!(original.host, restored.host);
    }
}
