/** Trakt API client using og's session, with cached metadata and one shared write queue. */
import { API, CACHE_TTL } from '../config.js';
import { authError, cachedResponse, headerValue, request } from './http.js';
import { getOgSessionRevision, readOgSession } from './og-session.js';
import { cancelledError, enqueueWrite, markWriteDispatched, retryRateLimitedWrite, waitForTurn } from './write-queue.js';

export function isSignedIn() {
  return Boolean(readOgSession());
}

export function listReadFailureHint(error, target, action) {
  if (error?.ogSession) return error.message;
  if (error?.status === 401) return `Sign in to og.trakt.tv to ${action} this ${target}.`;
  if (error?.status === 403 || error?.status === 404) return `This ${target} is private or unavailable.`;
  return `Could not read this ${target}. Try again later.`;
}

/** Read storage before comparing revisions so same-tab changes are caught too. */
function currentSession(generation) {
  const session = readOgSession();
  if (generation !== getOgSessionRevision()) throw authError('Trakt session changed; request abandoned.');
  if (!session) throw authError('Sign in to og.trakt.tv first.', 401);
  return session;
}

function expiredSessionError() {
  const error = authError('Your og.trakt.tv session expired; reload the page to renew it.', 401);
  error.ogSession = true;
  return error;
}

function freshSession(session) {
  if (session.expiresAt != null && session.expiresAt <= Date.now()) throw expiredSessionError();
  return session;
}

function authHeaders({ clientId, accessToken }) {
  return {
    'Content-Type': 'application/json', 'trakt-api-version': API.version, 'trakt-api-key': clientId,
    Authorization: `Bearer ${accessToken}`,
  };
}

function createWriteEntry(control, generation) {
  const { signal, active } = control;
  return {
    signal,
    generation,
    check() {
      if (signal?.aborted || (typeof active === 'function' && active() === false)) throw cancelledError();
      return currentSession(generation);
    },
  };
}

/** Metadata reads may use the cache while the same og session is active. */
export async function apiGet(path, { ttl = CACHE_TTL } = {}) {
  if (!/^\/(?![/\\])/.test(path)) throw authError('API paths must be relative.');
  const session = readOgSession();
  if (!session) throw authError('Sign in to og.trakt.tv first.', 401);
  freshSession(session);
  const generation = getOgSessionRevision();
  const url = `${API.base}${path}`;
  const data = await cachedResponse(`${url}\n${generation}`, ttl,
    () => sendAuthenticated('GET', url, undefined, false, generation, null, true));
  currentSession(generation);
  return data;
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
  await apiAuth('GET', '/users/me');
  return Date.now() - started;
}

/**
 * Account reads bypass the cache. Writes use the shared queue and may be cancelled by
 * the caller's guard or abort signal before dispatch.
 */
export function apiAuth(method, path, body, options = {}, control = {}) {
  return authenticated(method, path, body, options, false, control);
}
export function apiAuthPage(path, options = {}) {
  return authenticated('GET', path, undefined, options, true, {});
}
async function authenticated(method, path, body, options, metadata, control) {
  if (!/^\/(?![/\\])/.test(path) || /[?#]/.test(path) || path.includes('://')) {
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
  const url = `${API.base}${requestPath}`;
  readOgSession();
  const generation = getOgSessionRevision();
  if (method === 'GET') return sendAuthenticated(method, url, body, metadata, generation);

  const entry = createWriteEntry(control, generation);
  entry.check();
  return enqueueWrite(entry, () => sendAuthenticated(method, url, body, metadata, generation, entry));
}

function parseAuthenticatedResponse(response, metadata) {
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

async function sendAuthenticated(method, url, body, metadata, generation, entry, retryReads = false) {
  let retriedToken = false;
  let rateRetries = 0;
  for (;;) {
    if (entry) await waitForTurn(entry);
    let sent;
    let guardError;
    let response;
    try {
      response = await request({
        method, url, retries: retryReads ? undefined : 0,
        body: body == null ? null : JSON.stringify(body),
        signal: entry?.signal,
        beforeSend() {
          try {
            sent = freshSession(entry ? entry.check() : currentSession(generation));
          } catch (error) {
            guardError = error;
            throw error;
          }
          if (entry) markWriteDispatched();
          return { headers: authHeaders(sent) };
        },
      });
    } catch {
      if (guardError) throw guardError;
      if (entry?.signal?.aborted) throw cancelledError();
      currentSession(generation);
      throw authError('Trakt request failed; check your connection.');
    }
    const latest = currentSession(generation);
    if (response.status === 401) {
      // og owns renewal. Retry only if og has already rotated the token for this session.
      if (retriedToken || latest.accessToken === sent.accessToken) throw expiredSessionError();
      retriedToken = true;
      continue;
    }
    if (response.status === 429 && entry && retryRateLimitedWrite(response.headers, generation, rateRetries)) {
      rateRetries += 1;
      continue;
    }
    return parseAuthenticatedResponse(response, metadata);
  }
}
