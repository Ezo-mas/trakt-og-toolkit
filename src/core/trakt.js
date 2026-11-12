/** Trakt API client. Public cached GETs, uncached authenticated requests and one shared write queue. */
import {
  authError, readTokens, refreshTokens, privateRequest, clearTokens, getSessionGeneration,
} from './oauth.js';
import { API, CACHE_TTL } from '../config.js';
import { getJSON, getJSONWithHeaders, headerValue } from './http.js';
import { getClientId } from '../settings.js';
import { readOgSession } from './og-session.js';
import { cancelledError, enqueueWrite, markWriteDispatched, retryRateLimitedWrite, waitForTurn } from './write-queue.js';

export class MissingClientIdError extends Error {
  constructor() {
    super('No Trakt API client ID configured');
    this.name = 'MissingClientIdError';
  }
}

export function listReadFailureHint(error, target, action) {
  if (error?.ogSession) return error.message || 'Your og.trakt.tv session expired; reload the page to renew it.';
  if (error instanceof MissingClientIdError) {
    return `Sign in to og.trakt.tv or set a Trakt client ID to ${action} this ${target}.`;
  }
  if (error?.status === 403 || error?.status === 404) return `This ${target} is private or unavailable.`;
  if (error?.status === 401) return `Sign in to Trakt to ${action} this ${target}.`;
  return `Could not read this ${target}. Try again later.`;
}

function signedOutError() {
  const error = authError('Signed out; sign in to Trakt.');
  error.control = true;
  return error;
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

/**
 * og's entry exists but can no longer authorize a public lookup. It is still a missing client ID, so
 * metadata fallbacks keep working, but it carries og's reload message: an action whose first step is
 * a lookup must tell the user to reload, not to set up a client ID they never needed.
 */
function ogLookupExpiredError() {
  const error = new MissingClientIdError();
  error.message = 'Your og.trakt.tv session expired; reload the page to renew it.';
  error.ogSession = true;
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

/** The per-sign-in id tells a refresh (kept) from another tab's sign-in to a different account. */
function ownAuth(tokens) {
  return {
    kind: 'own', clientId: tokens.client_id, accessToken: tokens.access_token,
    expiresAt: tokens.expires_at, accountKey: tokens.session_id ?? null,
  };
}

/** The toolkit's own sign-in wins when present; og's session is the automatic fallback. */
function currentAuth() {
  const tokens = readTokens();
  if (tokens) return ownAuth(tokens);
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

/** A toolkit refresh changes its token but not the session; a new sign-in or og account is different. */
function sameAuth(a, b) {
  return Boolean(a && b) && a.kind === b.kind && a.clientId === b.clientId && a.accountKey === b.accountKey;
}

function assertOgFresh(auth) {
  if (auth.kind === 'og' && auth.expiresAt != null && auth.expiresAt <= Date.now()) throw ogSessionExpiredError();
  return auth;
}

function assertOgLookupFresh(auth) {
  if (!auth) throw new MissingClientIdError();
  if (auth.expiresAt != null && auth.expiresAt <= Date.now()) throw ogLookupExpiredError();
}

/** og owns renewal. A 401 can only retry an already-rotated token for the same account. */
function og401Retry(sent, { lookup = false, retried = false } = {}) {
  if (retried) throw ogSessionExpiredError();
  const latest = ogAuth();
  // Public lookups keep their missing/expired-client fallback even after a switch to an expired entry.
  if (lookup) assertOgLookupFresh(latest);
  else if (!latest) throw ogSessionExpiredError();
  if (!sameAuth(latest, sent)) throw sessionChangedError();
  if (!lookup) assertOgFresh(latest);
  if (latest.accessToken === sent.accessToken) {
    throw lookup ? ogLookupExpiredError() : ogSessionExpiredError();
  }
  return latest;
}

function own401Action(sent, retried) {
  if (retried) return 'clear';
  const latest = readTokens();
  if (!latest) throw signedOutError();
  // Compare against the token dispatched after the HTTP-slot wait.
  return latest.access_token === sent.accessToken ? 'refresh' : 'retry';
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

/**
 * Read the credential before acquiring a transport slot. The toolkit can refresh its own token
 * when near expiry. og rotates its refresh token, so the toolkit leaves that renewal to og.
 */
async function ensureAuth() {
  const tokens = readTokens();
  if (tokens) {
    const next = tokens.expires_at <= Date.now() + 60000 ? await refreshTokens() : tokens;
    return ownAuth(next);
  }
  const og = ogAuth();
  if (!og) throw signedOutError();
  return assertOgFresh(og);
}

/**
 * Public metadata through og's approved session. The response is still public data, so the
 * existing URL cache is safe. A 401 retries once only when og rotated the token for the same account.
 * `withHeaders` skips the cache so paginated reads can see the page count.
 */
async function ogGet(path, ttl, withHeaders = false) {
  const first = ogAuth();
  assertOgLookupFresh(first);
  const url = `${API.base}${path}`;
  const read = (auth) => (withHeaders
    ? getJSONWithHeaders(url, { headers: authHeaders(auth) })
    : getJSON(url, { ttl, headers: authHeaders(auth) }));
  try {
    return await read(first);
  } catch (error) {
    if (error?.status !== 401) throw error;
    const latest = og401Retry(first, { lookup: true });
    try {
      return await read(latest);
    } catch (retryError) {
      if (retryError?.status === 401) throw ogLookupExpiredError();
      throw retryError;
    }
  }
}

function paginationPages(headers) {
  const raw = headerValue(headers, 'x-pagination-page-count');
  if (raw == null || raw === '') return null;
  const pages = Number(raw);
  return Number.isSafeInteger(pages) && pages >= 0 ? pages : null;
}

/**
 * GET a public Trakt API path (e.g. `/shows/1388/seasons`), cached for `ttl` ms. With `withHeaders`,
 * bypasses the cache and returns `{ data, pages }` so page walks can trust Trakt's page count.
 */
export async function apiGet(path, { ttl = CACHE_TTL, withHeaders = false } = {}) {
  const clientId = getClientId();
  if (clientId) {
    if (!withHeaders) return getJSON(`${API.base}${path}`, { ttl, headers: apiHeaders(clientId) });
    const { data, headers } = await getJSONWithHeaders(`${API.base}${path}`, { headers: apiHeaders(clientId) });
    return { data, pages: paginationPages(headers) };
  }
  if (!withHeaders) return ogGet(path, ttl);
  const { data, headers } = await ogGet(path, ttl, true);
  return { data, pages: paginationPages(headers) };
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
  if (method === 'GET') return sendAuthenticated(method, url, body, metadata, null);

  const entry = createWriteEntry(control);
  entry.check();
  return enqueueWrite(entry, () => sendAuthenticated(method, url, body, metadata, entry));
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
  let retriedOwn = false;
  let retriedOg = false;
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
            markWriteDispatched();
            return { headers: authHeaders(current) };
          },
        } : {}),
      });
    } catch (error) {
      if (entry?.signal?.aborted) throw cancelledError();
      throw error;
    }
    checkOrigin();
    if (response.status === 401 && sent.kind === 'og') {
      og401Retry(sent, { retried: retriedOg });
      retriedOg = true;
      continue;
    }
    if (response.status === 401) {
      const action = own401Action(sent, retriedOwn);
      if (action === 'clear') {
        clearTokens();
        throw authError('Trakt session expired; sign in again.', 401);
      }
      if (action === 'refresh') await refreshTokens();
      retriedOwn = true;
      continue;
    }
    // A response belongs to the account that sent it. An og account switch during the request
    // must not return the old account's data or success to the replacement session's UI.
    if (!sameAuth(currentAuth(), sent)) throw sessionChangedError();
    if (response.status === 429 && entry && retryRateLimitedWrite(response.headers, entry.generation, rateRetries)) {
      rateRetries += 1;
      continue;
    }
    return parseAuthenticatedResponse(response, metadata);
  }
}

export { isSignedIn } from './oauth.js';
