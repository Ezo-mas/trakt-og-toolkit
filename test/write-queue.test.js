import test from 'node:test';
import assert from 'node:assert/strict';

/** Mocked transport and clock: no live Trakt request is made and no credential is printed. */
const storage = new Map();
globalThis.GM_getValue = (k, fallback) => storage.get(k) ?? fallback;
globalThis.GM_setValue = (k, v) => storage.set(k, v);
globalThis.GM_deleteValue = (k) => storage.delete(k);
const { STORAGE } = await import('../src/core/store.js');
const { setClientId } = await import('../src/settings.js');
const oauth = await import('../src/core/oauth.js');
const { apiAuth, apiGet } = await import('../src/core/trakt.js');
const { request } = await import('../src/core/http.js');

const settle = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
let calls;
/**
 * `handler` returns `{ status, body, headers }` to answer, `{ error: true }` for a network failure,
 * or null to leave the request pending. Times are recorded from the mocked clock.
 */
function mockTransport(handler) {
  calls = [];
  globalThis.GM_xmlhttpRequest = (options) => {
    const entry = { ...options, body: options.data ? JSON.parse(options.data) : null, time: Date.now() };
    calls.push(entry);
    const result = handler(entry, calls.length);
    if (result) {
      queueMicrotask(() => {
        if (result.error) options.onerror();
        else if (result.timeout) options.ontimeout();
        else options.onload({ status: result.status, responseText: JSON.stringify(result.body ?? {}), responseHeaders: result.headers ?? '' });
      });
    }
    return { abort: () => options.onabort() };
  };
}
function reset(expiresAt = Date.now() + 3600000) {
  storage.clear();
  setClientId('client');
  storage.set(STORAGE.redirectUri, 'https://example.com/callback');
  storage.set(STORAGE.tokens, { access_token: 'private-access', refresh_token: 'private-refresh', client_id: 'client', expires_at: expiresAt });
}
const paths = () => calls.map((call) => new URL(call.url).pathname);

test('shared FIFO queue sends writes in order, one second apart', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1_000_000 });
  reset();
  mockTransport(() => ({ status: 200, body: { ok: true } }));
  const first = apiAuth('POST', '/sync/first', { n: 1 });
  const second = apiAuth('POST', '/sync/second', { n: 2 });
  const third = apiAuth('PUT', '/sync/third', { n: 3 });
  await settle();
  assert.deepEqual(paths(), ['/sync/first']);
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.length, 1, 'the second write waits for the one-second window');
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 2);
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.length, 2);
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 3);
  await Promise.all([first, second, third]);
  assert.deepEqual(paths(), ['/sync/first', '/sync/second', '/sync/third']);
  assert.ok(calls[1].time - calls[0].time >= 1000);
  assert.ok(calls[2].time - calls[1].time >= 1000);
  assert.deepEqual(calls.map((call) => call.body), [{ n: 1 }, { n: 2 }, { n: 3 }]);
});

test('a long Retry-After is honoured in full for the retry and for later writes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 2_000_000 });
  reset();
  let attempts = 0;
  mockTransport((call) => {
    if (new URL(call.url).pathname === '/sync/first' && attempts++ === 0) {
      return { status: 429, headers: 'retry-after: 30\r\n' };
    }
    return { status: 200, body: {} };
  });
  const first = apiAuth('POST', '/sync/first', {});
  const second = apiAuth('POST', '/sync/second', {});
  await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(29_999); await settle();
  assert.equal(calls.length, 1, 'the old ten-second cap would have retried too early');
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1].url).pathname, '/sync/first');
  assert.ok(calls[1].time - calls[0].time >= 30000);
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.length, 2, 'the next write stays behind the write pacing interval');
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 3);
  assert.equal(new URL(calls[2].url).pathname, '/sync/second');
  await Promise.all([first, second]);
});

test('a missing Retry-After uses bounded exponential backoff with jitter', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 3_000_000 });
  t.mock.method(Math, 'random', () => 0.5);
  reset();
  const statuses = [429, 429, 200];
  mockTransport(() => ({ status: statuses.shift(), body: {} }));
  const write = apiAuth('POST', '/sync/backoff', {});
  await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 2, 'first backoff is about one second');
  t.mock.timers.tick(1999); await settle();
  assert.equal(calls.length, 2, 'second backoff is longer than the first');
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 3);
  await write;
  assert.deepEqual(statuses, []);
});

test('exhausted retries reject once, then release the queue for later writes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 4_000_000 });
  reset();
  mockTransport((call) => new URL(call.url).pathname === '/sync/fail'
    ? { status: 429, headers: 'retry-after: 1\r\n' }
    : { status: 200, body: {} });
  const failing = apiAuth('POST', '/sync/fail', {});
  const rejection = assert.rejects(failing, (error) => error.status === 429 && error.body === null);
  await settle();
  t.mock.timers.tick(1000); await settle();
  t.mock.timers.tick(1000); await settle();
  assert.equal(calls.length, 3, 'one attempt plus two bounded retries');
  await rejection;
  const next = apiAuth('POST', '/sync/next', {});
  await settle();
  assert.equal(calls.length, 3, 'the final 429 still blocks the session');
  t.mock.timers.tick(1000); await settle();
  assert.equal(calls.length, 4);
  await next;
  assert.equal(new URL(calls[3].url).pathname, '/sync/next');
});

test('ambiguous server and network failures are never replayed and release the queue', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 5_000_000 });
  reset();
  mockTransport((call) => new URL(call.url).pathname === '/sync/broken' ? { status: 500 } : { status: 200, body: {} });
  const broken = apiAuth('POST', '/sync/broken', {});
  const rejection = assert.rejects(broken, (error) => error.status === 500 && error.body === null);
  await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(5000); await settle();
  assert.equal(calls.length, 1, 'a 500 is ambiguous and is not retried automatically');
  await rejection;
  const next = apiAuth('POST', '/sync/next', {});
  await settle();
  assert.equal(calls.length, 2);
  await next;

  mockTransport(() => ({ error: true }));
  const network = apiAuth('POST', '/sync/network', {});
  const networkRejection = assert.rejects(network, /check your connection/);
  await settle();
  t.mock.timers.tick(1000); await settle();
  assert.equal(calls.length, 1);
  await networkRejection;
  assert.equal(calls.length, 1, 'a network failure is not retried automatically');
});

test('aborting a queued write rejects it and lets later writes proceed', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 6_000_000 });
  reset();
  mockTransport(() => ({ status: 200, body: {} }));
  const controller = new AbortController();
  const first = apiAuth('POST', '/sync/first', {});
  const cancelled = apiAuth('POST', '/sync/cancelled', {}, {}, { signal: controller.signal });
  const rejection = assert.rejects(cancelled, /cancelled/);
  const third = apiAuth('POST', '/sync/third', {});
  await settle();
  assert.equal(calls.length, 1);
  controller.abort();
  await rejection;
  await settle();
  t.mock.timers.tick(1000); await settle();
  assert.equal(calls.length, 2);
  await Promise.all([first, third]);
  assert.deepEqual(paths(), ['/sync/first', '/sync/third']);
});

test('sign-out cancels waiting writes; a new session can write under its own token', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 7_000_000 });
  reset();
  mockTransport(() => ({ status: 200, body: {} }));
  const first = apiAuth('POST', '/sync/first', {});
  const oldAccount = apiAuth('POST', '/sync/old-account', {});
  const rejection = assert.rejects(oldAccount, /Signed out/);
  await settle();
  assert.equal(calls.length, 1);
  oauth.clearTokens();
  t.mock.timers.tick(250); await settle();
  await rejection;
  assert.equal(calls.length, 1, 'the queued write never reaches the transport after sign-out');
  storage.set(STORAGE.tokens, { access_token: 'other-access', refresh_token: 'other-refresh', client_id: 'client', expires_at: Date.now() + 3600000 });
  const newAccount = apiAuth('POST', '/sync/new-account', {});
  await settle();
  assert.equal(calls.length, 1, 'a queued session change still respects write pacing');
  t.mock.timers.tick(1000); await settle();
  assert.equal(calls.length, 2);
  await Promise.all([first, newAccount]);
  assert.equal(calls[1].headers.Authorization, 'Bearer other-access');
  assert.equal(paths().includes('/sync/old-account'), false);
});

test('token refresh runs outside the queue and does not deadlock a waiting write', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 8_000_000 });
  reset(8_000_000);
  mockTransport((call) => new URL(call.url).pathname === '/oauth/token'
    ? { status: 200, body: { access_token: 'rotated-access', refresh_token: 'rotated-refresh', expires_in: 3600 } }
    : { status: 200, body: {} });
  const first = apiAuth('POST', '/sync/first', {});
  const second = apiAuth('POST', '/sync/second', {});
  await settle();
  assert.deepEqual(paths(), ['/oauth/token', '/sync/first']);
  assert.equal(calls.filter((call) => new URL(call.url).pathname === '/oauth/token').length, 1, 'refresh stays single-flight');
  t.mock.timers.tick(1000); await settle();
  assert.deepEqual(paths(), ['/oauth/token', '/sync/first', '/sync/second']);
  await Promise.all([first, second]);
  assert.equal(calls[2].headers.Authorization, 'Bearer rotated-access');
});

test('a rejected write refreshes once and resends through the pacing queue', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 9_000_000 });
  reset();
  let writes = 0;
  mockTransport((call) => {
    const path = new URL(call.url).pathname;
    if (path === '/oauth/token') return { status: 200, body: { access_token: 'rotated', refresh_token: 'rotated-refresh', expires_in: 3600 } };
    writes += 1;
    return writes === 1 ? { status: 401 } : { status: 200, body: {} };
  });
  const write = apiAuth('POST', '/sync/retry', {});
  await settle();
  assert.deepEqual(paths(), ['/sync/retry', '/oauth/token']);
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.length, 2, 'the resend waits for the same write pacing');
  t.mock.timers.tick(1); await settle();
  assert.deepEqual(paths(), ['/sync/retry', '/oauth/token', '/sync/retry']);
  await write;
  assert.equal(calls[2].headers.Authorization, 'Bearer rotated');
});

test('authenticated GETs keep their previous concurrency and are not queued behind writes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10_000_000 });
  reset();
  mockTransport(() => ({ status: 200, body: { username: 'tester' } }));
  const write = apiAuth('POST', '/sync/first', {});
  await settle();
  const [one, two] = await Promise.all([apiAuth('GET', '/users/me'), apiAuth('GET', '/users/me')]);
  assert.equal(one.username, 'tester');
  assert.equal(two.username, 'tester');
  assert.equal(calls.length, 3);
  assert.deepEqual(paths(), ['/sync/first', '/users/me', '/users/me']);
  await write;
});

test('the public transport honours a Retry-After longer than ten seconds', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 11_000_000 });
  reset();
  const statuses = [{ status: 429, headers: 'retry-after: 30\r\n' }, { status: 200, body: { ok: true } }];
  mockTransport(() => statuses.shift());
  const response = request({ url: 'https://api.trakt.tv/shows/test', method: 'GET', retries: 1 });
  await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(29_999); await settle();
  assert.equal(calls.length, 1);
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.length, 2);
  assert.equal((await response).status, 200);
});

test('sign-out while a write waits for an HTTP slot prevents the send', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 12_000_000 });
  reset();
  mockTransport((call) => call.method === 'GET' ? null : { status: 200, body: {} });
  const reads = ['a', 'b', 'c', 'd'].map((name) => apiGet(`/shows/slot-${name}`));
  await settle();
  assert.equal(calls.length, 4, 'four GETs hold every transport slot');
  const write = apiAuth('POST', '/sync/held', {});
  const rejection = assert.rejects(write, /Signed out/);
  await settle();
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
  oauth.clearTokens();
  for (const call of [...calls]) call.onload({ status: 200, responseText: '[]', responseHeaders: '' });
  await Promise.all(reads);
  await rejection;
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0,
    'the queued write must not dispatch after its session ended while waiting for the slot');
});

test('write pacing is stamped at the actual send, not while waiting for an HTTP slot', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 13_000_000 });
  reset();
  mockTransport((call) => call.method === 'GET' ? null : { status: 200, body: {} });
  const reads = ['a', 'b', 'c', 'd'].map((name) => apiGet(`/shows/pacing-${name}`));
  await settle();
  const first = apiAuth('POST', '/sync/first', {});
  const second = apiAuth('POST', '/sync/second', {});
  await settle();
  t.mock.timers.tick(5000); await settle();
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0, 'the first write still waits for a slot');
  for (const call of [...calls]) call.onload({ status: 200, responseText: '[]', responseHeaders: '' });
  await Promise.all(reads);
  await settle();
  const posts = calls.filter((call) => call.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].time, 13_005_000, 'the first write dispatches when the slot becomes available');
  t.mock.timers.tick(999); await settle();
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1,
    'the next write waits one second from the first actual dispatch');
  t.mock.timers.tick(1); await settle();
  assert.equal(calls.filter((call) => call.method === 'POST').length, 2);
  await Promise.all([first, second]);
});

test('a false operation guard cancels a queued write and releases the queue', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 14_000_000 });
  reset();
  mockTransport(() => ({ status: 200, body: {} }));
  let active = true;
  const first = apiAuth('POST', '/sync/first', {});
  const guarded = apiAuth('POST', '/sync/guarded', {}, {}, { active: () => active });
  const rejection = assert.rejects(guarded, /cancelled/);
  await settle();
  assert.equal(calls.length, 1);
  active = false;
  t.mock.timers.tick(250); await settle();
  await rejection;
  const next = apiAuth('POST', '/sync/next', {});
  await settle();
  assert.equal(calls.length, 1, 'the replacement write still respects pacing');
  t.mock.timers.tick(750); await settle();
  assert.equal(calls.length, 2);
  await Promise.all([first, next]);
  assert.deepEqual(paths(), ['/sync/first', '/sync/next']);
});

test('a 401 compares the token actually dispatched after the HTTP-slot wait', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 15_000_000 });
  reset();
  let refreshes = 0;
  mockTransport((call) => {
    const path = new URL(call.url).pathname;
    if (path.startsWith('/shows/hold-')) return null;
    if (path === '/oauth/token') {
      refreshes += 1;
      return { status: 200, body: { access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600 } };
    }
    if (path === '/sync/target') {
      return call.headers.Authorization === 'Bearer fresh-access' ? { status: 200, body: {} } : { status: 401, body: {} };
    }
    return { status: 200, body: {} };
  });
  const holds = ['a', 'b', 'c', 'd'].map((name) => apiGet(`/shows/hold-${name}`));
  await settle();
  assert.equal(calls.length, 4, 'all four transport slots are held');
  const write = apiAuth('POST', '/sync/target', {});
  await settle();
  assert.equal(calls.filter((call) => new URL(call.url).pathname === '/sync/target').length, 0,
    'the write is waiting for a slot');

  // Another request rotated tokens during that wait, after this write read its pre-slot snapshot.
  storage.set(STORAGE.tokens, {
    access_token: 'slot-access', refresh_token: 'slot-refresh', client_id: 'client',
    expires_at: Date.now() + 3600000,
  });
  const holdCalls = calls.filter((call) => new URL(call.url).pathname.startsWith('/shows/hold-'));
  holdCalls[0].onload({ status: 200, responseText: '[]', responseHeaders: '' });
  await settle();

  const targets = calls.filter((call) => new URL(call.url).pathname === '/sync/target');
  assert.equal(targets.length, 1);
  assert.equal(targets[0].headers.Authorization, 'Bearer slot-access');
  assert.equal(refreshes, 1, 'the dispatched token gets its own refresh instead of reusing the stale snapshot');
  assert.equal(storage.get(STORAGE.tokens).access_token, 'fresh-access');
  t.mock.timers.tick(1000); await settle();
  await write;
  const retries = calls.filter((call) => new URL(call.url).pathname === '/sync/target');
  assert.equal(retries.length, 2);
  assert.equal(retries[1].headers.Authorization, 'Bearer fresh-access');

  for (const call of holdCalls.slice(1)) call.onload({ status: 200, responseText: '[]', responseHeaders: '' });
  await Promise.all(holds);
});

test('a Retry-After beyond a minute fails now and fails later writes fast until it passes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 20_000_000 });
  reset();
  let limited = true;
  mockTransport(() => (limited ? { status: 429, headers: 'retry-after: 600\r\n' } : { status: 200, body: {} }));
  const first = apiAuth('POST', '/sync/first', {});
  await assert.rejects(first, (error) => error.status === 429);
  assert.equal(calls.length, 1, 'no early retry of the rejected write');
  await assert.rejects(apiAuth('POST', '/sync/second', {}), (error) => error.status === 429);
  assert.equal(calls.length, 1, 'later writes are not sent inside the block, and do not hang the queue');
  limited = false;
  t.mock.timers.tick(600_000); await settle();
  const third = apiAuth('POST', '/sync/third', {});
  await settle();
  await third;
  assert.equal(calls.length, 2);
});

test('the public transport gives up on a Retry-After beyond a minute instead of holding a slot', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 21_000_000 });
  reset();
  mockTransport(() => ({ status: 429, headers: 'retry-after: 600\r\n' }));
  const response = await request({ url: 'https://api.trakt.tv/shows/test', method: 'GET', retries: 2 });
  assert.equal(response.status, 429);
  assert.equal(calls.length, 1);
});
