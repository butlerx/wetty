import { escapeShell } from '../shared/shell.js';

export function address(
  headers: Record<string, string>,
  user: string,
  host: string,
): string {
  // Check request-header for username
  const remoteUser = headers['remote-user'];
  if (remoteUser) {
    return `${escapeShell(remoteUser)}@${host}`;
  }
  const match = headers.referer.match('.+/ssh/([^/]+)$');
  if (match) {
    const username = escapeShell(match[1].split('?')[0]);
    return `${username}@${host}`;
  }
  return user ? `${escapeShell(user)}@${host}` : host;
}
