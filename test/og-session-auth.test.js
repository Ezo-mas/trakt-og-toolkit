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

const storage = new Map();
globalThis.GM_getValue = (key, fallback) => storage.get(key) ?? fallback;
globalThis.GM_setValue = (key, value) => storage.set(key, value);
globalThis.GM_deleteValue = (key) => storage.delete(key);
globalThis.localStorage = new MemoryStorage();
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();

const { apiAuth, apiGet, isSignedIn } = await import('../src/core/trakt.js');
const { ogSessionKey } = await import('../src/core/og-session.js');
const { clearCache } = await import('../src/core/http.js');
const { debugError, setVerbose } = await import('../src/core/log.js');

const OG_CLIENT = 'WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI';
const OG_KEY = ogSessionKey(OG_CLIENT);
const expiring = (seconds = 3600) => Math.floor(Date.now() / 1000) + seconds;
let calls;

function mock(handler) {
  calls = [];
  globalThis.GM_xmlhttpRequest = (options) => {
    const entry = { ...options, body: options.data ? JSON.parse(options.data) : null };
    calls.push(entry);
    const result = handler(entry, calls.length);
    if (result) queueMicrotask(() => options.onload({
      status: result.status, responseText: JSON.stringify(result.body ?? {}), responseHeaders: '',
    }));
    return { abort: () => options.onabort() };
  };
}

function reset() {
  storage.clear();
  globalThis.localStorage = new MemoryStorage();
  clearCache();
}

function ogSession({ access = 'OG_ACCESS', expires = expiring(), refresh = 'OG_REFRESH',
  account = 42, username = 'og-user' } = {}) {
  globalThis.localStorage.setItem(OG_KEY, JSON.stringify({
    access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_at: expires,
    ...(account == null ? {} : { profile: { ids: { trakt: account }, username } }),
  }));
}

const settle = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

test('og session is used with og client ID and never refreshed or stored', async () => {
  reset();
  ogSession();
  assert.equal(isSignedIn(), true);

  mock(() => ({ status: 200, body: { username: 'og-user' } }));
  assert.deepEqual(await apiAuth('GET', '/users/me'), { username: 'og-user' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  assert.equal(calls[0].headers['trakt-api-key'], OG_CLIENT);
  assert.equal(calls.some((request) => request.url.startsWith('https://auth.trakt.tv/')), false);
  assert.equal(storage.has('trakt.oauth.tokens'), false);
  assert.match(globalThis.localStorage.getItem(OG_KEY), /OG_ACCESS/);
});

test("legacy toolkit credentials are ignored", async () => {
  reset();
  storage.set('trakt.clientId', 'own-client');
  storage.set('trakt.oauth.tokens', {
    client_id: 'own-client', access_token: 'OWN_ACCESS', refresh_token: 'OWN_REFRESH',
    expires_at: Date.now() + 3600000,
  });
  ogSession();
  mock(() => ({ status: 200, body: { username: 'og-user' } }));

  await apiAuth('GET', '/users/me');
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  assert.equal(calls[0].headers['trakt-api-key'], OG_CLIENT);
  localStorage.removeItem(OG_KEY);
  await assert.rejects(apiGet('/shows/test'), /Sign in to og\.trakt\.tv/);
  assert.equal(calls.length, 1);
});

test('a rejected og token asks for a reload and is left untouched', async () => {
  reset();
  ogSession();
  mock(() => ({ status: 401 }));

  const error = await apiAuth('GET', '/users/me').catch((failure) => failure);
  assert.match(error.message, /og\.trakt\.tv session expired; reload the page/);
  assert.equal(error.status, 401);
  assert.equal(error.body, null);
  assert.equal(calls.length, 1);
  assert.equal(calls.some((request) => request.url.endsWith('/oauth/token')), false);
  assert.equal(storage.has('trakt.oauth.tokens'), false);
  assert.match(globalThis.localStorage.getItem(OG_KEY), /OG_ACCESS/);
});

test('a token og renewed meanwhile is retried once without refreshing', async () => {
  reset();
  ogSession();
  mock((request, number) => {
    if (number === 1) {
      // Another og tab renewed the session between our send and the 401.
      ogSession({ access: 'OG_ACCESS_2', refresh: 'OG_REFRESH_2' });
      return { status: 401 };
    }
    return { status: 200, body: { username: 'renewed' } };
  });

  assert.deepEqual(await apiAuth('GET', '/users/me'), { username: 'renewed' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  assert.equal(calls[1].headers.Authorization, 'Bearer OG_ACCESS_2');
  assert.equal(calls.some((request) => request.url.endsWith('/oauth/token')), false);
});

test('a first read after an og account switch adopts the new account', async () => {
  reset();
  ogSession({ account: 1, username: 'account-a' });
  mock(() => ({ status: 200, body: { username: 'account-b' } }));

  await apiAuth('GET', '/users/me');
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  // The switch happens in this tab, so no storage notification advances the revision.
  ogSession({ access: 'OG_B_ACCESS', refresh: 'OG_B_REFRESH', account: 2, username: 'account-b' });

  assert.deepEqual(await apiAuth('GET', '/users/me'), { username: 'account-b' });
  assert.equal(calls[1].headers.Authorization, 'Bearer OG_B_ACCESS');
});

test('an expired og token fails before any request', async () => {
  reset();
  ogSession({ expires: expiring(-60) });
  mock(() => ({ status: 200 }));
  await assert.rejects(apiAuth('GET', '/users/me'), /reload the page/);
  assert.equal(calls.length, 0);
});

test('writes use the og token without ever refreshing it', async () => {
  reset();
  ogSession();
  mock(() => ({ status: 200, body: { added: { movies: 1 } } }));

  assert.deepEqual(await apiAuth('POST', '/sync/watchlist', { movies: [{ ids: { slug: 'the-matrix-1999' } }] }),
    { added: { movies: 1 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  assert.equal(calls[0].headers['trakt-api-key'], OG_CLIENT);
  assert.deepEqual(calls[0].body, { movies: [{ ids: { slug: 'the-matrix-1999' } }] });
  assert.equal(storage.has('trakt.oauth.tokens'), false);
});

test('public lookups use og without a client ID, preserving query and caching', async () => {
  reset();
  ogSession();
  mock(() => ({ status: 200, body: { title: 'The Matrix' } }));

  assert.deepEqual(await apiGet('/movies/the-matrix-1999?extended=full'), { title: 'The Matrix' });
  assert.deepEqual(await apiGet('/movies/the-matrix-1999?extended=full'), { title: 'The Matrix' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, 'Bearer OG_ACCESS');
  assert.equal(calls[0].headers['trakt-api-key'], OG_CLIENT);
  assert.match(calls[0].url, /\/movies\/the-matrix-1999\?extended=full$/);

  await apiGet('/shows/1388/seasons?extended=full');
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /\/shows\/1388\/seasons\?extended=full$/);
});

test('an expired og session asks for a reload before a lookup', async () => {
  reset();
  ogSession({ expires: expiring(-60) });
  mock(() => ({ status: 200 }));

  const error = await apiGet('/movies/the-matrix-1999').catch((failure) => failure);
  assert.match(error.message, /og\.trakt\.tv session expired; reload the page/);
  assert.equal(error.ogSession, true);
  assert.equal(calls.length, 0);
});

test('a revoked og token on a public lookup asks for a reload', async () => {
  reset();
  ogSession();
  mock(() => ({ status: 401 }));

  const error = await apiGet('/movies/the-matrix-1999').catch((failure) => failure);
  assert.match(error.message, /reload the page/);
  assert.equal(error.ogSession, true);
  assert.equal(calls.length, 1, 'the rejected token is not retried');
});

for (const status of [200, 401]) test(`late HTTP ${status} after an account change is discarded`, async () => {
  for (const read of [() => apiGet('/movies/test'), () => apiAuth('GET', '/users/me')]) {
    reset();
    ogSession();
    mock(() => {
      ogSession({ access: 'other', account: 100 });
      return { status, body: { title: 'old account' } };
    });
    await assert.rejects(read(), /session changed/);
    assert.equal(calls.length, 1);
    mock(() => ({ status: 200, body: { title: 'new account' } }));
    assert.deepEqual(await read(), { title: 'new account' });
    assert.equal(calls[0].headers.Authorization, 'Bearer other');
  }
});

test('cached lookups require the session that populated them', async () => {
  reset();
  ogSession();
  mock(() => ({ status: 200, body: { title: 'first' } }));
  assert.deepEqual(await apiGet('/lists/test'), { title: 'first' });
  localStorage.removeItem(OG_KEY);
  await assert.rejects(apiGet('/lists/test'), /Sign in to og\.trakt\.tv/);
  ogSession({ access: 'other', account: 100 });
  mock(() => ({ status: 200, body: { title: 'second' } }));
  assert.deepEqual(await apiGet('/lists/test'), { title: 'second' });
  assert.equal(calls.length, 1);
});

test('a second og 401 ends a retry even when the token rotated again', async (t) => {
  for (const [mode, read, expected] of [
    ['lookup', () => apiGet('/movies/test'), { name: 'HttpError', status: 401, ogSession: true }],
    ['private', () => apiAuth('GET', '/users/me'), { name: 'HttpError', status: 401, ogSession: true }],
  ]) {
    await t.test(mode, async () => {
      reset();
      ogSession();
      mock((request, number) => {
        ogSession({ access: `renewed-${number}` });
        return { status: 401 };
      });
      await assert.rejects(read(), { ...expected, message: /reload the page/ });
      assert.deepEqual(calls.map((request) => request.headers.Authorization), ['Bearer OG_ACCESS', 'Bearer renewed-1']);
    });
  }
});

test('a queued write is abandoned when og switches accounts', async (t) => {
  reset();
  // Move past pacing left by earlier write tests in this file.
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 2_000_000_000_000 });
  ogSession({ account: 1, username: 'account-a' });
  let pending;
  mock((request, number) => {
    if (number === 1) { pending = request; return null; }
    return { status: 200, body: {} };
  });

  const first = apiAuth('POST', '/sync/first', {});
  await settle();
  assert.equal(calls.length, 1);
  const queued = apiAuth('POST', '/sync/second', {});
  const rejected = assert.rejects(queued, /session changed/);
  await settle();

  pending.onload({ status: 200, responseText: '{}', responseHeaders: '' });
  await first;
  await settle();
  // The second write is now waiting for the one-second pacing slot.
  ogSession({ access: 'OG_B_ACCESS', refresh: 'OG_B_REFRESH', account: 2, username: 'account-b' });
  t.mock.timers.tick(1000);
  await settle();
  await rejected;
  assert.equal(calls.length, 1, 'the old account may have one write, never the queued second');
});

test('a queued write never revives after logout and the same account signs back in', async (t) => {
  reset();
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 4_000_000_000_000 });
  ogSession({ account: 1, username: 'account-a' });
  mock(() => ({ status: 200, body: {} }));

  await apiAuth('POST', '/sync/first', {});
  await settle();
  const queued = apiAuth('POST', '/sync/second', {});
  const rejected = assert.rejects(queued, /Signed out|session changed/);
  await settle();

  // Both transitions are observed, as they would be by the page's auth reads.
  globalThis.localStorage.removeItem(OG_KEY);
  assert.equal(isSignedIn(), false);
  ogSession({ account: 1, username: 'account-a' });
  assert.equal(isSignedIn(), true);

  // The second write's pacing slot arrives after A is signed back in.
  t.mock.timers.tick(1000);
  await settle();
  await rejected;
  assert.equal(calls.length, 1, 'the same account signing back in must not revive old work');
});

for (const cleared of [false, true]) test(`cross-tab ${cleared ? 'storage clear' : 'logout'}/login cancels queued writes without an auth read`, async (t) => {
  reset();
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 4_500_000_000_000 + Number(cleared) * 10000 });
  ogSession({ account: 1 });
  mock(() => ({ status: 200, body: {} }));
  await apiAuth('POST', '/sync/first', {});
  const queued = apiAuth('POST', '/sync/second', {});
  const rejected = assert.rejects(queued, /Signed out|session changed/);
  await settle();

  const oldValue = localStorage.getItem(OG_KEY);
  ogSession({ access: 'NEW_LOGIN', account: 1 });
  const newValue = localStorage.getItem(OG_KEY);
  for (const change of [
    { key: cleared ? null : OG_KEY, oldValue: cleared ? null : oldValue, newValue: null },
    { key: OG_KEY, oldValue: null, newValue },
  ]) {
    const event = new Event('storage');
    Object.assign(event, change, { storageArea: localStorage });
    window.dispatchEvent(event);
  }

  t.mock.timers.tick(1000);
  await settle();
  await rejected;
  assert.equal(calls.length, 1, 'neither a rapid login nor delayed notifications may revive the old write');
});

test('a late 401 from og account A is not retried as account B', async () => {
  reset();
  ogSession({ account: 1, username: 'account-a' });
  mock((request, number) => {
    if (number === 1) {
      ogSession({ access: 'OG_B_ACCESS', refresh: 'OG_B_REFRESH', account: 2, username: 'account-b' });
      return { status: 401 };
    }
    return { status: 200, body: { username: 'account-b' } };
  });

  await assert.rejects(apiAuth('GET', '/users/me'), /session changed/);
  assert.equal(calls.length, 1);
});

test('an og token expiring while a write waits for a slot is not dispatched', async (t) => {
  reset();
  // Move past pacing left by the preceding write tests in this file.
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 5_000_000_000_000 });
  ogSession({ expires: Math.floor(Date.now() / 1000) + 1 });
  mock((request) => (request.method === 'GET' ? null : { status: 200, body: {} }));

  const holds = ['a', 'b', 'c', 'd'].map((name) => apiGet(`/shows/hold-${name}`));
  await settle();
  assert.equal(calls.length, 4, 'four GETs hold every transport slot');
  const write = apiAuth('POST', '/sync/held', {});
  const rejected = assert.rejects(write, /reload the page/);
  await settle();

  t.mock.timers.tick(2000);
  await settle();
  for (const call of [...calls]) call.onload({ status: 200, responseText: '[]', responseHeaders: '' });
  await Promise.all(holds);
  await rejected;
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
});

test('og credentials stay out of errors and debug output', async (t) => {
  reset();
  ogSession();
  mock(() => ({ status: 403, body: { access_token: 'OG_ACCESS', refresh_token: 'OG_REFRESH' } }));
  const error = await apiAuth('GET', '/users/me').catch((failure) => failure);
  const output = [];
  t.mock.method(console, 'warn', (...args) => output.push(args));
  setVerbose(true);
  debugError('og request failed', error);
  setVerbose(false);
  assert.doesNotMatch(JSON.stringify(output), /OG_ACCESS|OG_REFRESH/);
});
