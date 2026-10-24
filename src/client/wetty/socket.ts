import { io, type Socket } from 'socket.io-client';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events.js';

export const trim = (str: string): string => str.replace(/\/*$/, '');

const socketBase = trim(window.location.pathname).replace(/ssh\/[^/]+$/, '');
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  window.location.origin,
  {
    path: `${trim(socketBase)}/socket.io`,
  },
);
