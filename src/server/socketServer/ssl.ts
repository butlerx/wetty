import { resolve } from 'path';
import fs from 'fs-extra';
import isUndefined from 'lodash/isUndefined.js';
import type { SSL, SSLBuffer } from '../../shared/interfaces';

export async function loadSSL(ssl?: SSL): Promise<SSLBuffer> {
  if (isUndefined(ssl) || isUndefined(ssl.key) || isUndefined(ssl.cert))
    return {};
  const [key, cert]: Buffer[] = await Promise.all([
    fs.readFile(resolve(ssl.key)),
    fs.readFile(resolve(ssl.cert)),
  ]);
  return { key, cert };
}
