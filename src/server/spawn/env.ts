import { exec } from 'child_process';

// uutils coreutils (Rust; the default /usr/bin/env on Ubuntu 25.10+) supports
// `env -S` with the same semantics as GNU coreutils >= 9, so report it as 9.
const UUTILS_EQUIVALENT_VERSION = 9;

/**
 * Parse the first line of `env --version` into a GNU-equivalent major version.
 * Returns undefined for output it does not recognise.
 */
export const parseEnvVersion = (stdout: string): number | undefined => {
  const first = stdout.split(/\r?\n/)[0] ?? '';
  const gnu = /\(GNU coreutils\) (\d+)/.exec(first);
  if (gnu) return parseInt(gnu[1], 10);
  if (first.includes('(uutils coreutils)')) return UUTILS_EQUIVALENT_VERSION;
  return undefined;
};

const envVersion = (signal?: AbortSignal): Promise<number> =>
  new Promise((resolve, reject) => {
    exec('/usr/bin/env --version', { signal, timeout: 5000 }, (error, stdout, stderr): void => {
      if (error) {
        reject(Error(`error getting env version: ${error.message}`));
        return;
      }
      if (stderr) {
        reject(Error(`error getting env version: ${stderr}`));
        return;
      }
      // Never throw here: an exception in this callback escapes the promise and
      // crashes the whole server instead of falling back.
      const version = parseEnvVersion(stdout);
      if (version === undefined) {
        reject(Error(`unrecognised env version output: ${stdout.split(/\r?\n/)[0]}`));
        return;
      }
      resolve(version);
    });
  });

export const envVersionOr = (fallback: number, signal?: AbortSignal): Promise<number> =>
  envVersion(signal).catch(() => fallback);
