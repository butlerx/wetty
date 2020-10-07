import findUp from 'find-up';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const filePath = dirname(
  findUp.sync('package.json', {
    cwd: dirname(fileURLToPath(import.meta.url)),
  }) || process.cwd(),
);

export const assetsPath = (...args: string[]) =>
  resolve(filePath, 'build', ...args);
