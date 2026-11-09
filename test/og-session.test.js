import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  map = new Map();
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const { ogSessionKey, ogClientIdFromKey, parseOgSession, readOgSession, getOgSessionRevision,
  OG_SESSION_PREFIX, OG_SESSION_CLIENT_ID } = await import('../src/core/og-session.js');

// The ID here is deliberately independent of the implementation constant.
const OG_CLIENT = 'WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI';
const entry = (overrides = {}) => JSON.stringify({
  access_token: 'PRIVATE_ACCESS', refresh_token: 'PRIVATE_REFRESH', token_type: 'Bearer',
  profile: { ids: { trakt: 42 }, username: 'og-user' },
  expires_at: Math.floor(Date.now() / 1000) + 3600, ...overrides,
});

function reset() {
  globalThis.localStorage = new MemoryStorage();
}

test('builds and parses the oidc-client-ts user key', () => {
  assert.equal(OG_SESSION_CLIENT_ID, OG_CLIENT);
  assert.equal(ogSessionKey(OG_CLIENT), `${OG_SESSION_PREFIX}https://auth.trakt.tv:${OG_CLIENT}`);
  assert.equal(ogClientIdFromKey(ogSessionKey(OG_CLIENT)), OG_CLIENT);
  assert.equal(ogClientIdFromKey('oidc.user:https://classic.trakt.tv:abc12345'), null);
  assert.equal(ogClientIdFromKey('oidc.user:https://auth.trakt.tv:'), null);
  assert.equal(ogClientIdFromKey('oidc.user:https://auth.trakt.tv:short'), null);
  assert.equal(ogClientIdFromKey('ogt:trakt.oauth.tokens'), null);
  assert.equal(ogClientIdFromKey(null), null);
});

test('parses only what an API call needs', () => {
  const session = parseOgSession(entry({ expires_at: 1000 }), OG_CLIENT);
  assert.deepEqual(session, { clientId: OG_CLIENT, accessToken: 'PRIVATE_ACCESS', expiresAt: 1000000,
    accountKey: 'trakt:42' });
  assert.equal('refresh_token' in session, false);
  assert.equal('id_token' in session, false);
  assert.equal('profile' in session, false);
  assert.equal(parseOgSession('not json', OG_CLIENT), null);
  assert.equal(parseOgSession(entry({ token_type: 'mac' }), OG_CLIENT), null);
  assert.equal(parseOgSession(entry({ token_type: undefined }), OG_CLIENT)?.accessToken, 'PRIVATE_ACCESS');
  assert.equal(parseOgSession(entry({ access_token: '' }), OG_CLIENT), null);
  assert.equal(parseOgSession(null, OG_CLIENT), null);
  assert.equal(parseOgSession(entry({ expires_at: 1000 }), OG_CLIENT).expiresAt, 1000000);
  assert.equal(parseOgSession(entry({ expires_at: undefined }), OG_CLIENT).expiresAt, null);
  // An entry without any stable account identity cannot be checked for an account swap.
  assert.equal(parseOgSession(entry({ profile: undefined }), OG_CLIENT), null);
  assert.equal(parseOgSession(entry({ profile: {} }), OG_CLIENT), null);
  assert.equal(parseOgSession(entry({ profile: { sub: 'subject' } }), OG_CLIENT).accountKey, 'sub:subject');
  assert.equal(parseOgSession(entry({ profile: { username: 'WriterFan' } }), OG_CLIENT).accountKey, 'user:writerfan');
});

test('reads the live session from page localStorage without writing anything', () => {
  reset();
  const store = globalThis.localStorage;
  store.setItem('unrelated', 'kept');
  store.setItem(ogSessionKey(OG_CLIENT), entry({ expires_at: 2000 }));
  // A leftover entry from an older client must not win even when it expires later.
  store.setItem(ogSessionKey('oldClientId1234'), entry({ access_token: 'OLD', expires_at: 3000 }));
  store.setItem('oidc.user:https://auth.trakt.tv:broken', '{not json');
  const before = [...store.map.keys()].sort();

  const session = readOgSession();
  assert.deepEqual(session, { clientId: OG_CLIENT, accessToken: 'PRIVATE_ACCESS', expiresAt: 2000000,
    accountKey: 'trakt:42' });
  assert.deepEqual([...store.map.keys()].sort(), before);
  assert.equal(store.getItem('unrelated'), 'kept');
});

test('announces account replacement but not a token renewal', () => {
  reset();
  const store = globalThis.localStorage;
  store.setItem(ogSessionKey(OG_CLIENT), entry({ profile: { ids: { trakt: 1 } } }));
  readOgSession(); // establish the baseline before a document exists
  const revision = getOgSessionRevision();
  const events = [];
  globalThis.document = { dispatchEvent(event) { events.push(event.type); } };
  try {
    store.setItem(ogSessionKey(OG_CLIENT), entry({ access_token: 'RENEWED', profile: { ids: { trakt: 1 } } }));
    assert.equal(readOgSession().accessToken, 'RENEWED');
    assert.equal(getOgSessionRevision(), revision, 'a token renewal is not a session change');
    assert.deepEqual(events, []);
    store.setItem(ogSessionKey(OG_CLIENT), entry({ access_token: 'RENEWED', profile: { ids: { trakt: 2 } } }));
    assert.equal(readOgSession().accountKey, 'trakt:2');
    assert.equal(getOgSessionRevision(), revision + 1);
    assert.deepEqual(events, ['ogt:authchange']);
  } finally {
    delete globalThis.document;
  }
});

test('treats missing, blocked or malformed page storage as signed out', () => {
  globalThis.localStorage = undefined;
  assert.equal(readOgSession(), null);
  globalThis.localStorage = {
    get length() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    getItem() { throw new Error('blocked'); },
  };
  assert.equal(readOgSession(), null);
  globalThis.localStorage = new MemoryStorage();
  assert.equal(readOgSession(), null);
  globalThis.localStorage.setItem(ogSessionKey(OG_CLIENT), entry({ access_token: '' }));
  assert.equal(readOgSession(), null);
});

function storageChange(key, oldValue, newValue, storageArea = globalThis.localStorage) {
  const event = new Event('storage');
  Object.assign(event, { key, oldValue, newValue, storageArea });
  window.dispatchEvent(event);
}

test('storage notifications preserve a rapid logout/login even when storage already holds the new session', () => {
  reset();
  const key = ogSessionKey(OG_CLIENT);
  const original = entry();
  const renewed = entry({ access_token: 'RENEWED' });
  localStorage.setItem(key, original);
  readOgSession();
  const revision = getOgSessionRevision();
  // Both notifications can arrive after the other tab has already signed back in.
  localStorage.setItem(key, renewed);
  storageChange(key, original, null);
  storageChange(key, null, renewed);
  assert.equal(getOgSessionRevision(), revision + 2);
  assert.equal(readOgSession().accessToken, 'RENEWED');
});

test('storage notifications ignore renewal and unrelated storage, but detect account replacement and clear', () => {
  reset();
  const key = ogSessionKey(OG_CLIENT);
  const original = entry();
  const renewed = entry({ access_token: 'RENEWED' });
  localStorage.setItem(key, original);
  readOgSession();
  const revision = getOgSessionRevision();
  storageChange(key, original, renewed);
  storageChange('unrelated', original, null);
  storageChange(ogSessionKey('oldClientId1234'), original, null);
  storageChange(key, original, null, new MemoryStorage());
  storageChange(null, null, null, new MemoryStorage());
  assert.equal(getOgSessionRevision(), revision);
  const other = entry({ profile: { sub: 'other-account' } });
  localStorage.setItem(key, other);
  storageChange(key, renewed, other);
  assert.equal(getOgSessionRevision(), revision + 1);
  localStorage.removeItem(key);
  storageChange(null, null, null);
  assert.equal(getOgSessionRevision(), revision + 2);
  assert.equal(readOgSession(), null);
});
