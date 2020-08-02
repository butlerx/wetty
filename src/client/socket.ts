import io from 'socket.io-client';

const userRegex = new RegExp('ssh/[^/]+$');
export const trim = (str: string): string => str.replace(/\/*$/, '');

const socketBase = trim(window.location.pathname).replace(userRegex, '');
export const socket = io(window.location.origin, {
  path: `${trim(socketBase)}/socket.io`,
});
