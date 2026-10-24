export const escapeShell = (username: string): string =>
  // eslint-disable-next-line no-useless-escape
  username.replace(/[^a-zA-Z0-9_\\\-\.\@-]/g, '').replace(/^-+/g, '');
