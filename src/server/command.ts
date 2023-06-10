import process from 'node:process';
import url from 'url';
import _ from 'lodash';
import { address } from './command/address.js';
import { loginOptions } from './command/login.js';
import { sshOptions } from './command/ssh.js';
import type { SSH } from '../shared/interfaces';
import type { Socket } from 'socket.io';

const localhost = (host: string): boolean =>
  !_.isUndefined(process.getuid) &&
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

const urlArgs = (
  referer: string | undefined,
  def: { [s: string]: string },
): { [s: string]: string } =>
  Object.assign(def, url.parse(referer || '', true).query);

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
