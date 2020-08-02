export function address(referer: string, user: string, host: string): string {
  const match = referer.match('.+/ssh/([^/]+)$');
  const fallback = user ? `${user}@${host}` : host;
  return match ? `${match[1].split('?')[0]}@${host}` : fallback;
}
