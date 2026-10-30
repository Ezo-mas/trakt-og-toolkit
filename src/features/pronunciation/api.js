/** Forvo lookup: fetch its public search page and pull the recordings out of it. */
import { HttpError, request } from '../../core/http.js';
import { forvoUrl, parseForvoPage } from './data.js';

const CACHE_TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 20;
const cache = new Map();

function remember(url, recordings) {
  cache.delete(url);
  cache.set(url, { expires: Date.now() + CACHE_TTL, recordings });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

export async function getForvoRecordings(name, { signal } = {}) {
  const url = forvoUrl(name);
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.recordings;

  const response = await request({
    url,
    method: 'GET',
    headers: { Accept: 'text/html,application/xhtml+xml' },
    timeout: 15000,
    signal,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text);
  }

  const recordings = parseForvoPage(response.text, name);
  remember(url, recordings);
  return recordings;
}
