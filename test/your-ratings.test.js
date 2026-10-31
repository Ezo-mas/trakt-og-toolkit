import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRatings, forShow, personalAverage, averageLabel, linePath, mapStats } from '../src/features/your-ratings/data.js';
import { createRatingsApi } from '../src/features/your-ratings/api.js';
const row = (number, rating, show = 1388, season = 1) => ({ rating, show: { ids: { trakt: show, slug: show === 1388 ? 'breaking-bad' : 'other' } }, episode: { season, number } });
test('personal averages deduplicate and separate shows and seasons; one rating is insufficient', () => {
  const rows = mapRatings([row(1, 8), row(1, 9), row(2, 7), row(3, 0), row(4, 11), row(5, NaN), row(1, 2, 99), row(1, 10, 1388, 2)]);
  const show = forShow(rows, 'breaking-bad');
  assert.equal(show.length, 3);
  assert.equal(forShow(rows, '1388').length, 3);
  assert.equal(forShow(rows, 'missing').length, 0);
  const season = show.filter((r) => r.season === 1);
  assert.equal(personalAverage(season), 8);
  assert.equal(averageLabel(season, 7), 'Your average: 8.0 (2 of 7 episodes rated)');
  assert.equal(averageLabel(season.slice(0, 1)), '');
  assert.equal(personalAverage([]), null);
});
test('personal line has gaps and count statistics accept zero but reject malformed responses', () => {
  assert.equal(linePath([{ number: 1, x: 1, y: 3 }, { number: 2, x: 2, y: 4 }, { number: 4, x: 4, y: 2 }]), 'M1,3L2,4M4,2');
  assert.deepEqual(mapStats({ watchers: 0, comments: 2 }), { watchers: 0, comments: 2 });
  assert.throws(() => mapStats({ watchers: -1, comments: 0 }));
  assert.throws(() => mapStats({ watchers: 1 }));
});
test('ratings share a flight, expire after ten minutes, and never retain failed or old-session results', async () => {
  let time = 0, calls = 0, signed = true, fail = false;
  let resolve;
  const api = createRatingsApi({ now: () => time, signedIn: () => signed, auth: async (method, path) => {
    calls++; assert.equal(method, 'GET'); assert.equal(path, '/sync/ratings/episodes');
    if (fail) throw Error('unavailable');
    return new Promise((r) => { resolve = r; });
  } });
  const a = api.load(), b = api.load(); resolve([row(1, 8)]);
  assert.deepEqual(await a, await b); assert.equal(calls, 1);
  await api.load(); assert.equal(calls, 1);
  time = 600001;
  const c = api.load(); resolve([]); await c; assert.equal(calls, 2);
  api.resetSession(); fail = true; await assert.rejects(api.load());
  fail = false; const d = api.load(); api.resetSession(); resolve([row(1, 9)]); await assert.rejects(d, /session changed/);
  signed = false; assert.deepEqual(await api.load(), []);
  signed = true; const e = api.load(); resolve([row(2, 5)]); assert.equal((await e)[0].rating, 5);
});
