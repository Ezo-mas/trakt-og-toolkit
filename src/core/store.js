/**
 * Synchronous key/value storage with a persistence fallback.
 *
 * Userscript managers expose GM_getValue/GM_setValue synchronously (Tampermonkey,
 * Violentmonkey, Greasemonkey). When they are missing — e.g. when the bundle is
 * loaded straight into a dev page — we fall back to localStorage.
 */
const NS = 'ogt:';

function gm() {
  if (typeof GM_getValue === 'function' && typeof GM_setValue === 'function') {
    return {
      get: (key, fallback) => GM_getValue(key, fallback),
      set: (key, value) => GM_setValue(key, value),
      remove: (key) => (typeof GM_deleteValue === 'function' ? GM_deleteValue(key) : GM_setValue(key, undefined)),
    };
  }
  return null;
}

const backend = gm();

function localKey(key) {
  return NS + key;
}

export function getValue(key, fallback = null) {
  if (backend) {
    const value = backend.get(key, fallback);
    return value === undefined ? fallback : value;
  }
  try {
    const raw = localStorage.getItem(localKey(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setValue(key, value) {
  if (backend) {
    backend.set(key, value);
    return;
  }
  try {
    localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch {
    /* private mode / quota — settings just won't persist */
  }
}

export function removeValue(key) {
  if (backend) {
    backend.remove(key);
    return;
  }
  try {
    localStorage.removeItem(localKey(key));
  } catch {
    /* ignore */
  }
}

export const STORAGE = {
  clientId: 'trakt.clientId',
  customLinks: 'watch.customLinks',
  debug: 'debug',
  selection: (kind, id) => `selection.${kind}.${id}`,
};
