import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../socket-events.js';

/**
 * Version-skew compatibility fixture for the public Socket.IO wire protocol.
 * Keep these literal names and representative payloads stable for older clients.
 */
export const clientToServerPayloads = {
  input: ['whoami', true],
  resize: [{ cols: 80, rows: 24 }],
  commit: [262144],
} satisfies {
  [Event in keyof ClientToServerEvents]: Parameters<
    ClientToServerEvents[Event]
  >;
};

export const serverToClientPayloads = {
  data: ['terminal output'],
  login: [],
  logout: [],
  error: ['Terminal session failed'],
} satisfies {
  [Event in keyof ServerToClientEvents]: Parameters<
    ServerToClientEvents[Event]
  >;
};
