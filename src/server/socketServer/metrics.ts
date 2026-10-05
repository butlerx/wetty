import parseUrl from 'parseurl';
import { register, Counter, Histogram } from 'prom-client';
import ResponseTime from 'response-time';
import type { Request, Response, RequestHandler } from 'express';

const requestLabels = ['route', 'method', 'status'];
const requestMethods = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
]);

const requestCount = new Counter({
  name: 'http_requests_total',
  help: 'Counter for total requests received',
  labelNames: requestLabels,
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: requestLabels,
  buckets: [0.01, 0.1, 0.5, 1, 1.5],
});

const requestLength = new Histogram({
  name: 'http_request_length_bytes',
  help: 'Content-Length of HTTP request',
  labelNames: requestLabels,
  buckets: [512, 1024, 5120, 10240, 51200, 102400],
});

const responseLength = new Histogram({
  name: 'http_response_length_bytes',
  help: 'Content-Length of HTTP response',
  labelNames: requestLabels,
  buckets: [512, 1024, 5120, 10240, 51200, 102400],
});

/**
 * Use a fixed set of route families. Never retain attacker-controlled paths,
 * usernames, asset names or query strings as Prometheus labels.
 */
function normalizePath(path: string, basePath: string): string {
  if (path === basePath || path === `${basePath}/`) return basePath || '/';
  if (path.startsWith(`${basePath}/ssh/`)) return `${basePath}/ssh/:user`;
  if (path === `${basePath}/client` || path.startsWith(`${basePath}/client/`)) {
    return `${basePath}/client/*`;
  }
  if (path === `${basePath}/sw.js`) return `${basePath}/sw.js`;
  return 'unmatched';
}

/**
 * Normalizes http status codes.
 *
 * Returns strings in the format (2|3|4|5)XX.
 */
function normalizeStatusCode(status: number): string {
  if (status >= 200 && status < 300) {
    return '2XX';
  }

  if (status >= 300 && status < 400) {
    return '3XX';
  }

  if (status >= 400 && status < 500) {
    return '4XX';
  }

  return '5XX';
}

export function metricMiddleware(basePath: string): RequestHandler {
  const metricsPath = `${basePath}/metrics`;

  /**
   * Corresponds to the R(equest rate), E(error rate), and D(uration of requests),
   * of the RED metrics.
   */
  return ResponseTime((req: Request, res: Response, time: number): void => {
    const { method } = req;
    // Mounted middleware changes req.url/req.path while handling the response.
    const path = parseUrl.original(req)?.pathname ?? '';
    if (path !== metricsPath && !path.startsWith(`${metricsPath}/`)) {
      const labels = {
        route: normalizePath(path, basePath),
        method: requestMethods.has(method) ? method : 'OTHER',
        status: normalizeStatusCode(res.statusCode),
      };

      requestCount.inc(labels);

      // observe normalizing to seconds
      requestDuration.observe(labels, time / 1000);

      // observe request length
      const reqLength = req.get('Content-Length');
      if (reqLength) {
        requestLength.observe(labels, Number(reqLength));
      }

      // observe response length
      const resLength = res.get('Content-Length');
      if (resLength) {
        responseLength.observe(labels, Number(resLength));
      }
    }
  });
}

/**
 * Metrics route to be used by prometheus to scrape metrics
 */
export async function metricRoute(_req: Request, res: Response): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
