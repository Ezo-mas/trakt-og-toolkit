/** Small request layer: cross-origin via GM_xmlhttpRequest, with a queue and GET cache. */

export class HttpError extends Error {
  constructor(message, status, body, headers = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

export function authError(message, status = 0) {
  // Never attach authenticated response bodies or request details.
  return new HttpError(message, status, null);
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

function rawRequest({ method = 'GET', url, headers = {}, body = null, timeout = DEFAULT_TIMEOUT, signal }) {
  const gmRequest =
    typeof GM_xmlhttpRequest === 'function'
      ? GM_xmlhttpRequest
      : typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function'
        ? GM.xmlHttpRequest
        : null;

  if (!gmRequest) {
    // Dev fallback. Pages without CORS headers will fail; that is expected.
    return fetch(url, { method, headers, body, signal }).then(async (response) => ({
      status: response.status,
      headers: response.headers,
      text: await response.text(),
    }));
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new HttpError('Request cancelled', 0, null));
    let handle;
    const abort = () => { handle?.abort(); reject(new HttpError('Request cancelled', 0, null)); };
    const finish = (callback, value) => { signal?.removeEventListener('abort', abort); callback(value); };
    signal?.addEventListener('abort', abort, { once: true });
    handle = gmRequest({
      method,
      url,
      headers,
      data: body,
      timeout,
      onload: (response) => finish(resolve, { status: response.status, headers: response.responseHeaders, text: response.responseText }),
      onerror: () => finish(reject, new HttpError(`Network error for ${url}`, 0, null)),
      ontimeout: () => finish(reject, new HttpError(`Timed out for ${url}`, 0, null)),
      onabort: () => finish(reject, new HttpError(`Aborted ${url}`, 0, null)),
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Longest Retry-After worth waiting for in place; longer ones fail now rather than retry early. */
export const MAX_RETRY_WAIT_MS = 60000;

/**
 * Ordered, concurrency-limited request. Retries 429/5xx twice. `beforeSend` runs after a
 * concurrency slot is acquired and immediately before each actual send; it may return fresh
 * request options (for example headers) or throw to cancel without dispatching.
 */
export async function request(options) {
  await acquire();
  try {
    let attempt = 0;
    for (;;) {
      const prepared = options.beforeSend?.();
      const response = await rawRequest(prepared ? { ...options, ...prepared } : options);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= (options.retries ?? MAX_RETRIES)) return response;

      // Honour the server's full Retry-After delay; shortening it retries too early. A wait longer
      // than MAX_RETRY_WAIT_MS gives up instead: sleeping here holds one of the four request slots.
      const retryAfter = Number(headerValue(response.headers, 'retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1);
      if (delay > MAX_RETRY_WAIT_MS) return response;
      attempt += 1;
      await sleep(delay);
    }
  } finally {
    release();
  }
}

export function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const line = String(headers)
    .split(/\r?\n/)
    .find((row) => row.toLowerCase().startsWith(`${name}:`));
  return line ? line.slice(line.indexOf(':') + 1).trim() : null;
}

const cache = new Map(); // key -> { expires, value }

export async function cachedResponse(key, ttl, load) {
  if (ttl <= 0) return load();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;
  const value = await load();
  cache.set(key, { expires: now + ttl, value });
  return value;
}

/** GET JSON, optionally cached. `timeout` and `retries` bound the lookup. */
export function getJSON(url, { headers = {}, ttl = 0, timeout, retries } = {}) {
  return cachedResponse(url, ttl, async () => {
    const response = await request({ url, headers, timeout, retries });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text, response.headers);
    }
    try {
      return JSON.parse(response.text);
    } catch {
      throw new HttpError(`Invalid JSON from ${url}`, response.status, response.text, response.headers);
    }
  });
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
