import url from 'url';
import type { Socket } from 'socket.io';
import type { SSH } from '../shared/interfaces';
import { address } from './command/address.js';
import { loginOptions } from './command/login.js';
import { sshOptions } from './command/ssh.js';

const localhost = (host: string): boolean =>
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

const urlArgs = (
  referer: string,
  def: { [s: string]: string },
): { [s: string]: string } =>
  Object.assign(def, url.parse(referer, true).query);

export const getCommand = (
  {
    request: {
      headers: { referer },
    },
    client: {
      conn: { remoteAddress },
    },
  }: Socket,
  { user, host, port, auth, pass, key, knownHosts }: SSH,
  command: string,
  forcessh: boolean,
): { args: string[]; user: boolean } => ({
  args:
    !forcessh && localhost(host)
      ? loginOptions(command, remoteAddress)
      : sshOptions(
          {
            ...urlArgs(referer, {
              port: `${port}`,
              pass: pass || '',
              command,
              auth,
              knownHosts,
            }),
            host: address(referer, user, host),
          },
          key,
        ),
  user:
    (!forcessh && localhost(host)) ||
    user !== '' ||
    user.includes('@') ||
    address(referer, user, host).includes('@'),
});
