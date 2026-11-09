import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parseRoute } from '../src/core/router.js';
import { watchlistLookup, watchlistBody, watchlistBulkItems, watchlistBulkBody, readWatchlisted, readCardRoute, readCreditControl, readCardWatchlisted } from '../src/features/watchlist/data.js';
import { createWatchlistApi } from '../src/features/watchlist/api.js';
import { WATCHLIST_HTML, PERSON_CREDITS_HTML, watchlistCardHtml } from './fixtures.js';

const cases = [
  ['/movies/fight-club-1999', 'movies', '/movies/fight-club-1999', { ids: { trakt: 1 } }],
  ['/shows/breaking-bad', 'shows', '/shows/breaking-bad', { ids: { trakt: 2 } }],
  ['/shows/breaking-bad/seasons/0', 'seasons', '/shows/breaking-bad/seasons', [{ number: 1, ids: { trakt: 99 } }, { number: 0, ids: { trakt: 3 } }]],
  ['/shows/breaking-bad/seasons/1/episodes/2', 'episodes', '/shows/breaking-bad/seasons/1/episodes/2', { ids: { trakt: 4 } }],
];

test('successful additions return the API title without another lookup', async () => {
  let reads = 0;
  const title = 'Spider-Man: Brand New Day';
  const api = createWatchlistApi({ signedIn: () => true,
    get: async () => { reads++; return { ids: { trakt: 1 }, title }; },
    auth: async () => ({ added: { movies: 1 } }) });
  assert.deepEqual(await api.add(parseRoute('/movies/test')), { cancelled: false, title,
    body: { movies: [{ ids: { trakt: 1 } }] }, undoable: true });
  assert.equal(reads, 1);
});

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
  assert.deepEqual(await api.add(parseRoute('/movies/test')), { cancelled: false, title: 'this title',
    body: { movies: [{ ids: { trakt: 1 } }] }, undoable: false });
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

test('card route reader allows only whole movies/shows using their image links', t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/trending' }); t.after(() => window.close());
  for (const [href, expected] of [
    ['/movies/fight-club-1999', 'title'], ['/shows/breaking-bad', 'title'],
    ['/shows/breaking-bad/seasons/0', undefined], ['/shows/breaking-bad/seasons/1/episodes/2', undefined],
    ['https://example.com/movies/test', undefined], ['/people/test', undefined], ['/movies/trending', undefined],
  ]) {
    window.document.body.innerHTML = watchlistCardHtml({ href });
    // Subtitles can point to something else, so they cannot identify a card.
    window.document.querySelector('.titles-link').href = '/shows/wrong-show';
    assert.equal(readCardRoute(window.document.querySelector('article'))?.name, expected, href);
  }
});

test('person credit rows resolve whole movies/shows from their poster link and reuse the card list control', t => {
  const window = new Window({ url: 'https://og.trakt.tv/people/bryan-cranston' }); t.after(() => window.close());
  window.document.body.innerHTML = PERSON_CREDITS_HTML;
  const rows = [...window.document.querySelectorAll('article.credit-row')];
  assert.deepEqual(rows.map(row => readCardRoute(row)?.name), ['title', 'title']);
  assert.deepEqual(rows.map(row => readCardRoute(row)?.kind), ['movie', 'show']);
  assert.ok(rows.every(row => readCreditControl(row)?.matches('.list-control.card')));
  rows[0].querySelector('a.poster').setAttribute('href', '/shows/breaking-bad/seasons/1');
  assert.equal(readCardRoute(rows[0]), null, 'season rows have no shortcut even inside a credit row');
});

test('bulk credit items use whole-title slugs, deduplicate routes and ignore seasons', () => {
  const routes = [parseRoute('/movies/jackpot-1115926'), parseRoute('/shows/after-hours-with-james-corden'),
    parseRoute('/movies/jackpot-1115926'), parseRoute('/shows/breaking-bad/seasons/1/episodes/1')];
  const items = watchlistBulkItems(routes);
  assert.deepEqual(items.map(({ type, slug }) => [type, slug]), [['movies', 'jackpot-1115926'],
    ['shows', 'after-hours-with-james-corden']]);
  assert.deepEqual(watchlistBulkBody(items), { movies: [{ ids: { slug: 'jackpot-1115926' } }],
    shows: [{ ids: { slug: 'after-hours-with-james-corden' } }] });
  assert.deepEqual(watchlistBulkBody([]), {});
  assert.deepEqual(watchlistBulkItems([null, {}, { name: 'title', kind: 'show', id: '' }]), []);
});

test('bulk watchlist sends slug bodies and maps partial not-found results', async () => {
  const writes = [];
  const routes = [parseRoute('/movies/jackpot-1115926'), parseRoute('/shows/after-hours-with-james-corden')];
  const api = createWatchlistApi({ signedIn: () => true, get: async () => { throw new Error('unexpected lookup'); },
    auth: async (...args) => { writes.push(args); return { added: { movies: 1 },
      not_found: { shows: [{ ids: { slug: 'after-hours-with-james-corden' } }] } }; } });
  const result = await api.addMany(routes);
  assert.deepEqual(writes, [['POST', '/sync/watchlist', { movies: [{ ids: { slug: 'jackpot-1115926' } }],
    shows: [{ ids: { slug: 'after-hours-with-james-corden' } }] }]]);
  assert.equal(result.sent, 2); assert.equal(result.added, 1); assert.equal(result.existing, 0); assert.equal(result.notFound, 1);
  assert.deepEqual(result.succeededKeys, [routes[0].key]);
});

test('bulk watchlist batches large credits pages without per-title lookups', async () => {
  const writes = [];
  const routes = Array.from({ length: 205 }, (_, index) => ({ name: 'title', kind: index % 2 ? 'movie' : 'show',
    id: `title-${index}`, key: `/${index % 2 ? 'movies' : 'shows'}/title-${index}` }));
  const api = createWatchlistApi({ signedIn: () => true, get: async () => { throw new Error('unexpected lookup'); },
    auth: async (method, path, body) => { writes.push(body);
      return { added: { movies: body.movies?.length ?? 0, shows: body.shows?.length ?? 0 } }; } });
  const result = await api.addMany(routes);
  assert.equal(writes.length, 3);
  assert.deepEqual(writes.map(body => (body.movies?.length ?? 0) + (body.shows?.length ?? 0)), [100, 100, 5]);
  assert.equal(result.sent, 205); assert.equal(result.added, 205); assert.equal(result.succeededKeys.length, 205);
});

test('bulk watchlist stays local when signed out, cancelled or empty', async () => {
  let writes = 0;
  const routes = [parseRoute('/movies/test')];
  const signedOut = createWatchlistApi({ signedIn: () => false, auth: async () => { writes++; } });
  await assert.rejects(signedOut.addMany(routes), /Sign in/);
  const api = createWatchlistApi({ signedIn: () => true, auth: async () => { writes++; } });
  assert.deepEqual(await api.addMany(routes, { active: () => false }), { cancelled: true });
  assert.deepEqual(await api.addMany([]), { cancelled: false, sent: 0, added: 0, existing: 0, notFound: 0, succeededKeys: [] });
  assert.equal(writes, 0);
});

test('card membership reader follows only its native list tooltip and canonical watchlist link', t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/trending' }); t.after(() => window.close());
  window.document.body.innerHTML = watchlistCardHtml();
  const control = window.document.querySelector('.list-control');
  const tip = window.document.querySelector('.tooltip');
  for (const [href, expected] of [['/lists/123', false], ['/users/test/watchlist', true],
    ['https://example.com/users/test/watchlist', false], ['/users/test/watchlist/other', false]]) {
    tip.innerHTML = `<span class="listed-tip"><a href="${href}">Watchlist</a><a href="/lists/456">Another list</a></span>`;
    assert.equal(readCardWatchlisted(control), expected, href);
  }
  control.querySelector('button').removeAttribute('aria-describedby');
  assert.equal(readCardWatchlisted(control), false);
});


test('bulk responses must account for each submitted type before hiding shortcuts', async () => {
  const routes = [parseRoute('/movies/test'), parseRoute('/shows/test')];
  for (const response of [{}, { added: { movies: 1 } }, { added: { movies: 2 } },
    { added: { movies: '1', shows: 1 } }, { added: { movies: -1, shows: 1 } },
    { added: { movies: 1 }, not_found: { shows: 1 } }]) {
    let progress = 0;
    const api = createWatchlistApi({ signedIn: () => true, auth: async () => response });
    await assert.rejects(api.addMany(routes, { onProgress: () => progress++ }), /did not confirm/);
    assert.equal(progress, 0);
  }
});

test('bulk progress retains completed batches when a later write fails or is cancelled', async () => {
  const routes = Array.from({ length: 101 }, (_, i) => parseRoute(`/movies/test-${i}`));
  const updates = [];
  let writes = 0, active = true;
  const api = createWatchlistApi({ signedIn: () => true, auth: async () => {
    if (++writes === 2) throw new Error('network');
    return { added: { movies: 100 } };
  } });
  await assert.rejects(api.addMany(routes, { onProgress: result => updates.push(result) }), /network/);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].added, 100);
  assert.equal(updates[0].succeededKeys.length, 100);
  writes = 0;
  assert.deepEqual(await api.addMany(routes, { active: () => active, onProgress: () => { active = false; } }), { cancelled: true });
  assert.equal(writes, 1);
});

test('unmatched not-found ids never hide potentially failed shortcuts', async () => {
  const api = createWatchlistApi({ signedIn: () => true, auth: async () => ({ added: { movies: 1 },
    not_found: { movies: [{ ids: { trakt: 99 } }] } }) });
  const result = await api.addMany([parseRoute('/movies/one'), parseRoute('/movies/two')]);
  assert.equal(result.notFound, 1);
  assert.deepEqual(result.succeededKeys, []);
});

test('watchlist forwards its operation guard and signal to queued writes', async () => {
  const controls = [];
  const api = createWatchlistApi({ signedIn: () => true, get: async () => ({ ids: { trakt: 1 } }),
    auth: async (...args) => { controls.push(args[4]); return { added: { movies: 1 } }; } });
  const active = () => true;
  const signal = new AbortController().signal;
  await api.add(parseRoute('/movies/test'), { active, signal });
  assert.deepEqual(controls, [{ active, signal }]);
});

test('watchlist removal requires a valid matching deletion response', async () => {
  for (const response of [null, {}, { deleted: { movies: '1' } }, { deleted: { movies: 3 } }]) {
    const api = createWatchlistApi({ signedIn: () => true, auth: async () => response });
    await assert.rejects(api.remove({ movies: [{ ids: { slug: 'one' } }] }), /did not confirm/);
  }
});
