/** Small request layer: cross-origin via GM_xmlhttpRequest, with a queue and GET cache. */
import { debugError } from './log.js';

export class HttpError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

const MAX_CONCURRENT = 4;
const MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 20000;

let active = 0;
const waiting = [];

function acquire() {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else active -= 1;
}

function rawRequest({ method = 'GET', url, headers = {}, body = null, timeout = DEFAULT_TIMEOUT }) {
  const gmRequest =
    typeof GM_xmlhttpRequest === 'function'
      ? GM_xmlhttpRequest
      : typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function'
        ? GM.xmlHttpRequest
        : null;

  if (!gmRequest) {
    // Dev fallback. Pages without CORS headers will fail; that is expected.
    return fetch(url, { method, headers, body }).then(async (response) => ({
      status: response.status,
      headers: response.headers,
      text: await response.text(),
    }));
  }

  return new Promise((resolve, reject) => {
    gmRequest({
      method,
      url,
      headers,
      data: body,
      timeout,
      onload: (response) => resolve({ status: response.status, headers: response.responseHeaders, text: response.responseText }),
      onerror: () => reject(new HttpError(`Network error for ${url}`, 0, null)),
      ontimeout: () => reject(new HttpError(`Timed out for ${url}`, 0, null)),
      onabort: () => reject(new HttpError(`Aborted ${url}`, 0, null)),
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ordered, concurrency-limited request. Retries 429/5xx twice. */
export async function request(options) {
  await acquire();
  try {
    let attempt = 0;
    for (;;) {
      const response = await rawRequest(options);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= MAX_RETRIES) return response;

      const retryAfter = Number(headerValue(response.headers, 'retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 1000 * (attempt + 1);
      attempt += 1;
      await sleep(delay);
    }
  } finally {
    release();
  }
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const line = String(headers)
    .split(/\r?\n/)
    .find((row) => row.toLowerCase().startsWith(`${name}:`));
  return line ? line.slice(line.indexOf(':') + 1).trim() : null;
}

const cache = new Map(); // url -> { expires, value }

/** GET JSON, deduped and cached for `ttl` ms. */
export async function getJSON(url, { headers = {}, ttl = 0 } = {}) {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;

  const response = await request({ url, headers, method: 'GET' });
  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text);
  }

  let value;
  try {
    value = JSON.parse(response.text);
  } catch (error) {
    throw new HttpError(`Invalid JSON from ${url}`, response.status, response.text);
  }

  if (ttl > 0) cache.set(url, { expires: now + ttl, value });
  return value;
}

export function clearCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

export function cacheSize() {
  return cache.size;
}
