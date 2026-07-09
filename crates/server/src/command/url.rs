//! URL query-string argument parsing.
//!
//! Parses the `Referer` header URL to extract allowed SSH connection parameters
//! from query strings.

use std::collections::HashMap;
use url::Url;

/// Parse the `Referer` header URL, extracting only allowed query-string keys.
/// Mirrors `src/server/command.ts :: urlArgs`.
#[must_use]
pub fn url_args(
    referer: Option<&str>,
    allow_remote_hosts: bool,
    allow_remote_command: bool,
) -> HashMap<String, String> {
    let mut allowed: Vec<&str> = vec!["pass"];
    if allow_remote_command {
        allowed.extend(["command", "path"]);
    }
    if allow_remote_hosts {
        allowed.extend(["port", "host"]);
    }

    let referer_str = referer.unwrap_or("");
    // Parse as absolute URL; fall back to treating it as a path on localhost.
    let parsed =
        Url::parse(referer_str).or_else(|_| Url::parse(&format!("http://localhost{referer_str}")));

    match parsed {
        Ok(url) => url
            .query_pairs()
            .filter(|(k, _)| allowed.contains(&k.as_ref()))
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect(),
        Err(_) => HashMap::new(),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_args_allows_pass_always() {
        let result = url_args(Some("http://localhost/wetty?pass=s3cr3t"), false, false);
        assert_eq!(result.get("pass").map(|s| s.as_str()), Some("s3cr3t"));
    }

    #[test]
    fn url_args_blocks_host_when_not_allowed() {
        let result = url_args(
            Some("http://localhost/wetty?host=evil.com"),
            false, // allow_remote_hosts = false
            false,
        );
        assert!(result.get("host").is_none());
    }

    #[test]
    fn url_args_allows_host_when_enabled() {
        let result = url_args(
            Some("http://localhost/wetty?host=allowed.com"),
            true, // allow_remote_hosts = true
            false,
        );
        assert_eq!(result.get("host").map(|s| s.as_str()), Some("allowed.com"));
    }

    #[test]
    fn url_args_allows_command_when_enabled() {
        let result = url_args(
            Some("http://localhost/wetty?command=htop"),
            false,
            true, // allow_remote_command = true
        );
        assert_eq!(result.get("command").map(|s| s.as_str()), Some("htop"));
    }

    #[test]
    fn url_args_blocks_command_when_disabled() {
        let result = url_args(Some("http://localhost/wetty?command=htop"), false, false);
        assert!(result.get("command").is_none());
    }

    #[test]
    fn url_args_returns_empty_for_none_referer() {
        let result = url_args(None, true, true);
        assert!(result.is_empty());
    }
}
