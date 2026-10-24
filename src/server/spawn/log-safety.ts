const placeholder = '[redacted]';

// Newlines and other control characters would let a client forge log records.
// eslint-disable-next-line no-control-regex
const controlCharacters = /[\x00-\x1f\x7f]/g;

/**
 * Replace the cleartext SSH password in an argument vector.
 *
 * `sshOptions` prepends `sshpass -p <password>` when password authentication is
 * used, so the argument following that `-p` is a credential. `ssh` uses `-p`
 * for the port, so only the flags sshpass itself consumes — those before the
 * `ssh` it wraps — are considered.
 */
function redactPassword(args: string[]): string[] {
  const sshpass = args.indexOf('sshpass');
  if (sshpass === -1) return args;

  const flag = args.indexOf('-p', sshpass);
  if (flag === -1 || flag + 1 >= args.length) return args;

  const ssh = args.indexOf('ssh', sshpass);
  if (ssh !== -1 && flag > ssh) return args;

  const safe = [...args];
  safe[flag + 1] = placeholder;
  return safe;
}

/**
 * Make a spawn argument vector safe to write to the log.
 *
 * Beyond the password, the vector can carry `host`, `port`, `command` and
 * `path` values taken verbatim from referer query parameters. `URLSearchParams`
 * decodes percent-encoded sequences, so a `%0A` there becomes a real newline
 * that the development `simple` winston format does not escape.
 */
export const logSafeArgs = (args: string[]): string[] =>
  redactPassword(args).map((arg) => arg.replace(controlCharacters, ''));
