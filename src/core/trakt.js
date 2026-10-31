/** Trakt API client. Public cached GETs and uncached authenticated requests. */
import { authError, readTokens, refreshTokens, privateRequest, clearTokens } from './oauth.js';
import { API, CACHE_TTL } from '../config.js';
import { getJSON, headerValue } from './http.js';
import { getClientId } from '../settings.js';

export class MissingClientIdError extends Error {
  constructor() {
    super('No Trakt API client ID configured');
    this.name = 'MissingClientIdError';
  }
}

/** GET a public Trakt API path (e.g. `/shows/1388/seasons`), cached for `ttl` ms. */
export function apiGet(path, { ttl = CACHE_TTL } = {}) {
  const clientId = getClientId();
  if (!clientId) return Promise.reject(new MissingClientIdError());

  return getJSON(`${API.base}${path}`, {
    ttl,
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': API.version,
      'trakt-api-key': clientId,
    },
  });
}

/** Seasons with their episode counts (season 0 is specials). `extended=full` is what adds the counts. */
export async function getSeasons(id) {
  const seasons = await apiGet(`/shows/${encodeURIComponent(id)}/seasons?extended=full`);
  if (!Array.isArray(seasons)) return [];
  return seasons
    .filter((season) => Number.isInteger(season.number))
    .map((season) => ({
      number: season.number,
      episodes: Number.isInteger(season.episode_count)
        ? season.episode_count
        : Number.isInteger(season.aired_episodes)
          ? season.aired_episodes
          : null,
    }))
    .sort((a, b) => a.number - b.number);
}

/** Cheap round-trip used by the menu's connection test. */
export async function ping() {
  const started = Date.now();
  await apiGet('/shows/breaking-bad', { ttl: 0 });
  return Date.now() - started;
}


/** Authenticated requests never enter the public response cache. */
export function apiAuth(method, path, body, options = {}) {
  return authenticated(method, path, body, options, false);
}
export function apiAuthPage(path, options = {}) {
  return authenticated('GET', path, undefined, options, true);
}
async function authenticated(method, path, body, options, metadata) {
  if (!/^\/(?!\/)/.test(path) || /[?#]/.test(path) || path.includes('://')) {
    throw authError('Authenticated API paths must be relative and contain no query.');
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    const valid = method === 'GET' && (
      (['page', 'limit'].includes(key) && Number.isSafeInteger(value) && value >= 1 && (key !== 'limit' || value <= 1000)) ||
      (['start_at', 'end_at'].includes(key) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) ||
      (key === 'extended' && ['images', 'full', 'full,images'].includes(value)));
    if (!valid) throw authError('Unsupported authenticated query option.');
    query.set(key, String(value));
  }
  const requestPath = query.size ? `${path}?${query}` : path;
  let tokens = readTokens();
  if (!tokens) throw authError('Signed out; sign in to Trakt.');
  if (tokens.expires_at <= Date.now() + 60000) {
    tokens = await refreshTokens();
  }
  const send = (t) => privateRequest(`${API.base}${requestPath}`, {
    method, headers: {
      'Content-Type': 'application/json', 'trakt-api-version': API.version,
      'trakt-api-key': t.client_id, Authorization: `Bearer ${t.access_token}`,
    }, body: body == null ? null : JSON.stringify(body),
  });
  let response = await send(tokens);
  if (response.status === 401) {
    // Another concurrent request may already have rotated the rejected token.
    const latest = readTokens();
    if (!latest) throw authError('Signed out; sign in to Trakt.');
    tokens = latest.access_token !== tokens.access_token ? latest : await refreshTokens();
    response = await send(tokens);
  }
  if (response.status === 401) {
    clearTokens();
    throw authError('Trakt session expired; sign in again.', 401);
  }
  if (response.status < 200 || response.status >= 300) throw authError('Authenticated Trakt request failed.', response.status);
  if (!response.text || response.status === 204) return null;
  try {
    const data = JSON.parse(response.text);
    if (!metadata) return data;
    const raw = headerValue(response.headers, 'x-pagination-page-count');
    const pages = raw == null ? null : Number(raw);
    if (pages !== null && (!Number.isSafeInteger(pages) || pages < 0)) throw new Error();
    return { data, pages };
  } catch { throw authError('Invalid Trakt response.'); }
}

export { isSignedIn } from './oauth.js';
