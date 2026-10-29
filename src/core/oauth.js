/** Device OAuth. Never expose raw responses or credentials in errors/logs. */
import { request, HttpError } from './http.js';
import { getClientId } from '../settings.js';
import { STORAGE, getPrivateValue, setPrivateValue, removePrivateValue } from './store.js';

const AUTH = 'https://auth.trakt.tv';
let generation = 0;
let refreshFlight = null;
let device = null;

export const DEVICE_MESSAGES = {
  400: 'Waiting for Trakt authorization.',
  404: 'Invalid device code; start sign-in again.',
  409: 'Device code already used; start sign-in again.',
  410: 'Device code expired; start sign-in again.',
  418: 'Trakt authorization denied.',
  429: 'Polling slowed down; waiting before trying again.',
};

export function authError(message, status = 0) {
  // Do not attach response bodies, requests, headers, causes, or tokens.
  return new HttpError(message, status, null);
}

export async function privateRequest(url, options = {}) {
  try {
    const r = await request({ ...options, url, retries: 0 });
    return r;
  } catch {
    throw authError('Trakt request failed; check your connection.');
  }
}

function headers() {
  return { 'Content-Type': 'application/json' };
}
function post(path, body, signal) {
  return privateRequest(`${AUTH}/oauth${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal });
}
export function readTokens() {
  const t = getPrivateValue(STORAGE.tokens);
  return t?.client_id === getClientId() ? t : null;
}
export function isSignedIn() {
  const t = readTokens();
  return Boolean(t?.access_token && t?.refresh_token);
}
function saveTokens(text, clientId) {
  let t;
  try { t = JSON.parse(text); } catch { /* sanitized below */ }
  if (!t || typeof t.access_token !== 'string' || !t.access_token ||
      typeof t.refresh_token !== 'string' || !t.refresh_token ||
      !Number.isFinite(t.expires_in) || t.expires_in <= 0 ||
      (t.created_at != null && !Number.isFinite(t.created_at))) {
    throw authError('Trakt returned invalid token data; sign in again.');
  }
  const tokens = {
    access_token: t.access_token, refresh_token: t.refresh_token, client_id: clientId,
    expires_at: (t.created_at == null ? Date.now() : t.created_at * 1000) + t.expires_in * 1000,
  };
  setPrivateValue(STORAGE.tokens, tokens);
  return tokens;
}
export function clearTokens() {
  generation += 1;
  removePrivateValue(STORAGE.tokens);
  if (typeof document !== 'undefined') document.dispatchEvent(new Event('ogt:authchange'));
}

/** One rotating refresh token may be consumed only once, even with concurrent 401s. */
export function refreshTokens() {
  if (refreshFlight) return refreshFlight;
  const epoch = generation;
  const t = readTokens();
  if (!t) return Promise.reject(authError('Signed out; sign in to Trakt.'));
  refreshFlight = (async () => {
    try {
      const r = await post('/token', {
        client_id: t.client_id, refresh_token: t.refresh_token, grant_type: 'refresh_token',
        redirect_uri: getPrivateValue(STORAGE.redirectUri),
      });
      if (epoch !== generation || getClientId() !== t.client_id) {
        // A sign-out during refresh must also revoke the newly rotated token.
        if (r.status === 200) {
          try {
            const rotated = JSON.parse(r.text);
            const revoked = await post('/revoke', { token: rotated.access_token, client_id: t.client_id });
            if (revoked.status !== 200 && revoked.status !== 204) throw authError('Revocation failed.');
          } catch { throw authError('Signed out locally; token revocation failed.', 502); }
        }
        throw authError('Signed out; sign in to Trakt.');
      }
      if (r.status !== 200) throw authError('Trakt session expired; sign in again.', r.status);
      return saveTokens(r.text, t.client_id);
    } catch (error) {
      if (epoch !== generation) {
        if (error?.status === 502) throw authError('Signed out locally; token revocation failed.', 502);
        throw authError('Trakt session expired; sign in again.');
      }
      if (error?.status === 400 || error?.status === 401) {
        clearTokens();
        throw authError('Trakt session expired; sign in again.', error.status);
      }
      // Network failures, rate limits and server errors do not reject the grant.
      // Retain the session so a later action can retry the refresh.
      throw authError('Could not refresh your Trakt session; try again.', error?.status || 0);
    } finally { refreshFlight = null; }
  })();
  return refreshFlight;
}

export function cancelSignIn() {
  device?.abort();
}
function wait(ms, signal) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    if (signal.aborted) done();
  });
}

/** Sequential polling, no transport retries: 429 belongs to this state machine. */
export async function signIn({ onCode = () => {}, onMessage = () => {} } = {}) {
  let lastMessage;
  const emit = (message) => {
    if (message === lastMessage) return;
    lastMessage = message;
    onMessage(message);
  };
  cancelSignIn();
  const controller = new AbortController();
  device = controller;
  const { signal } = controller;
  const epoch = generation;
  const clientId = getClientId();
  const current = () => !signal.aborted && epoch === generation && clientId === getClientId();
  try {
    if (!clientId) throw authError('Set your Trakt client ID first.');
    // Fail before making a request if secure storage is unavailable.
    setPrivateValue(STORAGE.redirectUri, getPrivateValue(STORAGE.redirectUri));
    const started = Date.now();
    const r = await post('/device/code', { client_id: clientId }, signal);
    if (!current()) return;
    if (r.status !== 200) throw authError('Could not start Trakt sign-in.', r.status);
    let code;
    try { code = JSON.parse(r.text); } catch { /* sanitized below */ }
    if (!code?.device_code || typeof code.user_code !== 'string' ||
        !/^https:\/\/(auth\.)?trakt\.tv\//.test(code.verification_url) ||
        !Number.isFinite(code.interval) || code.interval <= 0 ||
        !Number.isFinite(code.expires_in) || code.expires_in <= 0) throw authError('Invalid Trakt device response.');
    const deadline = started + code.expires_in * 1000;
    let interval = code.interval * 1000;
    onCode({ user_code: code.user_code, verification_url: code.verification_url });
    while (current()) {
      await wait(Math.min(interval, Math.max(0, deadline - Date.now())), signal);
      if (!current()) return;
      if (Date.now() >= deadline) { emit(DEVICE_MESSAGES[410]); return; }
      const result = await post('/device/token', { code: code.device_code, client_id: clientId }, signal);
      if (!current()) return;
      if (Date.now() >= deadline) { emit(DEVICE_MESSAGES[410]); return; }
      if (result.status === 200) {
        saveTokens(result.text, clientId);
        if (typeof document !== 'undefined') document.dispatchEvent(new Event('ogt:authchange'));
        emit('Signed in to Trakt.');
        return;
      }
      emit(DEVICE_MESSAGES[result.status] || 'Trakt sign-in failed; start again.');
      if (result.status === 429) interval += 5000;
      else if (result.status !== 400) return;
    }
  } catch {
    if (current()) emit('Trakt sign-in failed; check your client ID and connection.');
  } finally {
    if (signal.aborted) emit('Trakt sign-in cancelled.');
    if (device === controller) device = null;
  }
}

export async function signOut() {
  cancelSignIn();
  // Wait for a rotating refresh so its new token is revoked too.
  const pending = refreshFlight;
  const old = getPrivateValue(STORAGE.tokens);
  clearTokens();
  let refreshed;
  let rotationRevokeFailed = false;
  if (pending) {
    try { refreshed = await pending; }
    catch (error) { rotationRevokeFailed = error?.status === 502; }
  }
  const token = refreshed || old;
  try {
    if (token) {
      const r = await post('/revoke', { token: token.access_token, client_id: token.client_id });
      if (r.status !== 200 && r.status !== 204) throw authError('Signed out locally; Trakt revocation failed.');
    }
    if (rotationRevokeFailed) throw authError('Signed out locally; Trakt revocation failed.');
  } catch { throw authError('Signed out locally; revoke this app in Trakt settings if needed.'); }
}
