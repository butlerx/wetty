import 'mocha';
import { once } from 'events';
import http from 'http';
import { expect } from 'chai';
import express from 'express';
import { register } from 'prom-client';
import { metricMiddleware, metricRoute } from './metrics';
import type { AddressInfo } from 'net';

const metricNames = [
  'http_requests_total',
  'http_request_duration_seconds',
  'http_request_length_bytes',
  'http_response_length_bytes',
];

const metricValues = async (name: string) => {
  const metric = register.getSingleMetric(name);
  if (metric === undefined) throw new Error(`Missing metric: ${name}`);
  return (await metric.get()).values;
};

describe('HTTP metrics cardinality', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    register.resetMetrics();
    const app = express();
    app.use(metricMiddleware('/wetty'));
    app.use('/wetty/metrics', metricRoute);
    app.get('/wetty', (_req, res) => res.send('terminal'));
    app.get('/wetty/ssh/:user', (_req, res) => res.send('terminal'));
    app.use('/wetty/client', (_req, res) => res.send('asset'));
    app.get('/wetty/sw.js', (_req, res) => res.send('service worker'));
    app.use((_req, res) => res.status(404).send('not found'));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    ({ port } = server.address() as AddressInfo);
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    register.resetMetrics();
  });

  const request = (path: string, method = 'GET'): Promise<string> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path,
          method,
          headers: { 'Content-Length': '0' },
        },
        (res) => {
          res.setEncoding('utf8');
          let body = '';
          res.on('data', (chunk: string) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(body);
          });
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy(new Error('Metrics request timed out'));
      });
      req.end();
    });

  it('bounds every metric when usernames, asset names and unknown paths vary', async () => {
    const sendUniquePaths = async (suffix: string) => {
      await Promise.all(
        Array.from({ length: 50 }, (_, index) => {
          const token = `${suffix}${'a'.repeat(index + 1)}`;
          return Promise.all([
            request(`/wetty/ssh/${token}?query=${token}`),
            request(`/wetty/client/${token}.js`),
            request(`/unknown/${token}`),
          ]);
        }),
      );
    };

    await sendUniquePaths('first');
    const before = await Promise.all(metricNames.map(metricValues));
    await sendUniquePaths('second');
    const after = await Promise.all(metricNames.map(metricValues));

    expect(after.map((values) => values.length)).to.deep.equal(
      before.map((values) => values.length),
    );
    for (const values of after) {
      expect(
        [...new Set(values.map((value) => value.labels.route))].sort(),
      ).to.deep.equal(['/wetty/client/*', '/wetty/ssh/:user', 'unmatched']);
    }
    const counts = await metricValues('http_requests_total');
    expect(counts.map((value) => value.value)).to.deep.equal([100, 100, 100]);
  });

  it('keeps fixed route labels and does not count metrics scrapes', async () => {
    await Promise.all([
      request('/wetty'),
      request('/wetty/sw.js'),
      request('/wetty/ssh/user%20name'),
    ]);
    const before = await Promise.all(metricNames.map(metricValues));
    const scrape = await request('/wetty/metrics?cache=unique');
    await request('/wetty/metrics/extra');
    const after = await Promise.all(metricNames.map(metricValues));

    expect(after).to.deep.equal(before);
    expect(scrape).to.include('http_requests_total');
    const counts = await metricValues('http_requests_total');
    expect(counts.map((value) => value.labels.route).sort()).to.deep.equal([
      '/wetty',
      '/wetty/ssh/:user',
      '/wetty/sw.js',
    ]);
  });

  it('uses a bounded label for extension HTTP methods', async () => {
    await Promise.all([
      request('/unknown/one', 'PROPFIND'),
      request('/unknown/two', 'MKCOL'),
    ]);
    const counts = await metricValues('http_requests_total');
    expect(counts).to.have.lengthOf(1);
    expect(counts[0].labels).to.deep.equal({
      route: 'unmatched',
      method: 'OTHER',
      status: '4XX',
    });
    expect(counts[0].value).to.equal(2);
  });
});
