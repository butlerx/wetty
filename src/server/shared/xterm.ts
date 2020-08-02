import { IPtyForkOptions } from 'node-pty';
import { isUndefined } from 'lodash';

export const xterm: IPtyForkOptions = {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: Object.assign(
    {},
    ...Object.keys(process.env)
      .filter((key: string) => !isUndefined(process.env[key]))
      .map((key: string) => ({ [key]: process.env[key] }))
  ),
};
