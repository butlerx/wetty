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
  {
    allowRemoteCommand,
    allowRemoteHosts,
  }: {
    allowRemoteCommand: boolean;
    allowRemoteHosts: boolean;
  },
): { [s: string]: string } =>
  _.pick(
    _.pickBy(url.parse(referer || '', true).query, _.isString),
    ['pass'],
    allowRemoteCommand ? ['command', 'path'] : [],
    allowRemoteHosts ? ['port', 'host'] : [],
  );

export async function getCommand(
  socket: Socket,
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
    allowRemoteCommand,
  }: SSH,
  command: string,
  forcessh: boolean
): Promise<string[]> {
  const {
    request: { headers: { referer } },
    client: { conn: { remoteAddress } },
  } = socket;

  if (!forcessh && localhost(host)) {
    return loginOptions(command, remoteAddress);
  }

  const sshAddress = await address(socket, user, host);
  const args = {
    host: sshAddress,
    port: `${port}`,
    pass: pass || '',
    command,
    auth,
    knownHosts,
    config: config || '',
    ...urlArgs(referer, { allowRemoteHosts, allowRemoteCommand }),
  };
  return sshOptions(args, key);
}
