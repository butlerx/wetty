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

export function getCommand(
  {
    request: { headers },
    client: {
      conn: { remoteAddress },
    },
  }: Socket,
  {
    user,
    host,
    port,
    auth,
    pass,
    key,
    knownHosts,
    config,
    allowRemoteHosts,
  }: SSH,
  command: string,
  forcessh: boolean,
): [string[], boolean] {
  const sshAddress = address(headers, user, host);
  if (!forcessh && localhost(host)) {
    return [loginOptions(command, remoteAddress), true];
  }
  const args = urlArgs(headers.referer, {
    host: sshAddress,
    port: `${port}`,
    pass: pass || '',
    command,
    auth,
    knownHosts,
    config: config || '',
  });
  if (!allowRemoteHosts) {
    args.host = sshAddress;
  }

  return [
    sshOptions(args, key),
    user !== '' || user.includes('@') || sshAddress.includes('@'),
  ];
}
