//! SSH / local-login command builder – port of `src/server/command/`.
//!
//! `get_command` is the main entry point; it mirrors the TypeScript function of
//! the same name and returns the `Vec<String>` of arguments to pass to
//! `spawn()`.

mod login;
mod ssh;
mod url;

pub use login::login_options;
pub use ssh::{ssh_options, SshArgs};
pub use url::url_args;

use crate::config::SshConfig;

/// Remove characters that are unsafe to pass as a shell username / host.
/// Mirrors `src/server/shared/shell.ts :: escapeShell`.
#[must_use]
pub fn escape_shell(username: &str) -> String {
    let stripped: String = username
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '\\' | '-' | '.' | '@'))
        .collect();
    stripped.trim_start_matches('-').to_string()
}

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
}
