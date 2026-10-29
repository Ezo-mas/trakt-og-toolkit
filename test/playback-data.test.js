import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPlayback, sortPlayback, olderThan, matchesRoute } from '../src/features/playback/data.js';

const movie = { id: 99, progress: 42.5, paused_at: '2026-10-01T12:00:00Z', type: 'movie',
  movie: { title: 'Movie', ids: { trakt: 1, slug: 'movie' }, images: { poster: ['media.trakt.tv/images/poster.jpg'] } } };
const episode = { id: 100, progress: 80, paused_at: '2026-10-02T12:00:00Z', type: 'episode',
  show: { title: 'Show', ids: { trakt: 2, slug: 'show' } }, episode: { season: 0, number: 1, title: 'Special' } };

test('maps movie and episode playback IDs, media routes, posters and progress', () => {
  const [m] = mapPlayback([movie], 'movie'); const [e] = mapPlayback([episode], 'episode');
  assert.equal(m.id, 99); assert.equal(m.href, '/movies/movie'); assert.equal(m.progress, 42.5);
  assert.equal(m.poster, 'https://media.trakt.tv/images/poster.jpg');
  assert.equal(e.href, '/shows/show/seasons/0/episodes/1'); assert.match(e.title, /Show · 0×01 · Special/);
  assert.equal(e.poster, null);
  assert.equal(mapPlayback([{ ...movie, movie: { ids: { trakt: 1 } } }], 'movie')[0].href, '/movies/1');
});
test('filters malformed entries and unsafe poster URLs', () => {
  assert.deepEqual(mapPlayback([null, {}, { ...movie, id: 1.5 }, { ...movie, progress: -1 },
    { ...movie, progress: null }, { ...movie, paused_at: 'bad' }], 'movie'), []);
  assert.deepEqual(mapPlayback([{ ...episode, episode: { season: 1 } }], 'episode'), []);
  const row = { ...movie, movie: { ...movie.movie, images: { poster: ['javascript:alert(1)'] } } };
  assert.equal(mapPlayback([row], 'movie')[0].poster, null);
  assert.equal(mapPlayback([{ ...movie, progress: 0 }], 'movie')[0].progress, 0);
});
test('sorts newest paused first with deterministic ties, without mutating inputs', () => {
  const m = mapPlayback([movie], 'movie')[0], e = mapPlayback([episode], 'episode')[0];
  const items = [m, e]; assert.deepEqual(sortPlayback(items).map((v) => v.id), [100, 99]);
  assert.deepEqual(items.map((v) => v.id), [99, 100]);
  assert.deepEqual(sortPlayback([m, { ...m, id: 98 }]).map((v) => v.id), [98, 99]);
});
test('age filter uses strict elapsed days and excludes invalid inputs', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');
  const items = [...mapPlayback([movie], 'movie'), ...mapPlayback([episode], 'episode')];
  assert.deepEqual(olderThan(items, 1, now).map((v) => v.id), [99]);
  assert.equal(olderThan(items, 0, now).length, 2);
  for (const days of ['', ' ', 'invalid', -1, Infinity]) assert.deepEqual(olderThan(items, days, now), []);
});
test('badge matching uses slug or Trakt ID and exact season/episode', () => {
  const m = mapPlayback([movie], 'movie')[0], e = mapPlayback([episode], 'episode')[0];
  assert.ok(matchesRoute(m, { name: 'title', kind: 'movie', id: '1' }));
  assert.ok(matchesRoute(e, { name: 'episode', kind: 'show', id: 'show', season: 0, episode: 1 }));
  assert.equal(matchesRoute(e, { name: 'episode', kind: 'show', id: 'show', season: 1, episode: 1 }), false);
});
