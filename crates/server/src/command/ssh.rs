//! SSH command-line argument builder.
//!
//! Builds the `ssh` (or `sshpass` + `ssh`) argument list from the given
//! connection parameters.

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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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
