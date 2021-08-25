export const escapeShell = (username: string): string =>
  username.replace(/^-|[^a-zA-Z0-9_-]/g, '');
