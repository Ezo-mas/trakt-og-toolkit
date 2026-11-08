/** Trakt API client. Public cached GETs, uncached authenticated requests and one shared write queue. */
import {
  authError, readTokens, refreshTokens, privateRequest, clearTokens, getSessionGeneration,
} from './oauth.js';
import { API, CACHE_TTL } from '../config.js';
import { getJSON, headerValue, MAX_RETRY_WAIT_MS } from './http.js';
import { getClientId } from '../settings.js';

export class MissingClientIdError extends Error {
  constructor() {
    super('No Trakt API client ID configured');
    this.name = 'MissingClientIdError';
  }
}

/**
 * Trakt's current standard-app limit for authenticated writes is one POST/PUT/DELETE per second
 * (https://developer.trakt.tv/docs/rate-limiting, checked 2026-11-07). One shared FIFO queue sends
 * those requests serially and spaces actual dispatches by at least this interval.
 */
const WRITE_INTERVAL_MS = 1000;
/** Only a 429 establishes that a write was rejected before being processed; retry those a few times. */
const WRITE_RETRIES = 2;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30000;
/** Long Retry-After waits are sliced so cancellation and sign-out are noticed without shortening them. */
const WAIT_SLICE_MS = 250;

let writeTail = Promise.resolve();
let nextWriteAt = 0;
let blockedUntil = 0;
let blockedGeneration = null;

function cancelledError() {
  const error = authError('Trakt request cancelled.', 0);
  error.control = true;
  return error;
}

function signedOutError() {
  const error = authError('Signed out; sign in to Trakt.');
  error.control = true;
  return error;
}

/** A Retry-After too long to wait through with a button busy; callers show their 429 message. */
function rateLimitedError() {
  return authError('Trakt rate limited this request; try again later.', 429);
}

function sessionChangedError() {
  return authError('Trakt session changed; request abandoned.');
}

/** Abortable sleep. Timers are read from the global scope so tests can mock them. */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(cancelledError()); return; }
    const done = () => { cleanup(); resolve(); };
    const abort = () => { cleanup(); reject(cancelledError()); };
    const timer = setTimeout(done, Math.max(0, ms));
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** Full seconds when Trakt sends Retry-After, otherwise bounded exponential backoff with jitter. */
function retryDelay(headers, attempt) {
  const raw = headerValue(headers, 'retry-after');
  if (raw != null && raw !== '') {
    const retryAfter = Number(raw);
    if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  }
  const base = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
  return Math.round(base * (0.5 + Math.random()));
}

/**
 * A queued write remembers which signed-in session and operation queued it. Immediately before
 * each send it checks the session, the caller's guard and optional abort signal again, so
 * sign-out, an account change or page teardown cannot let old work through.
 */
function createWriteEntry(control = {}) {
  const signal = control.signal ?? null;
  const active = typeof control.active === 'function' ? control.active : null;
  const generation = getSessionGeneration();
  const clientId = getClientId();
  const current = () => generation === getSessionGeneration() && clientId === getClientId() && Boolean(readTokens());
  return {
    signal,
    generation,
    check() {
      if (signal?.aborted) throw cancelledError();
      if (active && active() === false) throw cancelledError();
      if (!current()) throw signedOutError();
    },
  };
}

/** FIFO: one queued write runs at a time; a rejection never blocks later writes. */
function enqueueWrite(entry, task) {
  const queued = writeTail.then(() => {
    entry.check();
    return task();
  });
  writeTail = queued.then(() => {}, () => {});
  return queued;
}

/** Wait for the one-second write pacing slot and any account-wide Retry-After block. */
async function waitForTurn(entry) {
  for (;;) {
    entry.check();
    const blocked = blockedGeneration === entry.generation ? blockedUntil : 0;
    // Fail fast rather than leave a queued action spinning for minutes; the block itself stays.
    if (blocked - Date.now() > MAX_RETRY_WAIT_MS) throw rateLimitedError();
    const remaining = Math.max(nextWriteAt, blocked) - Date.now();
    if (remaining <= 0) return;
    await sleep(Math.min(remaining, WAIT_SLICE_MS), entry.signal);
  }
}

function blockWrites(ms, generation) {
  const until = Date.now() + ms;
  if (blockedGeneration === generation) blockedUntil = Math.max(blockedUntil, until);
  else { blockedGeneration = generation; blockedUntil = until; }
}

/** Read the token at send time, refreshing it (outside the write queue) only when it is near expiry. */
async function ensureTokens() {
  let tokens = readTokens();
  if (!tokens) throw signedOutError();
  if (tokens.expires_at <= Date.now() + 60000) tokens = await refreshTokens();
  return tokens;
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


/**
 * Authenticated requests never enter the public response cache. POST/PUT/DELETE go through the
 * shared write queue; GET keeps its previous concurrency and caching behaviour. `control.signal`
 * can cancel a queued write before dispatch (or abort its in-flight request).
 */
export function apiAuth(method, path, body, options = {}, control = {}) {
  return authenticated(method, path, body, options, false, control);
}
export function apiAuthPage(path, options = {}) {
  return authenticated('GET', path, undefined, options, true, {});
}
async function authenticated(method, path, body, options, metadata, control) {
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
  const url = `${API.base}${requestPath}`;
  const exchange = () => sendAuthenticated(method, url, body, metadata, method === 'GET' ? null : control);
  if (method === 'GET') return exchange();

  const entry = createWriteEntry(control);
  entry.check();
  return enqueueWrite(entry, () => sendAuthenticated(method, url, body, metadata, entry));
}

async function sendAuthenticated(method, url, body, metadata, entry) {
  // A response belongs to the session that started the request. A late 401 must never refresh
  // or clear a replacement session's tokens.
  const origin = entry?.generation ?? getSessionGeneration();
  const checkOrigin = () => {
    if (getSessionGeneration() === origin) return;
    if (entry) entry.check();
    throw sessionChangedError();
  };
  let refreshed = false;
  let rateRetries = 0;
  for (;;) {
    checkOrigin();
    if (entry) await waitForTurn(entry);
    const tokens = await ensureTokens();
    if (entry) entry.check();
    checkOrigin();
    const authHeaders = (current) => ({
      'Content-Type': 'application/json', 'trakt-api-version': API.version,
      'trakt-api-key': current.client_id, Authorization: `Bearer ${current.access_token}`,
    });
    let response;
    let sentTokens = tokens;
    try {
      response = await privateRequest(url, {
        method,
        headers: authHeaders(tokens),
        body: body == null ? null : JSON.stringify(body),
        signal: entry?.signal ?? undefined,
        ...(entry ? {
          beforeSend() {
            // This runs after the HTTP concurrency slot is acquired, immediately before the send.
            // Sign-out or teardown while waiting for that slot must prevent the old write.
            entry.check();
            const current = readTokens();
            if (!current) throw signedOutError();
            entry.check();
            sentTokens = current;
            // Pacing starts at the actual transport dispatch, not while waiting for a slot.
            nextWriteAt = Date.now() + WRITE_INTERVAL_MS;
            return { headers: authHeaders(current) };
          },
        } : {}),
      });
    } catch (error) {
      if (entry?.signal?.aborted) throw cancelledError();
      throw error;
    }
    if (response.status === 401) {
      checkOrigin();
      if (refreshed) {
        clearTokens();
        throw authError('Trakt session expired; sign in again.', 401);
      }
      // Compare with the token that was actually dispatched: another request may have refreshed
      // tokens while this one waited for an HTTP slot, after the earlier snapshot was read.
      const latest = readTokens();
      if (!latest) throw signedOutError();
      if (latest.access_token === sentTokens.access_token) await refreshTokens();
      refreshed = true;
      continue;
    }
    if (response.status === 429 && entry) {
      // Trakt says the request was rejected by the limiter; block every write in this session for
      // the full Retry-After (or the fallback backoff) before retrying it and dispatching others.
      const delay = retryDelay(response.headers, rateRetries);
      blockWrites(delay, entry.generation);
      if (rateRetries < WRITE_RETRIES && delay <= MAX_RETRY_WAIT_MS) {
        rateRetries += 1;
        continue;
      }
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
}

export { isSignedIn } from './oauth.js';
