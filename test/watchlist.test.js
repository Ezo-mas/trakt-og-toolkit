import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parseRoute } from '../src/core/router.js';
import { watchlistLookup, watchlistBody, readWatchlisted } from '../src/features/watchlist/data.js';
import { createWatchlistApi } from '../src/features/watchlist/api.js';
import { WATCHLIST_HTML } from './fixtures.js';

const cases = [
  ['/movies/fight-club-1999', 'movies', '/movies/fight-club-1999', { ids: { trakt: 1 } }],
  ['/shows/breaking-bad', 'shows', '/shows/breaking-bad', { ids: { trakt: 2 } }],
  ['/shows/breaking-bad/seasons/0', 'seasons', '/shows/breaking-bad/seasons', [{ number: 1, ids: { trakt: 99 } }, { number: 0, ids: { trakt: 3 } }]],
  ['/shows/breaking-bad/seasons/1/episodes/2', 'episodes', '/shows/breaking-bad/seasons/1/episodes/2', { ids: { trakt: 4 } }],
];

test('watchlist resolves the exact movie/show/season/episode and posts just its Trakt ID', async () => {
  for (const [index, [path, type, lookupPath, data]] of cases.entries()) {
    const reads = [], writes = [];
    const api = createWatchlistApi({ signedIn: () => true,
      get: async (...args) => { reads.push(args); return data; },
      auth: async (...args) => { writes.push(args); return { added: { [type]: 1 } }; } });
    await api.add(parseRoute(path));
    assert.deepEqual(reads, [[lookupPath]]);
    assert.deepEqual(writes, [['POST', '/sync/watchlist', { [type]: [{ ids: { trakt: index + 1 } }] }]]);
  }
  assert.equal(watchlistLookup({ kind: 'movie', name: 'title', id: 'a/b ?' }).path, '/movies/a%2Fb%20%3F');
});

test('watchlist rejects unsupported pages and missing, malformed or wrong-season IDs', () => {
  for (const path of ['/', '/people/bryan-cranston', '/shows/breaking-bad/seasons', '/shows/breaking-bad/stats']) {
    assert.equal(watchlistLookup(parseRoute(path)), null);
  }
  for (const id of [null, undefined, 0, -1, 1.5, '12', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => watchlistBody(watchlistLookup(parseRoute('/movies/test')), { ids: { trakt: id } }), /identify/);
  }
  assert.throws(() => watchlistBody(watchlistLookup(parseRoute('/shows/test/seasons/1')), [{ number: 2, ids: { trakt: 12 } }]), /identify/);
});

test('watchlist requires a positive matching added/existing count and rejects not_found or empty results', async () => {
  for (const result of [null, {}, { added: { movies: 0 } }, { added: { shows: 1 } },
    { added: { movies: '1' } }, { added: { movies: 1 }, not_found: { movies: [{}] } },
    { existing: { movies: 1 }, not_found: { movies: null } }]) {
    const api = createWatchlistApi({ signedIn: () => true, get: async () => ({ ids: { trakt: 1 } }), auth: async () => result });
    await assert.rejects(api.add(parseRoute('/movies/test')));
  }
  const api = createWatchlistApi({ signedIn: () => true, get: async () => ({ ids: { trakt: 1 } }),
    auth: async () => ({ existing: { movies: 1 }, added: { movies: 0 }, not_found: { movies: [] } }) });
  assert.deepEqual(await api.add(parseRoute('/movies/test')), { cancelled: false });
});

test('watchlist never writes when signed out, lookup fails, or the session/navigation changes', async () => {
  let signedIn = false, active = true, writes = 0;
  const api = createWatchlistApi({ signedIn: () => signedIn,
    get: async () => { active = false; return { ids: { trakt: 1 } }; }, auth: async () => { writes++; } });
  await assert.rejects(api.add(parseRoute('/movies/test')), /Sign in/);
  signedIn = true;
  assert.deepEqual(await api.add(parseRoute('/movies/test'), { active: () => active }), { cancelled: true });
  await assert.rejects(api.add(parseRoute('/people/test')), /Unsupported/);
  const badLookup = createWatchlistApi({ signedIn: () => true, get: async () => ({}), auth: async () => { writes++; } });
  await assert.rejects(badLookup.add(parseRoute('/movies/test')), /identify/);
  const signOut = createWatchlistApi({ signedIn: () => signedIn,
    get: async () => { signedIn = false; return { ids: { trakt: 1 } }; }, auth: async () => { writes++; } });
  assert.deepEqual(await signOut.add(parseRoute('/movies/test')), { cancelled: true });
  assert.equal(writes, 0);
});

test('native watchlist reader distinguishes Watchlist from custom-list membership and picker text', t => {
  const window = new Window(); t.after(() => window.close());
  window.document.write(WATCHLIST_HTML);
  const anchor = window.document.querySelector('.action-buttons');
  const action = anchor.querySelector('.list-control .summary-action');
  assert.equal(readWatchlisted(anchor), false);
  action.classList.add('selected');
  action.querySelector('.title').textContent = 'Listed On';
  const detail = window.document.createElement('span'); detail.className = 'detail'; action.querySelector('.text').append(detail);
  for (const [text, expected] of [['3 lists', false], ['Watchlist', true], ['Watchlist + 3 lists', true], ['Watchlist picks', false], ['', false]]) {
    detail.textContent = text;
    assert.equal(readWatchlisted(anchor), expected, text);
  }
  anchor.querySelector('.picker').innerHTML = '<button aria-pressed="true"><span class="name">Watchlist</span></button>';
  assert.equal(readWatchlisted(anchor), false);
});
