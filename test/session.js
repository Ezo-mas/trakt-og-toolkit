import { OG_SESSION_CLIENT_ID, ogSessionKey } from '../src/core/og-session.js';

export const OG_SESSION_KEY = ogSessionKey(OG_SESSION_CLIENT_ID);

export function setOgSession(storage, { access = 'access', account = 1, expires = Date.now() + 3600000 } = {}) {
  storage.setItem(OG_SESSION_KEY, JSON.stringify({
    access_token: access, profile: { ids: { trakt: account } }, expires_at: Math.floor(expires / 1000),
  }));
}

/** Simulate the storage notification delivered to an already-open tab. */
export function changeOgSession(window, session) {
  const storage = window.localStorage;
  const oldValue = storage.getItem(OG_SESSION_KEY);
  if (session) setOgSession(storage, session);
  else storage.removeItem(OG_SESSION_KEY);
  window.dispatchEvent(new window.StorageEvent('storage', {
    key: OG_SESSION_KEY, oldValue, newValue: storage.getItem(OG_SESSION_KEY), storageArea: storage,
  }));
}
