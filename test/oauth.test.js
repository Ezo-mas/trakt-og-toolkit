import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.GM_getValue = (k, fallback) => storage.get(k) ?? fallback;
globalThis.GM_setValue = (k, v) => storage.set(k, v);
globalThis.GM_deleteValue = (k) => storage.delete(k);
const { STORAGE } = await import('../src/core/store.js');
const { setClientId } = await import('../src/settings.js');
const oauth = await import('../src/core/oauth.js');
const { apiAuth } = await import('../src/core/trakt.js');
const { debugError, setVerbose } = await import('../src/core/log.js');
const token = (access = 'private-access', refresh = 'private-refresh') => ({ access_token: access, refresh_token: refresh, expires_in: 3600 });
const codes = { device_code: 'private-device', user_code: 'VISIBLE', verification_url: 'https://auth.trakt.tv/activate', interval: 2, expires_in: 30 };
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
let calls;
function mock(handler) {
  calls = [];
  globalThis.GM_xmlhttpRequest = (options) => {
    const entry = { ...options, body: options.data ? JSON.parse(options.data) : null, time: Date.now() };
    calls.push(entry);
    const result = handler(entry, calls.length);
    if (result) queueMicrotask(() => options.onload({ status: result.status, responseText: JSON.stringify(result.body ?? {}), responseHeaders: '' }));
    return { abort: () => options.onabort() };
  };
}
function reset() {
  storage.clear();
  setClientId('client');
  storage.set(STORAGE.redirectUri, 'https://example.com/callback');
}
function stored(expiry = Date.now() + 3600000) {
  storage.set(STORAGE.tokens, { ...token(), client_id: 'client', expires_at: expiry });
}

test('device polling and token security', async (t) => {
  for (const status of [404, 409, 410, 418, 401, 500]) {
    await t.test(`terminal device status ${status}`, async (t) => {
      reset(); t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
      mock((r) => r.url.endsWith('/code') ? { status: 200, body: codes } : { status, body: { secret: 'never expose this' } });
      const messages = [];
      const flow = oauth.signIn({ onMessage: (m) => messages.push(m) });
      await settle(); t.mock.timers.tick(1999); await settle(); assert.equal(calls.length, 1);
      t.mock.timers.tick(1); await flow;
      assert.equal(calls.length, 2); assert.equal(messages.length, 1);
      assert.equal(messages[0], oauth.DEVICE_MESSAGES[status] || 'Trakt sign-in failed; start again.');
      assert.equal(oauth.isSignedIn(), false);
      t.mock.timers.tick(60000); await settle(); assert.equal(calls.length, 2);
    });
  }
  await t.test('pending, slow down, success and persisted rotation data', async (t) => {
    reset(); t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
    const statuses = [400, 429, 200];
    mock((r) => r.url.endsWith('/code') ? { status: 200, body: codes } : { status: statuses.shift(), body: token() });
    const messages = []; let displayed;
    const flow = oauth.signIn({ onCode: (v) => { displayed = v; }, onMessage: (v) => messages.push(v) });
    await settle(); assert.deepEqual(displayed, { user_code: 'VISIBLE', verification_url: codes.verification_url });
    t.mock.timers.tick(2000); await settle(); t.mock.timers.tick(2000); await settle();
    assert.equal(calls.length, 3);
    t.mock.timers.tick(6999); await settle(); assert.equal(calls.length, 3);
    t.mock.timers.tick(1); await flow;
    assert.equal(oauth.isSignedIn(), true);
    assert.deepEqual(messages, [oauth.DEVICE_MESSAGES[400], oauth.DEVICE_MESSAGES[429], 'Signed in to Trakt.']);
    assert.equal(storage.get(STORAGE.tokens).expires_at, 3711000);
    for (const r of calls) {
      assert.equal(r.method, 'POST'); assert.equal(r.headers['Content-Type'], 'application/json');
      assert.equal(new URL(r.url).search, ''); assert.equal(r.body.client_secret, undefined);
    }
  });
  await t.test('polling messages appear only when the state changes', async (t) => {
    reset(); t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
    const statuses = [400, 400, 429, 429, 400, 200];
    mock((r) => r.url.endsWith('/code') ? { status: 200, body: { ...codes, expires_in: 100 } } :
      { status: statuses.shift(), body: token() });
    const messages = [];
    const flow = oauth.signIn({ onMessage: (m) => messages.push(m) });
    await settle();
    for (const delay of [2000, 2000, 2000, 7000, 12000, 12000]) {
      t.mock.timers.tick(delay); await settle();
    }
    await flow;
    assert.equal(calls.length, 7);
    assert.deepEqual(messages, [oauth.DEVICE_MESSAGES[400], oauth.DEVICE_MESSAGES[429],
      oauth.DEVICE_MESSAGES[400], 'Signed in to Trakt.']);
  });
  await t.test('local expiration respects expires_in', async (t) => {
    reset(); t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
    mock((r) => r.url.endsWith('/code') ? { status: 200, body: { ...codes, expires_in: 3 } } : { status: 400 });
    const messages = []; const flow = oauth.signIn({ onMessage: (m) => messages.push(m) });
    await settle(); t.mock.timers.tick(2000); await settle(); t.mock.timers.tick(1000); await flow;
    assert.equal(calls.length, 2); assert.equal(messages.at(-1), oauth.DEVICE_MESSAGES[410]);
  });
  for (const inFlight of [false, true]) {
    await t.test(`cancel stops polling, request in flight: ${inFlight}`, async (t) => {
      reset(); t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
      mock((r) => r.url.endsWith('/code') ? { status: 200, body: codes } : null);
      const messages = []; const flow = oauth.signIn({ onMessage: (v) => messages.push(v) });
      await settle(); if (inFlight) { t.mock.timers.tick(2000); await settle(); }
      oauth.cancelSignIn(); await flow;
      if (inFlight) calls.at(-1).onload({ status: 200, responseText: JSON.stringify(token()) });
      t.mock.timers.tick(60000); await settle();
      assert.equal(calls.length, inFlight ? 2 : 1); assert.equal(oauth.isSignedIn(), false);
      assert.equal(messages.at(-1), 'Trakt sign-in cancelled.');
    });
  }
});

test('authenticated requests, refresh, sign-out and sanitized failures', async (t) => {
  await t.test('concurrent 401s refresh once and retry each once', async () => {
    reset(); stored();
    mock((r) => r.url.endsWith('/oauth/token') ? { status: 200, body: token('new-access', 'new-refresh') } :
      r.headers.Authorization === 'Bearer private-access' ? { status: 401 } : { status: 200, body: { username: 'tester' } });
    const results = await Promise.all([apiAuth('GET', '/users/me'), apiAuth('GET', '/users/me')]);
    assert.equal(results[0].username, 'tester'); assert.equal(results[1].username, 'tester');
    assert.equal(calls.filter((r) => r.url.endsWith('/oauth/token')).length, 1);
    assert.equal(calls.length, 5); assert.equal(storage.get(STORAGE.tokens).refresh_token, 'new-refresh');
    assert.deepEqual(calls.find((r) => r.url.endsWith('/token')).body, {
      client_id: 'client', refresh_token: 'private-refresh', grant_type: 'refresh_token', redirect_uri: 'https://example.com/callback',
    });
  });
  await t.test('refresh before expiry, no caching, POST JSON and DELETE 204', async () => {
    reset(); stored(Date.now() + 1000);
    mock((r) => r.url.endsWith('/token') ? { status: 200, body: token('rotated', 'rotated-refresh') } : { status: r.method === 'DELETE' ? 204 : 200, body: { ok: true } });
    await apiAuth('POST', '/sync/test', { example: 1 }); await apiAuth('GET', '/users/me'); await apiAuth('GET', '/users/me');
    assert.equal(await apiAuth('DELETE', '/sync/test'), null);
    assert.equal(calls.length, 5); assert.deepEqual(calls[1].body, { example: 1 });
  });
  for (const failure of ['refresh', 'retry', 'proactive-retry']) {
    await t.test(`failed ${failure} clears tokens with bounded retries`, async () => {
      reset(); stored(failure === 'proactive-retry' ? Date.now() : undefined);
      mock((r) => r.url.endsWith('/token') ? { status: failure === 'refresh' ? 400 : 200, body: token() } : { status: 401 });
      await assert.rejects(apiAuth('GET', '/users/me'), /sign in again/);
      assert.equal(oauth.isSignedIn(), false);
      assert.equal(calls.filter((r) => r.url.endsWith('/token')).length, failure === 'proactive-retry' ? 2 : 1);
      assert.ok(calls.length <= 4);
    });
  }
  for (const failure of ['network', 'timeout', 429, 500, 503, 'malformed']) {
    await t.test(`refresh retains tokens after ${failure} and permits a later retry`, async () => {
      reset(); stored(Date.now());
      const before = structuredClone(storage.get(STORAGE.tokens));
      mock(() => typeof failure === 'number' ? { status: failure, body: token() } :
        failure === 'malformed' ? { status: 200, body: {} } : null);
      const auth = apiAuth('GET', '/users/me');
      const rejected = assert.rejects(auth, /Could not refresh.*try again/);
      await settle();
      if (failure === 'network') calls[0].onerror();
      if (failure === 'timeout') calls[0].ontimeout();
      await rejected;
      assert.deepEqual(storage.get(STORAGE.tokens), before);
      assert.equal(oauth.isSignedIn(), true);
      assert.equal(calls.length, 1);
      mock((r) => r.url.endsWith('/token') ? { status: 200, body: token('recovered', 'recovered-refresh') } :
        { status: 200, body: { username: 'tester' } });
      assert.equal((await apiAuth('GET', '/users/me')).username, 'tester');
      assert.equal(storage.get(STORAGE.tokens).refresh_token, 'recovered-refresh');
    });
  }
  for (const status of [400, 401]) {
    await t.test(`explicit refresh rejection ${status} clears tokens`, async () => {
      reset(); stored(Date.now()); mock(() => ({ status, body: token() }));
      await assert.rejects(apiAuth('GET', '/users/me'), /sign in again/);
      assert.equal(storage.has(STORAGE.tokens), false);
      assert.equal(oauth.isSignedIn(), false);
    });
  }
  await t.test('sign-out revokes with JSON and clears stored tokens', async () => {
    reset(); stored(); mock(() => ({ status: 200 })); await oauth.signOut();
    assert.equal(storage.has(STORAGE.tokens), false); assert.equal(calls[0].url, 'https://auth.trakt.tv/oauth/revoke');
    assert.deepEqual(calls[0].body, { token: 'private-access', client_id: 'client' });
  });
  await t.test('failed revocation still clears local session', async () => {
    reset(); stored(); mock(() => ({ status: 500, body: token() }));
    await assert.rejects(oauth.signOut(), /Signed out locally/); assert.equal(oauth.isSignedIn(), false);
  });
  await t.test('sign-out during refresh cannot resurrect tokens and revokes rotation', async () => {
    reset(); stored(Date.now()); mock((r) => r.url.endsWith('/token') ? null : { status: 200 });
    const auth = apiAuth('GET', '/users/me'); const rejection = assert.rejects(auth, /sign in again/);
    await settle(); const out = oauth.signOut(); await settle();
    calls[0].onload({ status: 200, responseText: JSON.stringify(token('rotated', 'rotated-refresh')) });
    await out; await rejection;
    assert.equal(oauth.isSignedIn(), false);
    assert.ok(calls.some((r) => r.url.endsWith('/revoke') && r.body.token === 'rotated'));
  });
  await t.test('raw credential-bearing error responses cannot reach debugError', async (t) => {
    reset(); stored(); mock(() => ({ status: 403, body: token() }));
    let error; try { await apiAuth('GET', '/users/me'); } catch (e) { error = e; }
    assert.equal(error.body, null);
    const output = []; t.mock.method(console, 'warn', (...args) => output.push(args)); setVerbose(true);
    debugError('auth failed', error); setVerbose(false);
    assert.doesNotMatch(JSON.stringify(output), /private-access|private-refresh/);
    await assert.rejects(apiAuth('GET', '/users/me?token=private-access'), /no query/);
  });
  await t.test('image extension uses a fixed non-secret GET option', async () => {
    reset(); stored(); mock(() => ({ status: 200, body: [] }));
    await apiAuth('GET', '/sync/playback/movies', undefined, { extended: 'images' });
    assert.equal(calls[0].url, 'https://api.trakt.tv/sync/playback/movies?extended=images');
    assert.equal(calls[0].headers.Authorization, 'Bearer private-access');
    await assert.rejects(apiAuth('POST', '/sync/playback/movies', {}, { extended: 'images' }), /Unsupported/);
    await assert.rejects(apiAuth('GET', '/sync/playback/movies', undefined, { extended: 'private-access' }), /Unsupported/);
    assert.equal(calls.length, 1);
  });
  await t.test('review query options are encoded and strictly validated', async () => {
    reset(); stored(); mock(() => ({ status: 200, body: [] }));
    const options = { start_at: '2026-10-01T00:00:00.000Z', end_at: '2026-11-01T00:00:00.000Z', page: 2, limit: 100, extended: 'full,images' };
    await apiAuth('GET', '/sync/history', undefined, options);
    const url = new URL(calls[0].url);
    for (const [key, value] of Object.entries(options)) assert.equal(url.searchParams.get(key), String(value));
    for (const bad of [{ page: 0 }, { page: 1.5 }, { limit: 1001 }, { start_at: 'yesterday' }, { token: 'secret' }, { extended: 'full&token=secret' }]) {
      await assert.rejects(apiAuth('GET', '/sync/history', undefined, bad), /Unsupported/);
    }
    assert.equal(calls.length, 1);
  });
  await t.test('tokens are bound to client ID', async () => {
    reset(); stored(); setClientId('different'); assert.equal(oauth.isSignedIn(), false);
    await assert.rejects(apiAuth('GET', '/users/me'), /Signed out/);
  });
});
