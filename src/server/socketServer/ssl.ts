import { readFile } from 'node:fs/promises';
import { resolve } from 'path';
import type { SSL, SSLBuffer } from '../config/types.js';

export async function loadSSL(ssl?: SSL): Promise<SSLBuffer> {
  if (ssl === undefined) {
    return {};
  }
  const [key, cert]: Buffer[] = await Promise.all([
    readFile(resolve(ssl.key)),
    readFile(resolve(ssl.cert)),
  ]);
  return { key, cert };
}
