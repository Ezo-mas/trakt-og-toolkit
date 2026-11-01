import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../src/core/router.js';

test('title pages', () => {
  assert.deepEqual(
    { name: 'title', kind: 'show', id: 'breaking-bad' },
    pick(parseRoute('/shows/breaking-bad'), ['name', 'kind', 'id']),
  );
  assert.deepEqual(
    { name: 'title', kind: 'movie', id: '13' },
    pick(parseRoute('/movies/13'), ['name', 'kind', 'id']),
  );
});

test('trailing slash and query are ignored by the key', () => {
  assert.equal(parseRoute('/shows/1388/').key, '/shows/1388');
});

test('season and episode pages', () => {
  const season = parseRoute('/shows/breaking-bad/seasons/5');
  assert.equal(season.name, 'season');
  assert.equal(season.season, 5);
  assert.equal(season.episode, null);

  const episode = parseRoute('/shows/breaking-bad/seasons/5/episodes/14');
  assert.equal(episode.name, 'episode');
  assert.equal(episode.season, 5);
  assert.equal(episode.episode, 14);
});

test('seasons overview and the all-episodes list are separate routes', () => {
  assert.equal(parseRoute('/shows/breaking-bad/seasons').name, 'seasons');
  const all = parseRoute('/shows/breaking-bad/seasons/all');
  assert.equal(all.name, 'all-episodes');
  assert.equal(all.season, null);
});

test('sub-pages keep the title id', () => {
  const stats = parseRoute('/shows/breaking-bad/stats');
  assert.equal(stats.name, 'stats');
  assert.equal(stats.kind, 'show');
  assert.equal(stats.id, 'breaking-bad');
});

test('chart pages are not titles', () => {
  for (const path of ['/shows/trending', '/movies/boxoffice', '/shows/watched/weekly', '/movies/popular']) {
    const route = parseRoute(path);
    assert.equal(route.name, 'chart', path);
    assert.equal(route.id, null, path);
  }
});

test('non-title routes', () => {
  for (const path of ['/users/me', '/search']) {
    assert.equal(parseRoute(path).name, 'other', path);
  }
});

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

test('user progress routes include tab and sort variants', () => {
  for (const path of ['/users/tester/progress', '/users/tester/progress/rewatching/title/asc']) {
    assert.equal(parseRoute(path).name, 'progress'); assert.equal(parseRoute(path).id, 'tester');
  }
  assert.equal(parseRoute('/users/tester/history').name, 'other');
});

test('person routes match only a person page', () => {
  assert.deepEqual(parseRoute('/people/bryan-cranston'), {
    name: 'person', kind: 'person', id: 'bryan-cranston', path: '/people/bryan-cranston', key: '/people/bryan-cranston',
  });
  assert.equal(parseRoute('/people/bryan-cranston/').name, 'person');
  for (const path of ['/people', '/people/bryan-cranston/credits']) {
    assert.equal(parseRoute(path).name, 'other');
  }
  assert.equal(parseRoute('/shows/breaking-bad').name, 'title');
  assert.equal(parseRoute('/movies/13').name, 'title');
});

test('dashboard routes', () => { for (const path of ['/', '/dashboard', '/dashboard/']) assert.equal(parseRoute(path).name, 'dashboard'); });
