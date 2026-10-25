import 'mocha';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect } from 'chai';
import * as sinon from 'sinon';

interface WorkerEvent {
  request?: Request;
  respondWith?(response: Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
}

type WorkerListener = (event: WorkerEvent) => void;

function createWorkerHarness() {
  const listeners = new Map<string, WorkerListener>();
  const cache = {
    addAll: sinon.stub().resolves(),
    match: sinon.stub().resolves(undefined),
    put: sinon.stub().resolves(),
  };
  const caches = {
    delete: sinon.stub().resolves(true),
    keys: sinon.stub().resolves(['wetty-v1', 'other-app-v1']),
    match: sinon.stub().resolves(undefined),
    open: sinon.stub().resolves(cache),
  };
  const clients = { claim: sinon.stub().resolves() };
  const fetch = sinon.stub();
  const skipWaiting = sinon.stub().resolves();
  const source = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

  runInNewContext(source, {
    URL,
    Response,
    caches,
    fetch,
    registration: { scope: 'https://wetty.example/wetty/' },
    clients,
    skipWaiting,
    addEventListener(event: string, listener: WorkerListener) {
      listeners.set(event, listener);
    },
  });

  return { cache, caches, clients, fetch, listeners, skipWaiting };
}

describe('service worker cache boundary', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('preloads the application shell and deletes only old WeTTY caches', async () => {
    const harness = createWorkerHarness();
    const install = harness.listeners.get('install');
    const activate = harness.listeners.get('activate');
    if (install === undefined || activate === undefined) {
      throw new Error('Missing lifecycle listeners');
    }
    const installation: Promise<unknown>[] = [];
    const activation: Promise<unknown>[] = [];

    install({ waitUntil: (promise) => installation.push(promise) });
    activate({ waitUntil: (promise) => activation.push(promise) });
    await Promise.all([...installation, ...activation]);

    expect(harness.cache.addAll.calledOnce).to.equal(true);
    expect(harness.cache.addAll.firstCall.args[0]).to.include('./');
    expect(harness.skipWaiting.calledOnce).to.equal(true);
    expect(harness.clients.claim.calledOnce).to.equal(true);
    expect(harness.caches.delete.calledOnceWith('wetty-v1')).to.equal(true);
    expect(harness.caches.delete.calledWith('other-app-v1')).to.equal(false);
  });

  it('serves a cached application shell after a network failure', async () => {
    const harness = createWorkerHarness();
    harness.fetch.rejects(new Error('offline'));
    harness.cache.match.resolves(new Response('cached shell'));
    harness.caches.match.resolves(new Response('unrelated cached shell'));
    let responsePromise: Promise<Response> | undefined;
    const fetchListener = harness.listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('Missing fetch listener');

    fetchListener({
      request: new Request('https://wetty.example/wetty/'),
      respondWith(response) {
        responsePromise = response;
      },
      waitUntil: () => undefined,
    });

    if (responsePromise === undefined) {
      throw new Error('Service worker did not provide a response');
    }
    const response = await responsePromise;
    expect(await response.text()).to.equal('cached shell');
    expect(harness.caches.match.called).to.equal(false);
  });

  it('returns 503 when the application shell was never cached', async () => {
    const harness = createWorkerHarness();
    harness.fetch.rejects(new Error('offline'));
    let responsePromise: Promise<Response> | undefined;
    const fetchListener = harness.listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('Missing fetch listener');

    fetchListener({
      request: new Request('https://wetty.example/wetty/'),
      respondWith(response) {
        responsePromise = response;
      },
      waitUntil: () => undefined,
    });

    if (responsePromise === undefined) {
      throw new Error('Service worker did not provide a response');
    }
    expect((await responsePromise).status).to.equal(503);
  });

  it('does not cache unsuccessful static responses', async () => {
    const harness = createWorkerHarness();
    harness.fetch.resolves(new Response('missing', { status: 404 }));
    let cachePromise: Promise<unknown> | undefined;
    const fetchListener = harness.listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('Missing fetch listener');

    fetchListener({
      request: new Request(
        'https://wetty.example/wetty/client/xterm_config/functionality.js',
      ),
      respondWith: () => undefined,
      waitUntil(promise) {
        cachePromise = promise;
      },
    });

    if (cachePromise === undefined) {
      throw new Error('Service worker did not track the cache result');
    }
    await cachePromise;
    expect(harness.cache.put.called).to.equal(false);
  });

  it('does not intercept Socket.IO or query-bearing requests', () => {
    const harness = createWorkerHarness();
    const respondWith = sinon.spy();
    const waitUntil = sinon.spy();
    const fetchListener = harness.listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('Missing fetch listener');

    for (const request of [
      new Request('https://wetty.example/wetty/socket.io/?EIO=4'),
      new Request('https://wetty.example/wetty/client/wetty.js?v=1'),
      new Request('https://wetty.example/wetty/metrics'),
    ]) {
      fetchListener({ request, respondWith, waitUntil });
    }

    expect(harness.fetch.called).to.equal(false);
    expect(respondWith.called).to.equal(false);
    expect(waitUntil.called).to.equal(false);
  });

  it('tracks static cache writes through waitUntil', async () => {
    const harness = createWorkerHarness();
    const networkResponse = new Response('bundle', { status: 200 });
    harness.fetch.resolves(networkResponse);
    let responsePromise: Promise<Response> | undefined;
    let cachePromise: Promise<unknown> | undefined;
    const fetchListener = harness.listeners.get('fetch');
    if (fetchListener === undefined) throw new Error('Missing fetch listener');

    fetchListener({
      request: new Request(
        'https://wetty.example/wetty/client/xterm_config/functionality.js',
      ),
      respondWith(response) {
        responsePromise = response;
      },
      waitUntil(promise) {
        cachePromise = promise;
      },
    });

    expect(responsePromise).not.to.equal(undefined);
    expect(cachePromise).not.to.equal(undefined);
    await responsePromise;
    await cachePromise;

    expect(harness.cache.put.calledOnce).to.equal(true);
    expect(harness.cache.put.firstCall.args[0]).to.be.instanceOf(Request);
  });
});
