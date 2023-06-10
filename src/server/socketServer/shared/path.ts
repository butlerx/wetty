import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import findUp from 'find-up';

const filePath = dirname(
  findUp.sync('package.json', {
    cwd: dirname(fileURLToPath(import.meta.url)),
  }) || process.cwd(),
);

export const assetsPath = (...args: string[]) =>
  resolve(filePath, 'build', ...args);
