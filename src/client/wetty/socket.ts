import io from 'socket.io-client';

export const trim = (str: string): string => str.replace(/\/*$/, '');

const socketBase = trim(window.location.pathname).replace(/ssh\/[^/]+$/, '');
export const socket = io(window.location.origin, {
  path: `${trim(socketBase)}/socket.io`,
});
