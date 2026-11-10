/** Trakt API client. Public cached GETs, uncached authenticated requests and one shared write queue. */
import {
  authError, readTokens, refreshTokens, privateRequest, clearTokens, getSessionGeneration,
} from './oauth.js';
import { API, CACHE_TTL } from '../config.js';
import { getJSON, headerValue, MAX_RETRY_WAIT_MS } from './http.js';
import { getClientId } from '../settings.js';
import { readOgSession } from './og-session.js';

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

/** og owns its own renewal; a rejected or expired token only ever asks for a reload. */
function ogSessionExpiredError() {
  const error = authError('Your og.trakt.tv session expired; reload the page to renew it.', 401);
  error.ogSession = true;
  // This can be thrown from beforeSend after an HTTP slot is acquired; keep the reload message.
  error.control = true;
  return error;
}

/** og's token, read fresh each time because og rotates it on its own schedule. */
function ogAuth() {
  const session = readOgSession();
  return session ? {
    kind: 'og', clientId: session.clientId, accessToken: session.accessToken,
    expiresAt: session.expiresAt, accountKey: session.accountKey,
  } : null;
}

/** The toolkit's own sign-in wins when present; og's session is the automatic fallback. */
function currentAuth() {
  const tokens = readTokens();
  if (tokens) return {
    kind: 'own', clientId: tokens.client_id, accessToken: tokens.access_token,
    expiresAt: tokens.expires_at, accountKey: null,
  };
  return ogAuth();
}

/**
 * Freeze the live session's version before a request. og's revision only advances when its entry
 * is read, so read it first; otherwise the first request after a same-tab account switch captures
 * the old version and then rejects its own new session as a replacement.
 */
function observedGeneration() {
  currentAuth();
  return getSessionGeneration();
}

/** A toolkit refresh changes its token but not the session; an og account change is different. */
function sameAuth(a, b) {
  return Boolean(a && b) && a.kind === b.kind && a.clientId === b.clientId && a.accountKey === b.accountKey;
}

function assertOgFresh(auth) {
  if (auth.kind === 'og' && auth.expiresAt != null && auth.expiresAt <= Date.now()) throw ogSessionExpiredError();
  return auth;
}

function apiHeaders(clientId, accessToken = null) {
  const headers = {
    'Content-Type': 'application/json', 'trakt-api-version': API.version, 'trakt-api-key': clientId,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function authHeaders(auth) {
  return apiHeaders(auth.clientId, auth.accessToken);
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
  // Read the account before capturing its version: observing a new og session can itself advance it.
  const source = currentAuth();
  const generation = getSessionGeneration();
  return {
    signal,
    generation,
    check() {
      if (signal?.aborted) throw cancelledError();
      if (active && active() === false) throw cancelledError();
      if (generation !== getSessionGeneration()) throw signedOutError();
      const now = currentAuth();
      if (!now || !source) throw signedOutError();
      if (!sameAuth(now, source)) throw sessionChangedError();
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

/**
 * Read the credential at send time. The toolkit's own token is refreshed outside the write
 * queue when near expiry; og's token is never refreshed, because og rotates its refresh token.
 */
async function ensureAuth() {
  const tokens = readTokens();
  if (tokens) {
    const next = tokens.expires_at <= Date.now() + 60000 ? await refreshTokens() : tokens;
    return { kind: 'own', clientId: next.client_id, accessToken: next.access_token, accountKey: null };
  }
  const og = ogAuth();
  if (!og) throw signedOutError();
  return assertOgFresh(og);
}

/**
 * Public metadata through og's approved session. The response is still public data, so the
 * existing URL cache is safe. A 401 retries once only when og rotated the token for the same account.
 */
async function ogGet(path, ttl) {
  const first = ogAuth();
  if (!first) throw new MissingClientIdError();
  // An expired og token cannot authorize even a public lookup. Degrade like a missing client
  // ID so callers keep their setup/fallback path instead of showing og's reload message.
  if (first.expiresAt != null && first.expiresAt <= Date.now()) throw new MissingClientIdError();
  const url = `${API.base}${path}`;
  try {
    return await getJSON(url, { ttl, headers: authHeaders(first) });
  } catch (error) {
    if (error?.status !== 401) throw error;
    const latest = ogAuth();
    // No entry at all means there is no client ID to fall back to. An entry whose clock has
    // passed is a stale tab, which callers already handle as missing setup rather than reload.
    if (!latest || (latest.expiresAt != null && latest.expiresAt <= Date.now())) throw new MissingClientIdError();
    if (!sameAuth(latest, first)) throw sessionChangedError();
    // Rejected before its expiry: og's session was revoked, and only a reload can renew it.
    if (latest.accessToken === first.accessToken) throw ogSessionExpiredError();
    try {
      return await getJSON(url, { ttl, headers: authHeaders(latest) });
    } catch (retryError) {
      if (retryError?.status === 401) throw ogSessionExpiredError();
      throw retryError;
    }
  }
}

/** GET a public Trakt API path (e.g. `/shows/1388/seasons`), cached for `ttl` ms. */
export function apiGet(path, { ttl = CACHE_TTL } = {}) {
  const clientId = getClientId();
  if (clientId) return getJSON(`${API.base}${path}`, { ttl, headers: apiHeaders(clientId) });
  return ogGet(path, ttl);
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
  // A response belongs to the session that started the request. Capture the origin before any
  // await: ensureAuth() can refresh tokens or observe a session change while it runs, and that
  // replacement must not be adopted as the origin. A late 401 must never refresh or clear a
  // replacement session's tokens.
  const origin = entry?.generation ?? observedGeneration();
  const checkOrigin = () => {
    if (getSessionGeneration() === origin) return;
    if (entry) entry.check();
    throw sessionChangedError();
  };
  let refreshed = false;
  let renewed = false;
  let rateRetries = 0;
  for (;;) {
    checkOrigin();
    if (entry) await waitForTurn(entry);
    const auth = await ensureAuth();
    if (entry) entry.check();
    checkOrigin();
    if (!sameAuth(currentAuth(), auth)) throw sessionChangedError();
    let response;
    let sent = auth;
    try {
      response = await privateRequest(url, {
        method,
        headers: authHeaders(auth),
        body: body == null ? null : JSON.stringify(body),
        signal: entry?.signal ?? undefined,
        ...(entry ? {
          beforeSend() {
            // This runs after the HTTP concurrency slot is acquired, immediately before the send.
            // Sign-out or teardown while waiting for that slot must prevent the old write.
            entry.check();
            const current = currentAuth();
            if (!current) throw signedOutError();
            assertOgFresh(current);
            entry.check();
            sent = current;
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
      if (sent.kind === 'og') {
        // Never refresh og's token: a second refresher would strand og's session. If og has
        // already rotated it for this account (in another tab, or on its own), retry once with
        // the new token; otherwise ask the user to reload so og can renew it. A different
        // account is a replacement, never a renewal, and must not receive old work.
        if (renewed) throw ogSessionExpiredError();
        const latest = ogAuth();
        if (!latest) throw ogSessionExpiredError();
        if (!sameAuth(latest, sent)) throw sessionChangedError();
        assertOgFresh(latest);
        if (latest.accessToken === sent.accessToken) throw ogSessionExpiredError();
        renewed = true;
        continue;
      }
      if (refreshed) {
        clearTokens();
        throw authError('Trakt session expired; sign in again.', 401);
      }
      // Compare with the token that was actually dispatched: another request may have refreshed
      // tokens while this one waited for an HTTP slot, after the earlier snapshot was read.
      const latest = readTokens();
      if (!latest) throw signedOutError();
      if (latest.access_token === sent.accessToken) await refreshTokens();
      refreshed = true;
      continue;
    }
    // A response belongs to the account that sent it. An og account switch during the request
    // must not return the old account's data or success to the replacement session's UI.
    checkOrigin();
    if (!sameAuth(currentAuth(), sent)) throw sessionChangedError();
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
