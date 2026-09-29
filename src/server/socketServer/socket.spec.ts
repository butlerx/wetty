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
  transport?: 'polling' | 'websocket';
  secFetchSite?: string;
}

const probeHandshake = async ({
  origin,
  sameOrigin = false,
  host,
  forwardedProtocol,
  allowedOrigins = [],
  transport = 'websocket',
  secFetchSite,
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
    host: host ?? `127.0.0.1:${String(port)}`,
  };

  if (transport === 'websocket') {
    headers.connection = 'Upgrade';
    headers['sec-websocket-key'] = randomBytes(16).toString('base64');
    headers['sec-websocket-version'] = '13';
    headers.upgrade = 'websocket';
  }
  if (sameOrigin) {
    headers.origin = `http://127.0.0.1:${String(port)}`;
  } else if (origin !== undefined) {
    headers.origin = origin;
  }
  if (forwardedProtocol !== undefined) {
    headers['x-forwarded-proto'] = forwardedProtocol;
  }
  if (secFetchSite !== undefined) {
    headers['sec-fetch-site'] = secFetchSite;
  }

  try {
    return await new Promise<number>((resolve, reject) => {
      const request = http.request({
        host: '127.0.0.1',
        port,
        path: `/socket.io/?EIO=4&transport=${transport}`,
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

  it('accepts same-origin polling when the browser omits Origin', async () => {
    const status = await probeHandshake({
      transport: 'polling',
      secFetchSite: 'same-origin',
    });
    expect(status).to.equal(200);
  });

  it('rejects untrusted polling requests that omit Origin', async () => {
    const statuses = await Promise.all(
      [undefined, 'same-site', 'cross-site', 'none'].map((secFetchSite) =>
        probeHandshake({ transport: 'polling', secFetchSite }),
      ),
    );

    expect(statuses).to.deep.equal([403, 403, 403, 403]);
    expect(
      await probeHandshake({
        transport: 'polling',
        allowedOrigins: ['https://frontend.example'],
      }),
    ).to.equal(403);
  });

  it('does not let fetch metadata override an unsafe Origin', async () => {
    const request = {
      transport: 'polling' as const,
      secFetchSite: 'same-origin',
    };

    expect(await probeHandshake({ ...request, origin: 'null' })).to.equal(403);
    expect(
      await probeHandshake({ ...request, origin: 'https://evil.example' }),
    ).to.equal(403);
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
