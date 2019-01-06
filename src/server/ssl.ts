import { readFile } from 'fs-extra';
import { resolve } from 'path';
import { isUndefined } from 'lodash';
import { SSL, SSLBuffer } from './interfaces';

export default async function loadSSL(ssl: SSL): Promise<SSLBuffer> {
  if (isUndefined(ssl.key) || isUndefined(ssl.cert)) return {};
  const files = [readFile(resolve(ssl.key)), readFile(resolve(ssl.cert))];
  const [key, cert]: Buffer[] = await Promise.all(files);
  return { key, cert };
}
