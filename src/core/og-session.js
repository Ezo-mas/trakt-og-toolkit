/**
 * og's own Trakt session, read in place from the page's localStorage.
 *
 * Trakt allows the toolkit to call the API with og's session. og owns that session:
 * the access token is never refreshed here, copied into userscript storage, or logged.
 * oidc-client-ts stores it as `oidc.user:https://auth.trakt.tv:<client_id>`.
 */
export const OG_SESSION_AUTHORITY = 'https://auth.trakt.tv';
/** og's public client ID, checked against its live user manager by `npm run drift`. */
export const OG_SESSION_CLIENT_ID = 'WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI';
export const OG_SESSION_PREFIX = 'oidc.user:';
const OG_SESSION_KEY_PREFIX = `${OG_SESSION_PREFIX}${OG_SESSION_AUTHORITY}:`;
export const OG_SESSION_CHANGE_EVENT = 'ogt:authchange';

let watchedAccount;
let watchedRaw;
let watchingAccounts = false;
let accountRevision = 0;
let cachedRaw;
let cachedSession;
let authChangeScheduled = false;

/** Monotonic on observed og login, logout and account replacement; never on token renewal. */
export function getOgSessionRevision() {
  return accountRevision;
}

/**
 * og's session is observed from `isSignedIn()` inside a feature's `match()` during the host's
 * sync loop. Dispatching synchronously there would re-enter the host mid-iteration, so notify
 * on a microtask instead; several transitions in one tick settle into one host remount.
 */
function scheduleAuthChange() {
  if (authChangeScheduled || typeof document === 'undefined' || typeof Event !== 'function') return;
  authChangeScheduled = true;
  queueMicrotask(() => {
    authChangeScheduled = false;
    document.dispatchEvent(new Event(OG_SESSION_CHANGE_EVENT));
  });
}

/**
 * Record one observed entry. The raw value is kept alongside the account key so delayed
 * cross-tab notifications can be ordered against what this tab has already read.
 */
function observe(raw, accountKey) {
  watchedRaw = raw;
  const next = accountKey ?? null;
  if (!watchingAccounts) {
    watchingAccounts = true;
    watchedAccount = next;
    return;
  }
  if (next === watchedAccount) return;
  watchedAccount = next;
  accountRevision += 1;
  scheduleAuthChange();
}

/** The exact localStorage key og's user manager writes for a client ID. */
export function ogSessionKey(clientId) {
  return `${OG_SESSION_KEY_PREFIX}${clientId}`;
}

/** The client ID encoded in an og user key, or null for every other key. */
export function ogClientIdFromKey(key) {
  if (typeof key !== 'string' || !key.startsWith(OG_SESSION_KEY_PREFIX)) return null;
  const clientId = key.slice(OG_SESSION_KEY_PREFIX.length);
  // Trakt client IDs are public, URL-safe identifiers; reject stray separators.
  return /^[A-Za-z0-9_-]{8,200}$/.test(clientId) ? clientId : null;
}

/**
 * A stable, non-secret account identity used to tell an account replacement apart from a
 * token renewal. Only this key leaves the parser; the profile itself is not returned.
 */
function accountKey(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const id = profile.ids?.trakt;
  if (Number.isSafeInteger(id) && id > 0) return `trakt:${id}`;
  const sub = profile.sub;
  if ((typeof sub === 'string' && sub) || Number.isSafeInteger(sub)) return `sub:${sub}`;
  if (typeof profile.username === 'string' && profile.username) return `user:${profile.username.toLowerCase()}`;
  return null;
}

/**
 * Parse one oidc-client-ts user entry. Only the access token, its metadata and an opaque
 * account key are returned; the refresh token and ID token stay unread, and the profile is
 * touched only to derive that key.
 */
export function parseOgSession(raw, clientId) {
  if (typeof raw !== 'string' || !raw) return null;
  let user;
  try { user = JSON.parse(raw); } catch { return null; }
  if (!user || typeof user.access_token !== 'string' || !user.access_token) return null;
  if (user.token_type != null && String(user.token_type).toLowerCase() !== 'bearer') return null;
  const key = accountKey(user.profile);
  // Without an account key an account swap cannot be detected, so this session is not safe to use.
  if (!key) return null;
  const expiresAt = Number.isFinite(user.expires_at) ? user.expires_at * 1000 : null;
  return { clientId, accessToken: user.access_token, expiresAt, accountKey: key };
}

/** `isSignedIn()` runs from every match() and per-row alive() check; don't reparse the same entry. */
function parseCached(raw) {
  if (raw == null) return null;
  if (cachedRaw === raw) return cachedSession;
  cachedRaw = raw;
  cachedSession = parseOgSession(raw, OG_SESSION_CLIENT_ID);
  return cachedSession;
}

function pageStorage() {
  // `unsafeWindow` is the page itself; the fallback covers manager sandboxes and tests.
  const scope = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
  try { return scope.localStorage ?? null; } catch { return null; }
}

/**
 * Firefox and Violentmonkey can hand out different Xray wrappers for the same Storage, so
 * object identity alone must not reject an event. Compare the pinned entry both areas expose.
 */
function sameStorageArea(area, storage) {
  if (!area) return true;
  try {
    if (area === storage) return true;
    const key = ogSessionKey(OG_SESSION_CLIENT_ID);
    return area.getItem(key) === storage.getItem(key);
  } catch {
    return false;
  }
}

/**
 * The current og session, or null. Read on every call because og may rotate its access
 * token; this function never writes anything back. Only og's current client key is read:
 * an entry left behind by an older client is ignored rather than guessed by expiry.
 */
export function readOgSession() {
  const storage = pageStorage();
  if (!storage) {
    observe(null, null);
    return null;
  }
  let raw = null;
  try {
    raw = storage.getItem(ogSessionKey(OG_SESSION_CLIENT_ID));
  } catch {
    // Local storage can be unavailable or change while reading; treat that as signed out.
    raw = null;
  }
  const session = parseCached(raw);
  observe(raw, session?.accountKey);
  return session;
}

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  const storage = pageStorage();
  if (!storage || !sameStorageArea(event.storageArea, storage)) return;
  const key = ogSessionKey(OG_SESSION_CLIENT_ID);
  if (event.key !== null && event.key !== key) return;
  let currentRaw = null;
  try { currentRaw = storage.getItem(key); } catch { return; }
  const current = parseCached(currentRaw)?.accountKey ?? null;
  // The first observation only establishes a baseline: no work can predate a session read.
  if (!watchingAccounts) {
    observe(currentRaw, current);
    return;
  }
  if (event.key === null) {
    // A clear carries no old value. Replay it only when storage has moved on since this tab
    // last read; otherwise it describes a state this tab has already moved past.
    if (currentRaw !== watchedRaw) observe(null, null);
    return;
  }
  const nextRaw = event.newValue;
  const next = parseCached(nextRaw)?.accountKey ?? null;
  // Notifications arrive late. One that starts at the observed entry is the next state even
  // when a direct read raced ahead; one that ends at the observed entry is already applied.
  if (event.oldValue === watchedRaw) {
    observe(nextRaw, next);
    return;
  }
  if (nextRaw === watchedRaw) return;
  // A notification storage has not moved past describes what is current now.
  if (nextRaw === currentRaw) {
    observe(currentRaw, current);
    return;
  }
  // Neither endpoint is what this tab observed: a newer read already moved past the
  // notification. Never regress to its older account; reconcile with storage instead.
  if (currentRaw !== watchedRaw) observe(currentRaw, current);
});
