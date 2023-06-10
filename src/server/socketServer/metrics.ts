import url from 'url';
import { register, Counter, Histogram } from 'prom-client';
import ResponseTime from 'response-time';
import UrlValueParser from 'url-value-parser';
import type { Request, Response, RequestHandler } from 'express';

const requestLabels = ['route', 'method', 'status'];

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
 * Normalizes urls paths.
 *
 * This function replaces route params like ids, with a placeholder, so we can
 * set the metrics label, correctly. E.g., both routes
 *
 * - /api/v1/user/1
 * - /api/v1/user/2
 *
 * represents the same logical route, and we want to group them together,
 * hence the need for the normalization.
 *
 * @param {!string} path - url path.
 * @param {string} [placeholder='#val'] - the placeholder that will replace id like params in the url path.
 * @returns {string} a normalized path, withoud ids.
 */
function normalizePath(originalUrl: string, placeholder = '#val'): string {
  const { pathname } = url.parse(originalUrl);
  const urlParser = new UrlValueParser();
  return urlParser.replacePathValues(pathname || '', placeholder);
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
    const { originalUrl, method } = req;
    // will replace ids from the route with `#val` placeholder this serves to
    // measure the same routes, e.g., /image/id1, and /image/id2, will be
    // treated as the same route
    const route = normalizePath(originalUrl);

    if (route !== metricsPath) {
      const labels = {
        route,
        method,
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
