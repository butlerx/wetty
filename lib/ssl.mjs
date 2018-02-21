import fs from 'fs-extra';
import path from 'path';
import { isUndefined } from 'lodash';

export default (sslkey, sslcert) =>
  isUndefined(sslkey) || isUndefined(sslcert)
    ? Promise.resolve({})
    : Promise.all([
        fs.readFile(path.resolve(sslkey)),
        fs.readFile(path.resolve(sslcert)),
      ]).then(([key, cert]) => ({ key, cert }));
