import { exec } from 'child_process';

export const envVersion = (): Promise<number> =>
  new Promise((resolve, reject) => {
    exec('/usr/bin/env --version', (error, stdout, stderr): void => {
      if (error) {
        return reject(Error(`error getting env version: ${error.message}`));
      }
      if (stderr) {
        return reject(Error(`error getting env version: ${stderr}`));
      }
      return resolve(
        parseInt(
          stdout.split(/\r?\n/)[0].split(' (GNU coreutils) ')[1].split('.')[0],
          10,
        ),
      );
    });
  });
