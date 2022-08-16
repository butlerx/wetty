import findUp from 'find-up';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export async function rootDir(): Promise<string> {
  try {
    const cwd = dirname(fileURLToPath(import.meta.url));
    const dir = await findUp('package.json', { cwd });

    return dirname(dir || process.cwd());
  } catch (err) {
    return dirname(process.cwd());
  }
}

export async function assetsPath(): Promise<(...arg0: string[]) => string> {
  const filePath = await rootDir();
  return (...args: string[]): string => resolve(filePath, 'build', ...args);
}
