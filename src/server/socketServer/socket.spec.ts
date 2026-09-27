import 'mocha';
import { randomBytes } from 'crypto';
import { once } from 'events';
import http from 'http';
import { expect } from 'chai';
import express from 'express';
import { listen } from './socket';
import type { AddressInfo } from 'net';

interface ProbeOptions {
  origin?: string;
  sameOrigin?: boolean;
  host?: string;
  forwardedProtocol?: string;
  allowedOrigins?: string[];
}

const probeHandshake = async ({
  origin,
  sameOrigin = false,
  host,
  forwardedProtocol,
  allowedOrigins = [],
}: ProbeOptions): Promise<number> => {
  const io = listen(express(), {
    host: '127.0.0.1',
    port: 0,
    path: '',
    ssl: {},
    socket: false,
    allowedOrigins,
  });
  const server = io.httpServer;

  if (!server.listening) {
    await once(server, 'listening');
  }

  const { port } = server.address() as AddressInfo;
  const headers: http.OutgoingHttpHeaders = {
    connection: 'Upgrade',
    host: host ?? `127.0.0.1:${String(port)}`,
    'sec-websocket-key': randomBytes(16).toString('base64'),
    'sec-websocket-version': '13',
    upgrade: 'websocket',
  };

  if (sameOrigin) {
    headers.origin = `http://127.0.0.1:${String(port)}`;
  } else if (origin !== undefined) {
    headers.origin = origin;
  }
  if (forwardedProtocol !== undefined) {
    headers['x-forwarded-proto'] = forwardedProtocol;
  }

  try {
    return await new Promise<number>((resolve, reject) => {
      const request = http.request({
        host: '127.0.0.1',
        port,
        path: '/socket.io/?EIO=4&transport=websocket',
        headers,
      });

      request.on('upgrade', (response, socket) => {
        socket.destroy();
        resolve(response.statusCode ?? 0);
      });
      request.on('response', (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      });
      request.on('error', reject);
      request.setTimeout(2000, () => {
        request.destroy(new Error('WebSocket handshake timed out'));
      });
      request.end();
    });
  } finally {
    await io.close();
  }
};

describe('Socket.IO origin validation', () => {
  it('accepts the same browser origin', async () => {
    const status = await probeHandshake({ sameOrigin: true });
    expect(status).to.equal(101);
  });

  it('rejects a foreign browser origin', async () => {
    const status = await probeHandshake({ origin: 'https://evil.example' });
    expect(status).to.equal(400);
  });

  it('rejects missing and null origins', async () => {
    expect(await probeHandshake({})).to.equal(400);
    expect(await probeHandshake({ origin: 'null' })).to.equal(400);
  });

  it('uses the forwarded protocol for same-origin proxy requests', async () => {
    const request = {
      host: 'terminal.example',
      forwardedProtocol: 'https',
    };

    expect(
      await probeHandshake({
        ...request,
        origin: 'https://terminal.example',
      }),
    ).to.equal(101);
    expect(
      await probeHandshake({
        ...request,
        origin: 'http://terminal.example',
      }),
    ).to.equal(400);
  });

  it('accepts an explicitly allowed additional origin', async () => {
    const status = await probeHandshake({
      origin: 'https://frontend.example',
      allowedOrigins: ['https://frontend.example'],
    });
    expect(status).to.equal(101);
  });
});
