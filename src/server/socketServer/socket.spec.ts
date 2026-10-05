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
  allowMissingOrigin?: boolean;
}

const probeHandshake = async ({
  origin,
  sameOrigin = false,
  host,
  forwardedProtocol,
  allowedOrigins = ['http://terminal.example'],
  transport = 'websocket',
  secFetchSite,
  allowMissingOrigin = false,
}: ProbeOptions): Promise<number> => {
  const io = listen(express(), {
    host: '127.0.0.1',
    port: 0,
    path: '',
    ssl: {},
    socket: false,
    allowedOrigins,
    allowMissingOrigin,
  });
  const server = io.httpServer;

  if (!server.listening) {
    await once(server, 'listening');
  }

  const { port } = server.address() as AddressInfo;
  const headers: http.OutgoingHttpHeaders = {
    host: host ?? 'terminal.example',
  };

  if (transport === 'websocket') {
    headers.connection = 'Upgrade';
    headers['sec-websocket-key'] = randomBytes(16).toString('base64');
    headers['sec-websocket-version'] = '13';
    headers.upgrade = 'websocket';
  }
  if (sameOrigin) {
    headers.origin = 'http://terminal.example';
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

  it('rejects missing and null origins on both transports by default', async () => {
    const statuses = await Promise.all(
      (['polling', 'websocket'] as const).map((transport) =>
        Promise.all([
          probeHandshake({ transport }),
          probeHandshake({ transport, origin: 'null' }),
        ]),
      ),
    );
    expect(statuses).to.deep.equal([
      [403, 403],
      [400, 400],
    ]);
  });

  it('accepts a request with no origin when allowMissingOrigin is true', async () => {
    expect(
      await probeHandshake({ transport: 'polling', allowMissingOrigin: true }),
    ).to.equal(200);
  });

  it('allowMissingOrigin does not bypass the null-origin rejection', async () => {
    expect(
      await probeHandshake({
        transport: 'polling',
        origin: 'null',
        allowMissingOrigin: true,
      }),
    ).to.equal(403);
  });

  it('uses configured origins rather than proxy headers', async () => {
    const request = {
      host: 'internal-backend.example',
      forwardedProtocol: 'http',
      allowedOrigins: ['https://terminal.example'],
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

  it('rejects matching attacker Host and Origin headers on both transports', async () => {
    const statuses = await Promise.all(
      (['polling', 'websocket'] as const).map((transport) =>
        probeHandshake({
          transport,
          host: 'rebind.attacker.test',
          origin: 'http://rebind.attacker.test',
        }),
      ),
    );
    expect(statuses).to.deep.equal([403, 400]);
  });

  it('rejects rebinding with no Origin despite same-origin fetch metadata', async () => {
    const statuses = await Promise.all(
      (['polling', 'websocket'] as const).map((transport) =>
        probeHandshake({
          transport,
          host: 'rebind.attacker.test',
          secFetchSite: 'same-origin',
        }),
      ),
    );
    expect(statuses).to.deep.equal([403, 400]);
  });

  it('does not implicitly trust localhost or the listen address', async () => {
    expect(
      await probeHandshake({
        host: '127.0.0.1',
        origin: 'http://127.0.0.1',
        transport: 'polling',
      }),
    ).to.equal(403);
  });

  it('requires a nonempty configured origin allowlist before listening', () => {
    expect(() =>
      listen(express(), {
        host: '127.0.0.1',
        port: 0,
        path: '',
        ssl: {},
        allowedOrigins: [],
      }),
    ).to.throw('Configure at least one allowed origin');
  });

  it('matches the complete configured scheme, host and port', async () => {
    const statuses = await Promise.all(
      [
        'https://terminal.example:8443',
        'http://terminal.example:8443',
        'https://terminal.example',
        'https://terminal.example:8444',
        'https://terminal.example.attacker.test:8443',
      ].map((origin) =>
        probeHandshake({
          origin,
          transport: 'polling',
          allowedOrigins: ['https://terminal.example:8443'],
        }),
      ),
    );
    expect(statuses).to.deep.equal([200, 403, 403, 403, 403]);
  });

  it('rejects malformed Origin values instead of accepting their first value', async () => {
    const statuses = await Promise.all(
      [
        'null',
        'not-an-origin',
        'http://terminal.example, http://evil.example',
        'http://terminal.example http://evil.example',
        'http://user@terminal.example',
        'http://terminal.example/path',
        'http://terminal.example?query',
        'http://terminal.example#fragment',
        'http://terminal.example\\\\path',
      ].map((origin) => probeHandshake({ origin, transport: 'polling' })),
    );
    expect(statuses).to.deep.equal(Array<number>(9).fill(403));
  });

  it('rejects unsafe allowlist configuration before opening a listener', () => {
    for (const origin of [
      '*',
      'null',
      'ftp://terminal.example',
      'https://*.terminal.example',
      'https://user@terminal.example',
      'https://terminal.example/path',
      'https://terminal.example?query',
      'https://terminal.example#fragment',
    ]) {
      expect(() =>
        listen(express(), {
          host: '127.0.0.1',
          port: 0,
          path: '',
          ssl: {},
          allowedOrigins: [origin],
        }),
      ).to.throw('Invalid allowed origin');
    }
  });

  it('allowMissingOrigin never permits a supplied untrusted Origin', async () => {
    expect(
      await probeHandshake({
        transport: 'polling',
        host: 'rebind.attacker.test',
        origin: 'http://rebind.attacker.test',
        allowMissingOrigin: true,
      }),
    ).to.equal(403);
  });

  it('accepts canonical origins including IPv6 and default ports', async () => {
    const statuses = await Promise.all(
      [
        {
          origin: 'https://terminal.example',
          allowedOrigins: ['https://TERMINAL.example:443/'],
        },
        { origin: 'http://[::1]:3000', allowedOrigins: ['http://[::1]:3000'] },
      ].map((options) => probeHandshake({ ...options, transport: 'polling' })),
    );
    expect(statuses).to.deep.equal([200, 200]);
  });

  it('pins the Host port for missing-Origin polling', async () => {
    const request = {
      transport: 'polling' as const,
      secFetchSite: 'same-origin',
      allowedOrigins: ['https://terminal.example:8443'],
    };
    expect(
      await probeHandshake({ ...request, host: 'terminal.example:8443' }),
    ).to.equal(200);
    expect(
      await probeHandshake({ ...request, host: 'terminal.example:8444' }),
    ).to.equal(403);
  });

  it('accepts an explicitly configured origin', async () => {
    const status = await probeHandshake({
      origin: 'https://frontend.example',
      allowedOrigins: ['https://frontend.example'],
    });
    expect(status).to.equal(101);
  });
});
