import { login } from '../login.js';
import { escapeShell } from './shell.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events.js';
import type { ServerSession } from '../session.js';
import type { Socket } from 'socket.io';

export async function address(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  user: string,
  host: string,
  session: ServerSession,
): Promise<string> {
  // Check request-header for username
  const {
    request: {
      headers: { 'remote-user': userFromHeader, referer },
    },
  } = socket;

  let username: string | undefined;
  if (userFromHeader !== undefined && !Array.isArray(userFromHeader)) {
    username = userFromHeader;
  } else {
    const userFromPathMatch = referer?.match('.+/ssh/([^/]+)$');
    if (userFromPathMatch) {
      // eslint-disable-next-line prefer-destructuring
      username = userFromPathMatch[1].split('?')[0];
    } else if (user) {
      username = user;
    } else {
      username = await login(socket, session);
    }
  }
  return `${escapeShell(username)}@${host}`;
}
