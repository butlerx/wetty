import { expect } from 'chai';
import 'mocha';

import { getCommand } from './index';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events';
import type { SSH } from '../config/types';
import type { ServerSession } from '../session';
import type { Socket } from 'socket.io';

const ssh: SSH = {
  user: 'alice',
  host: 'ssh.example',
  auth: 'password',
  port: 22,
  knownHosts: '/dev/null',
  allowRemoteHosts: true,
  allowRemoteCommand: true,
  pass: 'configured-secret',
};

describe('remote command URL options', () => {
  it('never accepts an SSH password from the Referer URL', async () => {
    const socket = {
      request: {
        headers: {
          referer:
            'https://terminal.example/?pass=url-secret&command=whoami&host=other.example',
        },
      },
      client: { conn: { remoteAddress: '127.0.0.1' } },
    } as unknown as Socket<ClientToServerEvents, ServerToClientEvents>;
    const session = { active: true } as ServerSession;

    const command = await getCommand(socket, ssh, 'login', true, session);

    expect(command).to.include('configured-secret');
    expect(command).not.to.include('url-secret');
  });
});
