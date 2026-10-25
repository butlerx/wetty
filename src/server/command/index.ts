import process from 'node:process';
import { address } from './address.js';
import { loginOptions } from './login.js';
import { sshOptions } from './ssh.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events.js';
import type { SSH } from '../config/types.js';
import type { ServerSession } from '../session.js';
import type { Socket } from 'socket.io';

const localhost = (host: string): boolean =>
  process.getuid?.() === 0 &&
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
): Record<string, string> => {
  const allowedKeys = new Set([
    'pass',
    ...(allowRemoteCommand ? ['command', 'path'] : []),
    ...(allowRemoteHosts ? ['port', 'host'] : []),
  ]);
  const parsed = new URL(referer ?? '', 'http://localhost');
  const result: Record<string, string> = {};
  for (const [key, value] of parsed.searchParams) {
    if (allowedKeys.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

export async function getCommand(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
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
  forcessh: boolean,
  session: ServerSession,
): Promise<string[]> {
  const {
    request: {
      headers: { referer },
    },
    client: {
      conn: { remoteAddress },
    },
  } = socket;

  if (!forcessh && localhost(host)) {
    return loginOptions(command, remoteAddress);
  }

  const sshAddress = await address(socket, user, host, session);
  const args = {
    host: sshAddress,
    port: String(port),
    pass: pass ?? '',
    command,
    auth,
    knownHosts,
    config: config ?? '',
    ...urlArgs(referer, { allowRemoteHosts, allowRemoteCommand }),
  };
  return sshOptions(args, key);
}
