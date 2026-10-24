import { exec } from 'child_process';

const envVersion = (signal?: AbortSignal): Promise<number> =>
  new Promise((resolve, reject) => {
    exec(
      '/usr/bin/env --version',
      { signal, timeout: 5000 },
      (error, stdout, stderr): void => {
        if (error) {
          reject(Error(`error getting env version: ${error.message}`));
          return;
        }
        if (stderr) {
          reject(Error(`error getting env version: ${stderr}`));
          return;
        }
        resolve(
          parseInt(
            stdout
              .split(/\r?\n/)[0]
              .split(' (GNU coreutils) ')[1]
              .split('.')[0],
            10,
          ),
        );
      },
    );
  });

export const envVersionOr = (
  fallback: number,
  signal?: AbortSignal,
): Promise<number> => envVersion(signal).catch(() => fallback);
