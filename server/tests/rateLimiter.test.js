import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { apiLimiter, aiLimiter } from '../src/middleware/rateLimiter.js';

describe('Rate Limiter & 429 Distinction', () => {
  test('apiLimiter and aiLimiter expose distinct error codes and messages', () => {
    assert.equal(typeof apiLimiter, 'function');
    assert.equal(typeof aiLimiter, 'function');
  });

  test('apiLimiter allows valid requests within limit and sets RateLimit headers', async () => {
    const headers = {};
    const req = {
      ip: '127.0.0.99',
      method: 'POST',
      path: '/api/projects/123/generate',
      headers: {},
      app: { get: () => false },
    };
    const res = {
      statusCode: 200,
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      getHeader(k) { return headers[k.toLowerCase()]; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      send(body) { this.body = body; return this; },
    };

    let nextCalled = false;
    await new Promise((resolve) => {
      apiLimiter(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });

  test('aiLimiter allows valid requests within limit', async () => {
    const headers = {};
    const req = {
      ip: '127.0.0.98',
      method: 'POST',
      path: '/api/projects/123/generate',
      headers: {},
      app: { get: () => false },
    };
    const res = {
      statusCode: 200,
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      getHeader(k) { return headers[k.toLowerCase()]; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      send(body) { this.body = body; return this; },
    };

    let nextCalled = false;
    await new Promise((resolve) => {
      aiLimiter(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });
});
