import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiType, normalizeWatchlistItem, pickWatchlistItem, watchlistItems, watchlistLabel, watchlistType,
} from '../src/features/watchlist-pick/data.js';
import { createWatchlistApi, PAGE_SIZE } from '../src/features/watchlist-pick/api.js';

const movie = {
  type: 'movie',
  movie: { title: 'Project Hail Mary', year: 2026, ids: { slug: 'project-hail-mary-2026', trakt: 531178 } },
};
const show = {
  type: 'show', show: { title: 'Breaking Bad', year: 2008, ids: { slug: 'breaking-bad', trakt: 1388 } },
};
const season = {
  type: 'season',
  show: { title: 'Breaking Bad', year: 2008, ids: { slug: 'breaking-bad' } },
  season: { number: 2, ids: { trakt: 302 } },
};
const episode = {
  type: 'episode',
  show: { title: 'Ted Lasso', year: 2020, ids: { slug: 'ted-lasso' } },
  episode: { title: 'Do the Right-est Thing', season: 2, number: 3, ids: { trakt: 5256056 } },
};

test('normalizes movies, shows, seasons and episodes into title links', () => {
  assert.deepEqual(normalizeWatchlistItem(movie), {
    key: 'movie:project-hail-mary-2026', kind: 'movie', title: 'Project Hail Mary', year: 2026,
    subtitle: null, href: '/movies/project-hail-mary-2026',
  });
  assert.deepEqual(normalizeWatchlistItem(show), {
    key: 'show:breaking-bad', kind: 'show', title: 'Breaking Bad', year: 2008,
    subtitle: null, href: '/shows/breaking-bad',
  });
  assert.deepEqual(normalizeWatchlistItem(season), {
    key: 'season:breaking-bad:2', kind: 'season', title: 'Breaking Bad', year: 2008,
    subtitle: 'Season 2', href: '/shows/breaking-bad/seasons/2',
  });
  assert.deepEqual(normalizeWatchlistItem(episode), {
    key: 'episode:ted-lasso:2:3', kind: 'episode', title: 'Ted Lasso', year: 2020,
    subtitle: 'S2E3 · Do the Right-est Thing', href: '/shows/ted-lasso/seasons/2/episodes/3',
  });
});

test('accepts numeric ids, encodes slugs and drops unusable entries', () => {
  assert.equal(normalizeWatchlistItem({ type: 'movie', movie: { title: '13', ids: { trakt: 13 } } }).href, '/movies/13');
  assert.equal(normalizeWatchlistItem({ type: 'show', show: { title: 'Odd Name', ids: { slug: 'odd name' } } }).href,
    '/shows/odd%20name');

  for (const raw of [
    null, [], {}, { type: 'person', person: { ids: { slug: 'x' } } }, { type: 'movie' },
    { type: 'movie', movie: { title: '', ids: { slug: 'x' } } },
    { type: 'movie', movie: { title: 'No id', ids: {} } },
    { type: 'season', show: { title: 'No number', ids: { slug: 'x' } }, season: { ids: { trakt: 1 } } },
    { type: 'episode', show: { title: 'No episode', ids: { slug: 'x' } }, episode: { season: 1 } },
    { type: 'episode', show: { title: 'No show id' }, episode: { season: 1, number: 1 } },
  ]) assert.equal(normalizeWatchlistItem(raw), null, JSON.stringify(raw));
  assert.deepEqual(watchlistItems([movie, null, 'x', show]), [normalizeWatchlistItem(movie), normalizeWatchlistItem(show)]);
  assert.deepEqual(watchlistItems({}), []);
});

test('reads the singular display filter from the query or a legacy path type', () => {
  assert.equal(watchlistType('?display=movie'), 'movie');
  assert.equal(watchlistType('display=shows'), 'show');
  assert.equal(watchlistType('?display=season'), 'season');
  assert.equal(watchlistType('?display=episodes'), 'episode');
  assert.equal(watchlistType('?display=show', 'movies'), 'show', 'the page query wins');
  assert.equal(watchlistType('', 'movies'), 'movie');
  assert.equal(watchlistType('?display=all'), null);
  assert.equal(watchlistType('?display=people'), null);
  assert.equal(watchlistType(''), null);
  assert.equal(apiType('movie'), 'movies');
  assert.equal(apiType('episode'), 'episodes');
  assert.equal(apiType(null), null);
});

test('labels the picked title and can avoid an immediate repeat', () => {
  assert.equal(watchlistLabel(normalizeWatchlistItem(movie)), 'Project Hail Mary (2026)');
  assert.equal(watchlistLabel(normalizeWatchlistItem(season)), 'Breaking Bad (2008) — Season 2');
  assert.equal(watchlistLabel(null), '');

  const items = [normalizeWatchlistItem(movie), normalizeWatchlistItem(show)];
  assert.equal(pickWatchlistItem(items, null, () => 0).title, 'Project Hail Mary');
  assert.equal(pickWatchlistItem(items, items[0].key, () => 0).title, 'Breaking Bad', 'the same title is not picked twice');
  assert.equal(pickWatchlistItem(items, null, () => 0.999).title, 'Breaking Bad');
  assert.equal(pickWatchlistItem([], null), null);
  assert.equal(pickWatchlistItem(null, null), null);
});

test('Pick again excludes the previous pick before sampling', () => {
  const item = (slug) => normalizeWatchlistItem({ type: 'movie', movie: { title: slug.toUpperCase(), ids: { slug } } });
  const items = [item('a'), item('b'), item('c')];
  assert.equal(pickWatchlistItem(items, items[0].key, () => 0).title, 'B');
  assert.equal(pickWatchlistItem(items, items[0].key, () => 0.5).title, 'C');
  assert.equal(pickWatchlistItem(items, items[0].key, () => 0.999).title, 'C');
  assert.equal(pickWatchlistItem(items, 'movie:missing', () => 0).title, 'A', 'an absent previous pick keeps every candidate');
  assert.equal(pickWatchlistItem([items[0]], items[0].key, () => 0).title, 'A', 'a lone candidate is still returned');
});

test('public watchlist reads walk pages until a short one and keep the filter', async () => {
  const calls = [];
  const api = createWatchlistApi({
    signedIn: () => false,
    get: async (path, options) => {
      calls.push({ path, options });
      const page = Number(new URL(`https://api.trakt.tv${path}`).searchParams.get('page'));
      return page === 1 ? Array.from({ length: PAGE_SIZE }, () => movie) : page === 2 ? [movie] : [];
    },
  });

  const rows = await api.list('justin', { display: 'movie' });
  assert.equal(rows.length, PAGE_SIZE + 1);
  assert.deepEqual(calls.map((call) => call.path), [
    `/users/justin/watchlist/movies?page=1&limit=${PAGE_SIZE}`,
    `/users/justin/watchlist/movies?page=2&limit=${PAGE_SIZE}`,
  ]);
  assert.deepEqual(calls.map((call) => call.options), [{ ttl: 0 }, { ttl: 0 }], 'public reads bypass the shared cache');
});

test('signed-in watchlist reads use Trakt page counts', async () => {
  const calls = [];
  const api = createWatchlistApi({
    signedIn: () => true,
    authPage: async (path, options) => {
      calls.push([path, options.page, options.limit]);
      return options.page === 1 ? { data: [movie], pages: 2 } : { data: [show], pages: 2 };
    },
  });

  const rows = await api.list('justin');
  assert.equal(rows.length, 2);
  assert.deepEqual(calls, [
    ['/users/justin/watchlist', 1, PAGE_SIZE],
    ['/users/justin/watchlist', 2, PAGE_SIZE],
  ]);
});
