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

let watchedAccount;
let watchingAccounts = false;
let accountRevision = 0;

/** Monotonic on observed og login, logout and account replacement; never on token renewal. */
export function getOgSessionRevision() {
  return accountRevision;
}

/**
 * A changed account invalidates reads, writes and in-memory personal caches; a rotated
 * token or expiry for the same account does not. The first read only establishes a baseline.
 */
function noteAccount(accountKey) {
  const next = accountKey ?? null;
  if (!watchingAccounts) {
    watchingAccounts = true;
    watchedAccount = next;
    return;
  }
  if (next === watchedAccount) return;
  watchedAccount = next;
  accountRevision += 1;
  if (typeof document !== 'undefined' && typeof Event === 'function') {
    document.dispatchEvent(new Event('ogt:authchange'));
  }
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

function pageStorage() {
  // `unsafeWindow` is the page itself; the fallback covers manager sandboxes and tests.
  const scope = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
  try { return scope.localStorage ?? null; } catch { return null; }
}

/**
 * The current og session, or null. Read on every call because og may rotate its access
 * token; this function never writes anything back. Only og's current client key is read:
 * an entry left behind by an older client is ignored rather than guessed by expiry.
 */
export function readOgSession() {
  const storage = pageStorage();
  if (!storage) {
    noteAccount(null);
    return null;
  }
  let session = null;
  try {
    session = parseOgSession(storage.getItem(ogSessionKey(OG_SESSION_CLIENT_ID)), OG_SESSION_CLIENT_ID);
  } catch {
    // Local storage can be unavailable or change while reading; treat that as signed out.
    session = null;
  }
  noteAccount(session?.accountKey);
  return session;
}

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  const storage = pageStorage();
  if (!storage || event.storageArea !== storage) return;
  const key = ogSessionKey(OG_SESSION_CLIENT_ID);
  if (event.key !== null && event.key !== key) return;
  if (!watchingAccounts && event.key !== null) {
    noteAccount(parseOgSession(event.oldValue, OG_SESSION_CLIENT_ID)?.accountKey);
  }
  // Notifications may arrive after a quick logout/login; reading storage here would miss the gap.
  noteAccount(event.key === null ? null : parseOgSession(event.newValue, OG_SESSION_CLIENT_ID)?.accountKey);
});
