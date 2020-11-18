export function address(
  headers: Record<string, string>,
  user: string,
  host: string,
): string {
  // Check request-header for username
  const remoteUser = headers['remote-user'];
  if (remoteUser) {
    return `${remoteUser}@${host}`;
  }
  const match = headers.referer.match('.+/ssh/([^/]+)$');
  const fallback = user ? `${user}@${host}` : host;
  return match ? `${match[1].split('?')[0]}@${host}` : fallback;
}
