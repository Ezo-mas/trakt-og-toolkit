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
