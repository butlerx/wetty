//! SSH / local-login command builder – port of `src/server/command/`.
//!
//! `get_command` is the main entry point; it mirrors the TypeScript function of
//! the same name and returns the `Vec<String>` of arguments to pass to
//! `spawn()`.

use std::collections::HashMap;
use url::Url;

use crate::config::SshConfig;

// ── Shell escaping ────────────────────────────────────────────────────────────

/// Remove characters that are unsafe to pass as a shell username / host.
/// Mirrors `src/server/shared/shell.ts :: escapeShell`.
pub fn escape_shell(username: &str) -> String {
    let stripped: String = username
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '\\' | '-' | '.' | '@'))
        .collect();
    // Drop any leading dashes (they would be interpreted as flags by ssh).
    stripped.trim_start_matches('-').to_string()
}

// ── Local login (no SSH) ──────────────────────────────────────────────────────

/// Build args for a local login session (running as root on localhost).
/// Mirrors `src/server/command/login.ts :: loginOptions`.
pub fn login_options(command: &str, remote_address: &str) -> Vec<String> {
    if command == "login" {
        // Remote address may arrive as an IPv6-mapped IPv4 address in the form
        // "::ffff:127.0.0.1".  Split on ':' gives ["", "", "ffff", "127.0.0.1"]
        // so index 3 is the plain IPv4 part; fall back to "localhost" otherwise.
        let parts: Vec<&str> = remote_address.split(':').collect();
        let addr = if parts.len() > 3 { parts[3] } else { "localhost" };
        vec!["login".into(), "-h".into(), addr.into()]
    } else {
        vec![command.into()]
    }
}

// ── SSH options ───────────────────────────────────────────────────────────────

/// Build the `ssh` (or `sshpass` + `ssh`) argument list.
/// Mirrors `src/server/command/ssh.ts :: sshOptions`.
pub fn ssh_options(args: &HashMap<String, String>, key: Option<&str>) -> Vec<String> {
    let empty = String::new();
    let pass = args.get("pass").unwrap_or(&empty);
    let path = args.get("path");
    let command = args.get("command").map(|s| s.as_str()).unwrap_or("login");
    let host = args.get("host").unwrap_or(&empty);
    let port = args.get("port").unwrap_or(&empty);
    let auth = args.get("auth").unwrap_or(&empty);
    let known_hosts = args.get("known_hosts").map(|s| s.as_str()).unwrap_or("/dev/null");
    let config = args.get("config").unwrap_or(&empty);

    let cmd = parse_command(command, path.map(|s| s.as_str()));
    let host_checking = if known_hosts == "/dev/null" { "no" } else { "yes" };

    let mut result: Vec<String> = Vec::new();

    if !pass.is_empty() {
        result.extend(["sshpass".into(), "-p".into(), pass.clone()]);
    }

    result.extend(["ssh".into(), "-t".into()]);

    if !config.is_empty() {
        result.extend(["-F".into(), config.clone()]);
    }
    if !port.is_empty() {
        result.extend(["-p".into(), port.clone()]);
    }
    if let Some(k) = key {
        if !k.is_empty() {
            result.extend(["-i".into(), k.into()]);
        }
    }
    if auth != "none" {
        result.extend(["-o".into(), format!("PreferredAuthentications={auth}")]);
    }
    result.extend([
        "-o".into(),
        format!("UserKnownHostsFile={known_hosts}"),
        "-o".into(),
        format!("StrictHostKeyChecking={host_checking}"),
        "-o".into(),
        "EscapeChar=none".into(),
        "--".into(),
        host.clone(),
    ]);

    if !cmd.is_empty() {
        result.push(cmd);
    }

    result
}

fn parse_command(command: &str, path: Option<&str>) -> String {
    match (command, path) {
        ("login", None) => String::new(),
        (cmd, None) => cmd.into(),
        (cmd, Some(p)) => {
            let inner: String = if cmd == "login" {
                String::from("$SHELL")
            } else {
                String::from(cmd)
            };
            format!("$SHELL -c \"cd {p};{inner}\"")
        }
    }
}

// ── URL query-string args ─────────────────────────────────────────────────────

/// Parse the `Referer` header URL, extracting only allowed query-string keys.
/// Mirrors `src/server/command.ts :: urlArgs`.
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
    let parsed = Url::parse(referer_str)
        .or_else(|_| Url::parse(&format!("http://localhost{referer_str}")));

    match parsed {
        Ok(url) => url
            .query_pairs()
            .filter(|(k, _)| allowed.contains(&k.as_ref()))
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect(),
        Err(_) => HashMap::new(),
    }
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Information extracted from the socket handshake that `get_command` needs.
pub struct SocketInfo {
    /// Value of the `Referer` HTTP header on the socket upgrade request.
    pub referer: Option<String>,
    /// Remote IP address, e.g. `"::ffff:127.0.0.1"`.
    pub remote_address: String,
    /// Username extracted from the URL path `/ssh/<user>`, if any.
    pub path_user: Option<String>,
    /// Value of the `Remote-User` HTTP header, if any.
    pub header_user: Option<String>,
}

/// Whether the given host is a loopback interface (and we are root).
fn is_localhost(host: &str) -> bool {
    // Only treat as localhost when running as root (uid 0).
    #[cfg(unix)]
    let is_root = unsafe { libc::getuid() } == 0;
    #[cfg(not(unix))]
    let is_root = false;

    is_root && matches!(host, "localhost" | "0.0.0.0" | "127.0.0.1")
}

/// Build the command argument list for the session.
/// Mirrors `src/server/command.ts :: getCommand`.
pub fn get_command(
    info: &SocketInfo,
    ssh: &SshConfig,
    command: &str,
    forcessh: bool,
) -> Vec<String> {
    if !forcessh && is_localhost(&ssh.host) {
        return login_options(command, &info.remote_address);
    }

    // Determine SSH destination user
    let username: String = if let Some(u) = &info.header_user {
        u.clone()
    } else if let Some(u) = &info.path_user {
        u.clone()
    } else if !ssh.user.is_empty() {
        ssh.user.clone()
    } else {
        // No username available – prompt via the login PTY at connection time.
        // The caller (socket.rs) is responsible for the interactive prompt flow.
        String::new()
    };

    let ssh_host = format!("{}@{}", escape_shell(&username), ssh.host);

    let url_params = url_args(
        info.referer.as_deref(),
        ssh.allow_remote_hosts,
        ssh.allow_remote_command,
    );

    let mut args: HashMap<String, String> = HashMap::new();
    args.insert("host".into(), ssh_host);
    args.insert("port".into(), ssh.port.to_string());
    args.insert("pass".into(), ssh.pass.clone().unwrap_or_default());
    args.insert("command".into(), command.into());
    args.insert("auth".into(), ssh.auth.clone());
    args.insert("known_hosts".into(), ssh.known_hosts.clone());
    args.insert("config".into(), ssh.config.clone().unwrap_or_default());
    // URL params can override pass, command, path, port, host
    args.extend(url_params);

    ssh_options(&args, ssh.key.as_deref())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // escape_shell -------------------------------------------------------------

    #[test]
    fn escape_shell_removes_subcommand_backticks() {
        assert_eq!(escape_shell("test`echo hello`"), "testechohello");
    }

    #[test]
    fn escape_shell_allows_special_chars() {
        assert_eq!(
            escape_shell("bob.jones\\COM@ultra-machine_dir"),
            "bob.jones\\COM@ultra-machine_dir"
        );
    }

    #[test]
    fn escape_shell_strips_leading_dashes() {
        let out = escape_shell("-oProxyCommand='bash'");
        assert!(!out.starts_with('-'), "should not start with dash: {out}");
    }

    // login_options ------------------------------------------------------------

    #[test]
    fn login_options_for_login_command() {
        let args = login_options("login", "::ffff:127.0.0.1");
        assert_eq!(args, vec!["login", "-h", "127.0.0.1"]);
    }

    #[test]
    fn login_options_for_custom_command() {
        let args = login_options("bash", "::ffff:127.0.0.1");
        assert_eq!(args, vec!["bash"]);
    }

    #[test]
    fn login_options_plain_address_fallback() {
        let args = login_options("login", "127.0.0.1");
        // fewer than 4 colon-parts → fallback to "localhost"
        assert_eq!(args, vec!["login", "-h", "localhost"]);
    }

    // ssh_options --------------------------------------------------------------

    fn base_ssh_args() -> HashMap<String, String> {
        let mut m = HashMap::new();
        m.insert("host".into(), "user@example.com".into());
        m.insert("port".into(), "22".into());
        m.insert("auth".into(), "password".into());
        m.insert("known_hosts".into(), "/dev/null".into());
        m.insert("config".into(), String::new());
        m.insert("pass".into(), String::new());
        m.insert("command".into(), "login".into());
        m
    }

    #[test]
    fn ssh_options_basic() {
        let args = ssh_options(&base_ssh_args(), None);
        assert!(args.contains(&"ssh".into()));
        assert!(args.contains(&"user@example.com".into()));
        assert!(args.contains(&"StrictHostKeyChecking=no".into()));
    }

    #[test]
    fn ssh_options_with_password() {
        let mut m = base_ssh_args();
        m.insert("pass".into(), "secret".into());
        let args = ssh_options(&m, None);
        assert_eq!(args[0], "sshpass");
        assert_eq!(args[1], "-p");
        assert_eq!(args[2], "secret");
    }

    #[test]
    fn ssh_options_with_key() {
        let args = ssh_options(&base_ssh_args(), Some("/home/user/.ssh/id_rsa"));
        assert!(args.contains(&"-i".into()));
        let idx = args.iter().position(|a| a == "-i").unwrap();
        assert_eq!(args[idx + 1], "/home/user/.ssh/id_rsa");
    }

    #[test]
    fn ssh_options_known_hosts_strict_when_not_dev_null() {
        let mut m = base_ssh_args();
        m.insert("known_hosts".into(), "/etc/ssh/known_hosts".into());
        let args = ssh_options(&m, None);
        assert!(args.contains(&"StrictHostKeyChecking=yes".into()));
    }

    // url_args -----------------------------------------------------------------

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
            true,  // allow_remote_hosts = true
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
        let result = url_args(
            Some("http://localhost/wetty?command=htop"),
            false,
            false,
        );
        assert!(result.get("command").is_none());
    }

    #[test]
    fn url_args_returns_empty_for_none_referer() {
        let result = url_args(None, true, true);
        assert!(result.is_empty());
    }

    // parse_command ------------------------------------------------------------

    #[test]
    fn parse_command_login_no_path_returns_empty() {
        assert_eq!(parse_command("login", None), "");
    }

    #[test]
    fn parse_command_custom_no_path() {
        assert_eq!(parse_command("htop", None), "htop");
    }

    #[test]
    fn parse_command_login_with_path() {
        let out = parse_command("login", Some("/home/user"));
        assert!(out.contains("cd /home/user"));
        assert!(out.contains("$SHELL"));
    }

    #[test]
    fn parse_command_custom_with_path() {
        let out = parse_command("htop", Some("/tmp"));
        assert!(out.contains("cd /tmp"));
        assert!(out.contains("htop"));
    }
}
