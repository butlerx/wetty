import _ from 'lodash';
import { Socket } from 'socket.io';
import { login } from '../login.js';
import { escapeShell } from '../shared/shell.js';

export async function address(
  socket: Socket,
  user: string,
  host: string,
): Promise<string> {
  // Check request-header for username
  const { request: { headers: {
    'remote-user': userFromHeader,
    referer
  } } } = socket;

  let username: string | undefined;
  if (!_.isUndefined(userFromHeader) && !Array.isArray(userFromHeader)) {
    username = userFromHeader;
  } else {
    const userFromPathMatch = referer?.match('.+/ssh/([^/]+)$');
    if (userFromPathMatch) {
      // eslint-disable-next-line prefer-destructuring
      username = userFromPathMatch[1].split('?')[0];
    } else if (user) {
      username = user;
    } else {
      username = await login(socket);
    }
  }
  return `${escapeShell(username)}@${host}`;
}
