import 'mocha';
import { once } from 'node:events';
import http from 'node:http';
import { expect } from 'chai';
import express from 'express';
import * as sinon from 'sinon';

import { logger } from '../observability/logger';
import { server } from './index';
import type { AddressInfo } from 'node:net';

function request(port: number, path: string): Promise<void> {
  return new Promise((resolveRequest, reject) => {
    const outgoing = http.get(
      {
        host: '127.0.0.1',
        port,
        path,
        headers: {
          authorization: 'Bearer header-secret',
          cookie: 'session=cookie-secret',
          referer: `https://terminal.example${path}`,
        },
      },
      (response) => {
        response.resume();
        response.once('end', resolveRequest);
      },
    );
    outgoing.once('error', reject);
  });
}

describe('HTTP request logging', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('does not persist URL credentials or authentication headers', async () => {
    const log = sinon.stub(logger(), 'log');
    const io = await server(
      express(),
      {
        base: '/',
        port: 0,
        host: '127.0.0.1',
        socket: false,
        title: 'WeTTY',
        allowIframe: false,
        allowedOrigins: ['https://terminal.example'],
      },
      undefined,
    );
    const { port } = io.httpServer.address() as AddressInfo;

    try {
      await request(port, '/?pass=url-secret');
      await new Promise<void>((resolveTick) => {
        setImmediate(resolveTick);
      });
      const logged = JSON.stringify(log.args);
      expect(logged).not.to.include('url-secret');
      expect(logged).not.to.include('header-secret');
      expect(logged).not.to.include('cookie-secret');
    } finally {
      await io.close();
      if (io.httpServer.listening) {
        io.httpServer.close();
        await once(io.httpServer, 'close');
      }
    }
  });
});
