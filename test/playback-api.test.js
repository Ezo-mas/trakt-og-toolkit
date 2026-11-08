import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackApi } from '../src/features/playback/api.js';

const row = (id = 1) => ({ id, progress: 42, paused_at: '2026-10-01T00:00:00Z', movie: { title: 'Movie', ids: { trakt: 1 } } });

test('authenticated loads request images and cache/dedupe for a minute', async () => {
  let now = 0; const calls = [];
  const api = createPlaybackApi({ signedIn: () => true, now: () => now, auth: async (...args) => { calls.push(args); return [row()]; } });
  await Promise.all([api.load('movie'), api.load('movie')]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['GET', '/sync/playback/movies', undefined, { extended: 'images' }]);
  now = 59999; await api.load('movie'); assert.equal(calls.length, 1);
  now = 60000; await api.load('movie'); assert.equal(calls.length, 2);
});
test('signed-out requests stay local and session changes discard in-flight data', async () => {
  let signedIn = false; let resolve;
  const api = createPlaybackApi({ signedIn: () => signedIn, auth: () => new Promise((r) => { resolve = r; }) });
  assert.deepEqual(await api.loadAll(), []);
  signedIn = true; const loading = api.load('movie');
  api.resetSession(); resolve([row()]);
  await assert.rejects(loading, /session changed/);
});
test('single clear confirms exact count, deletes playback ID and invalidates cache', async () => {
  const calls = [];
  const api = createPlaybackApi({ signedIn: () => true, auth: async (...args) => { calls.push(args); return args[0] === 'GET' ? [row(99)] : null; } });
  await api.load('movie');
  const result = await api.clearItems([99], (text) => { assert.match(text, /1 item\?/); return true; });
  assert.deepEqual(result, { cancelled: false, cleared: [99], failed: [] });
  assert.deepEqual(calls[1], ['DELETE', '/sync/playback/99']);
  await api.load('movie'); assert.equal(calls.length, 3);
});
test('cancelled delete and invalid IDs never send deletion requests', async () => {
  let calls = 0;
  const api = createPlaybackApi({ signedIn: () => true, auth: async () => { calls++; } });
  assert.equal((await api.clearItems([1, 1, 2], (text) => { assert.match(text, /2 items/); return false; })).cancelled, true);
  await assert.rejects(api.clearItems(['../../users/me'], () => true), /Invalid/);
  assert.equal(calls, 0);
});
test('bulk clear has at most four in flight, reports partial failure, and refreshes fresh data', async () => {
  let active = 0, max = 0, gets = 0;
  const deleted = [];
  const api = createPlaybackApi({ signedIn: () => true, auth: async (method, path) => {
    if (method === 'GET') { gets++; return [row()]; }
    active++; max = Math.max(max, active);
    await new Promise((r) => setTimeout(r, 1)); active--;
    const id = Number(path.split('/').at(-1)); deleted.push(id);
    if (id === 3 || id === 6) throw new Error('safe failure');
    return null;
  } });
  await api.load('movie');
  const result = await api.clearItems([1, 2, 3, 4, 5, 6, 7, 1], (text) => { assert.match(text, /7 items/); return true; });
  assert.ok(max <= 4); assert.equal(max, 4);
  assert.deepEqual(result.failed.sort(), [3, 6]); assert.equal(result.cleared.length, 5);
  assert.equal(deleted.length, 7);
  await api.load('movie'); assert.equal(gets, 2);
});
const movieItem = { kind: 'movie', ids: { trakt: 1, slug: 'the-dark-2005' }, title: 'The Dark', year: 2005 };

test('setProgress sends start then pause, never stop, and invalidates cached playback', async () => {
  const writes = []; let gets = 0;
  const api = createPlaybackApi({ signedIn: () => true, auth: async (method, path, body) => {
    if (method === 'GET') { gets++; return [row()]; }
    writes.push({ method, path, body }); return {};
  } });
  await api.load('movie');
  const result = await api.setProgress(movieItem, 42.55);
  assert.equal(result.progress, 42.6);
  assert.deepEqual(writes.map((call) => call.path), ['/scrobble/start', '/scrobble/pause']);
  assert.ok(writes.every((call) => call.method === 'POST'));
  assert.deepEqual(writes[0].body, { movie: { ids: { trakt: 1 }, title: 'The Dark', year: 2005 }, progress: 42.6 });
  assert.deepEqual(writes[1].body, writes[0].body);
  assert.equal(writes.some((call) => call.path === '/scrobble/stop'), false);
  await api.load('movie'); assert.equal(gets, 2);
});
test('the completion pause ignores page teardown once start has run', async () => {
  let active = true;
  const writes = [];
  const api = createPlaybackApi({ signedIn: () => true, auth: async (method, path, body, options, control) => {
    writes.push({ path, control });
    if (path.endsWith('/start')) active = false;
    return {};
  } });
  await api.setProgress(movieItem, 10, undefined, { active: () => active });
  assert.deepEqual(writes.map((write) => write.path), ['/scrobble/start', '/scrobble/pause']);
  assert.equal(typeof writes[0].control.active, 'function', 'start still respects page teardown');
  assert.equal(writes[1].control, undefined, 'pause is left to the authenticated session check');
});

test('episode progress reuses ids and only looks up a missing episode', async () => {
  const writes = []; const gets = [];
  const api = createPlaybackApi({ signedIn: () => true,
    get: async (path) => { gets.push(path); return { ids: { trakt: 4 } }; },
    auth: async (method, path, body) => { writes.push({ method, path, body }); return {}; } });
  await api.setProgress({ kind: 'episode', ids: { slug: 'breaking-bad' }, season: 1, episode: 1 }, 50);
  assert.deepEqual(gets, ['/shows/breaking-bad/seasons/1/episodes/1']);
  assert.deepEqual(writes[0].body, { episode: { ids: { trakt: 4 } }, progress: 50 });
  await api.setProgress({ kind: 'episode', ids: { trakt: 1388 }, episodeIds: { trakt: 5 }, season: 1, episode: 2 }, 25);
  assert.deepEqual(gets, ['/shows/breaking-bad/seasons/1/episodes/1']);
  assert.deepEqual(writes[2].body, { episode: { ids: { trakt: 5 } }, progress: 25 });
});
test('route progress looks up movie metadata and episode ids', async () => {
  const writes = []; const gets = [];
  const api = createPlaybackApi({ signedIn: () => true,
    get: async (path) => { gets.push(path); return path.startsWith('/movies/')
      ? { ids: { trakt: 1 }, title: 'The Dark', year: 2005 } : { ids: { trakt: 4 } }; },
    auth: async (method, path, body) => { writes.push({ method, path, body }); return {}; } });
  await api.setRouteProgress({ name: 'title', kind: 'movie', id: 'the-dark-2005' }, 20);
  await api.setRouteProgress({ name: 'episode', kind: 'show', id: 'breaking-bad', season: 1, episode: 1 }, 60);
  assert.deepEqual(gets, ['/movies/the-dark-2005', '/shows/breaking-bad/seasons/1/episodes/1']);
  assert.deepEqual(writes.map((call) => call.path), ['/scrobble/start', '/scrobble/pause', '/scrobble/start', '/scrobble/pause']);
  assert.deepEqual(writes[0].body, { movie: { ids: { trakt: 1 }, title: 'The Dark', year: 2005 }, progress: 20 });
  assert.deepEqual(writes[2].body, { episode: { ids: { trakt: 4 } }, progress: 60 });
});
test('invalid progress, signed-out saves and missing ids send nothing', async () => {
  const writes = [];
  const api = createPlaybackApi({ signedIn: () => true, auth: async (...args) => { writes.push(args); return {}; } });
  await assert.rejects(api.setProgress(movieItem, 101), /Invalid progress/);
  await assert.rejects(api.setProgress({ ...movieItem, ids: {} }, 20), /identify this title/);
  await assert.rejects(api.setProgress({ kind: 'episode', ids: { trakt: 2 } }, 20), /identify this episode/);
  assert.equal(writes.length, 0);
  const signedOut = createPlaybackApi({ signedIn: () => false, auth: async (...args) => { writes.push(args); } });
  await assert.rejects(signedOut.setProgress(movieItem, 20), /Sign in/);
  assert.equal(writes.length, 0);
});
test('failed start sends no pause and a failed pause rejects', async () => {
  const paths = [];
  const startFailure = createPlaybackApi({ signedIn: () => true, auth: async (method, path) => {
    paths.push(path); if (path.endsWith('/start')) throw new Error('start failed');
  } });
  await assert.rejects(startFailure.setProgress(movieItem, 10), /start failed/);
  assert.deepEqual(paths, ['/scrobble/start']);
  const pausePaths = [];
  const pauseFailure = createPlaybackApi({ signedIn: () => true, auth: async (method, path) => {
    pausePaths.push(path); if (path.endsWith('/pause')) throw new Error('pause failed');
  } });
  await assert.rejects(pauseFailure.setProgress(movieItem, 10), (error) => /pause failed/.test(error.message) && error.partial === true);
  assert.deepEqual(pausePaths, ['/scrobble/start', '/scrobble/pause']);
});
test('session changes during episode lookup stop the scrobble', async () => {
  let api; const writes = [];
  api = createPlaybackApi({ signedIn: () => true, get: async () => { api.resetSession(); return { ids: { trakt: 4 } }; },
    auth: async (...args) => { writes.push(args); return {}; } });
  await assert.rejects(api.setProgress({ kind: 'episode', ids: { slug: 'show' }, season: 1, episode: 1 }, 20), /session changed/);
  assert.equal(writes.length, 0);
});
test('failed/malformed loads are not cached and session changes stop queued deletes', async () => {
  let calls = 0; let api;
  api = createPlaybackApi({ signedIn: () => true, auth: async (method) => {
    calls++;
    if (method === 'GET') return {};
    api.resetSession();
  } });
  await assert.rejects(api.load('movie'), /Invalid/); await assert.rejects(api.load('movie'), /Invalid/);
  assert.equal(calls, 2);
  const result = await api.clearItems([1, 2, 3, 4, 5], () => true);
  assert.equal(result.cleared.length, 1); assert.equal(result.failed.length, 4);
});
test('a failed start is not partial, and a session change during a movie lookup sends nothing', async () => {
  const startFailure = createPlaybackApi({ signedIn: () => true, auth: async () => { throw new Error('start failed'); } });
  await assert.rejects(startFailure.setProgress(movieItem, 10), (error) => error.partial === undefined);
  let api; const writes = [];
  api = createPlaybackApi({ signedIn: () => true, get: async () => { api.resetSession(); return { ids: { trakt: 1 }, title: 'The Dark', year: 2005 }; },
    auth: async (...args) => { writes.push(args); return {}; } });
  await assert.rejects(api.setRouteProgress({ name: 'title', kind: 'movie', id: 'the-dark-2005' }, 20), /session changed/);
  assert.equal(writes.length, 0);
  await assert.rejects(api.setProgress(movieItem, 0), /Invalid progress/);
});
