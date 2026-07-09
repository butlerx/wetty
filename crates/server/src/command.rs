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
#[must_use]
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
#[must_use]
pub fn login_options(command: &str, remote_address: &str) -> Vec<String> {
    if command == "login" {
        // Remote address may arrive as an IPv6-mapped IPv4 address in the form
        // "::ffff:127.0.0.1".  Split on ':' gives ["", "", "ffff", "127.0.0.1"]
        // so index 3 is the plain IPv4 part; fall back to "localhost" otherwise.
        let parts: Vec<&str> = remote_address.split(':').collect();
        let addr = if parts.len() > 3 {
            parts[3]
        } else {
            "localhost"
        };
        vec!["login".into(), "-h".into(), addr.into()]
    } else {
        vec![command.into()]
    }
}

// ── SSH options ───────────────────────────────────────────────────────────────

/// SSH command-line arguments, passed by reference to avoid allocations.
pub struct SshArgs<'a> {
    pub host: &'a str,
    pub port: &'a str,
    pub pass: &'a str,
    pub command: &'a str,
    pub auth: &'a str,
    pub known_hosts: &'a str,
    pub config: &'a str,
    pub path: Option<&'a str>,
    pub key: Option<&'a str>,
}

/// Build the `ssh` (or `sshpass` + `ssh`) argument list.
/// Mirrors `src/server/command/ssh.ts :: sshOptions`.
#[must_use]
pub fn ssh_options(args: &SshArgs<'_>) -> Vec<String> {
    let cmd = parse_command(args.command, args.path);
    let host_checking = if args.known_hosts == "/dev/null" {
        "no"
    } else {
        "yes"
    };

    let sshpass_prefix =
        (!args.pass.is_empty()).then(|| ["sshpass".into(), "-p".into(), args.pass.into()]);

    let config_flag = (!args.config.is_empty()).then(|| ["-F".into(), args.config.into()]);

    let port_flag = (!args.port.is_empty()).then(|| ["-p".into(), args.port.into()]);

    let key_flag = args
        .key
        .filter(|k| !k.is_empty())
        .map(|k| ["-i".into(), k.into()]);

    let auth_flag = (args.auth != "none").then(|| {
        [
            "-o".into(),
            format!("PreferredAuthentications={}", args.auth),
        ]
    });

    sshpass_prefix
        .into_iter()
        .flatten()
        .chain(["ssh".into(), "-t".into()])
        .chain(config_flag.into_iter().flatten())
        .chain(port_flag.into_iter().flatten())
        .chain(key_flag.into_iter().flatten())
        .chain(auth_flag.into_iter().flatten())
        .chain([
            "-o".into(),
            format!("UserKnownHostsFile={}", args.known_hosts),
            "-o".into(),
            format!("StrictHostKeyChecking={host_checking}"),
            "-o".into(),
            "EscapeChar=none".into(),
            "--".into(),
            args.host.into(),
        ])
        .chain((!cmd.is_empty()).then_some(cmd))
        .collect()
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
#[must_use]
pub fn get_command(
    info: &SocketInfo,
    ssh: &SshConfig,
    command: &str,
    forcessh: bool,
) -> Vec<String> {
    if !forcessh && is_localhost(&ssh.host) {
        return login_options(command, &info.remote_address);
    }

    let username = info
        .header_user
        .as_deref()
        .or(info.path_user.as_deref())
        .or((!ssh.user.is_empty()).then_some(ssh.user.as_str()))
        .unwrap_or("");

    let ssh_host = if username.is_empty() {
        ssh.host.clone()
    } else {
        format!("{}@{}", escape_shell(username), ssh.host)
    };

    let url_params = url_args(
        info.referer.as_deref(),
        ssh.allow_remote_hosts,
        ssh.allow_remote_command,
    );

    let port_str = ssh.port.to_string();
    let pass_default = ssh.pass.as_deref().unwrap_or("");
    let config_default = ssh.config.as_deref().unwrap_or("");

    let args = SshArgs {
        host: url_params
            .get("host")
            .map_or(&ssh_host, std::string::String::as_str),
        port: url_params
            .get("port")
            .map_or(&port_str, std::string::String::as_str),
        pass: url_params
            .get("pass")
            .map_or(pass_default, std::string::String::as_str),
        command: url_params
            .get("command")
            .map_or(command, std::string::String::as_str),
        path: url_params.get("path").map(std::string::String::as_str),
        auth: &ssh.auth,
        known_hosts: &ssh.known_hosts,
        config: config_default,
        key: ssh.key.as_deref(),
    };

    ssh_options(&args)
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

    fn base_ssh_args() -> SshArgs<'static> {
        SshArgs {
            host: "user@example.com",
            port: "22",
            auth: "password",
            known_hosts: "/dev/null",
            config: "",
            pass: "",
            command: "login",
            path: None,
            key: None,
        }
    }

    #[test]
    fn ssh_options_basic() {
        let args = ssh_options(&base_ssh_args());
        assert!(args.contains(&"ssh".into()));
        assert!(args.contains(&"user@example.com".into()));
        assert!(args.contains(&"StrictHostKeyChecking=no".into()));
    }

    #[test]
    fn ssh_options_with_password() {
        let args = ssh_options(&SshArgs {
            pass: "secret",
            ..base_ssh_args()
        });
        assert_eq!(args[0], "sshpass");
        assert_eq!(args[1], "-p");
        assert_eq!(args[2], "secret");
    }

    #[test]
    fn ssh_options_with_key() {
        let args = ssh_options(&SshArgs {
            key: Some("/home/user/.ssh/id_rsa"),
            ..base_ssh_args()
        });
        assert!(args.contains(&"-i".into()));
        let idx = args.iter().position(|a| a == "-i").unwrap();
        assert_eq!(args[idx + 1], "/home/user/.ssh/id_rsa");
    }

    #[test]
    fn ssh_options_known_hosts_strict_when_not_dev_null() {
        let args = ssh_options(&SshArgs {
            known_hosts: "/etc/ssh/known_hosts",
            ..base_ssh_args()
        });
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
