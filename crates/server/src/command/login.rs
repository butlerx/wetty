//! Local login command builder.
//!
//! Builds the argument list for a local login session (running as root on
//! localhost).

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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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
}
