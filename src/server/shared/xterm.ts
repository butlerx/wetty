import isUndefined from 'lodash/isUndefined.js';
import type { IPtyForkOptions } from 'node-pty';

export const xterm: IPtyForkOptions = {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: Object.assign(
    {},
    ...Object.keys(process.env)
      .filter((key: string) => !isUndefined(process.env[key]))
      .map((key: string) => ({ [key]: process.env[key] })),
  ),
};
