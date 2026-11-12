/** Built-bundle tests for the CSV exporter on captured og list and watchlist pages. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { setOgSession } from './session.js';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { waitFor } from './wait.js';
import { LIST_PAGE_HTML, WATCHLIST_PAGE_HTML } from './fixtures.js';
import { MAX_PAGES } from '../src/features/csv-export/api.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');

const movie = {
  type: 'movie', rank: 3, listed_at: '2026-11-01T12:00:00.000Z', notes: '@open',
  movie: { title: 'Movie, "Quoted"', year: 2026, ids: { trakt: 1, imdb: 'tt0000001', tmdb: 10 } },
};
const show = {
  type: 'show', rank: 0, listed_at: '2026-10-01T00:00:00.000Z', notes: 'Watch with friends',
  show: { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, imdb: 'tt0903747', tmdb: 1396 } },
};
const season = {
  type: 'season', rank: 1, listed_at: '2026-09-01T00:00:00.000Z', notes: '',
  show: { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388 } },
  season: { number: 2, ids: { trakt: 302 } },
};
const episode = {
  type: 'episode', rank: 2, listed_at: '2026-08-01T00:00:00.000Z', notes: null,
  show: { title: 'Ted Lasso', year: 2020, ids: { trakt: 97546 } },
  episode: { title: 'Do the Right-est Thing', season: 2, number: 3, ids: { trakt: 5256056, imdb: 'tt0000003', tmdb: 42 } },
};
const defaultRows = [movie, show, season, episode];

function boot({
  url = 'https://og.trakt.tv/users/justin/lists/2015-fall-shows',
  html = LIST_PAGE_HTML,
  signedIn = true,
  emptyBody = false,
  expired = false,
  listRows = defaultRows,
  watchlistRows = defaultRows,
  extraRows = [],
  laterRows = [],
  pageCount = 1,
  pageCounts = null,
  official = null,
  defer = false,
  fail = () => false,
} = {}) {
  const window = new Window({ url });
  const store = new Map([['features.disabled', ['list-preview']]]);
  if (signedIn) setOgSession(window.localStorage, { expires: Date.now() + (expired ? -60000 : 3600000) });

  const requests = [];
  const downloads = [];
  const blobs = [];
  const pending = [];
  const revocations = [];
  const revokeTimers = [];
  const setTimeout = window.setTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => {
    if (delay === 60_000) {
      revokeTimers.push(() => callback(...args));
      return;
    }
    return setTimeout(callback, delay, ...args);
  };
  let currentListRows = listRows;
  window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  window.URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return `blob:ogt-test/${blobs.length}`;
  };
  window.URL.revokeObjectURL = (url) => revocations.push(url);
  window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ download: this.download, href: this.href });
  };
  window.GM_xmlhttpRequest = (request) => {
    const { pathname, searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    requests.push({
      pathname,
      page,
      limit: searchParams.get('limit'),
      auth: Boolean(request.headers?.Authorization),
    });

    let body = [];
    let status = 200;
    if (fail(pathname, page)) {
      status = 404;
    } else if (official && pathname === `/lists/${official.slug}`) {
      body = { type: 'official', ids: { trakt: official.id, slug: official.slug } };
    } else if (official && pathname === `/lists/${official.id}/items`) {
      body = page === 1 ? currentListRows : page === 2 ? extraRows : laterRows;
    } else if (pathname.endsWith('/items')) {
      body = page === 1 ? currentListRows : page === 2 ? extraRows : laterRows;
    } else if (pathname.endsWith('/watchlist')) {
      body = page === 1 ? watchlistRows : page === 2 ? extraRows : [];
    } else {
      status = 404;
    }
    const count = pageCounts ? pageCounts[page - 1] : pageCount > 1 ? pageCount : null;
    const responseHeaders = count ? `x-pagination-page-count: ${count}` : '';
    const respond = () => queueMicrotask(() => request.onload({
      status, responseText: emptyBody ? '' : JSON.stringify(body), responseHeaders,
    }));
    if (defer) pending.push(respond);
    else respond();
    return { abort() {} };
  };

  window.document.write(`<!doctype html><html><head><title>List</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return {
    window,
    document: window.document,
    requests,
    downloads,
    blobs,
    revocations,
    expireDownloadUrls: () => revokeTimers.splice(0).forEach((revoke) => revoke()),
    setListRows: (rows) => { currentListRows = rows; },
    release: () => { while (pending.length) pending.shift()(); },
    panel: () => window.document.getElementById('ogt-csv-export'),
    button: () => window.document.querySelector('.ogt-csv-export__button'),
    status: () => window.document.querySelector('.ogt-csv-export__status'),
  };
}

test('mounts Export CSV beside the list actions and fetches nothing until clicked', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  assert.ok(b.panel().parentElement.matches('section.title-row .title-bar .actions'));
  assert.ok(b.panel().nextElementSibling?.classList.contains('share'), 'sits before og’s Copy Link');
  assert.equal(b.button().textContent, 'Export CSV');
  assert.equal(b.requests.length, 0, 'a page view costs no API request');
});

test('downloads a personal list as RFC 4180 CSV with quoted and guarded fields', async (t) => {
  const b = boot({ listRows: [{ ...movie, movie: { ...movie.movie, title: 'Movie, "Amélie"' } }, show, season, episode] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 4 items.', { message: 'the finished export' });

  assert.equal(b.requests.length, 1);
  assert.deepEqual(b.requests[0], {
    pathname: '/users/justin/lists/2015-fall-shows/items', page: 1, limit: '100', auth: true,
  });
  assert.equal(b.downloads.length, 1);
  assert.equal(b.downloads[0].download, 'trakt-justin-2015-fall-shows.csv');
  assert.match(b.downloads[0].href, /^blob:ogt-test\//);
  assert.equal(b.blobs.length, 1);
  assert.equal(b.blobs[0].type, 'text/csv;charset=utf-8');
  const bytes = new Uint8Array(await b.blobs[0].arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);

  const csv = new TextDecoder().decode(bytes);
  assert.match(csv, /^Rank,Type,Title,Year,Season,Episode,Trakt ID,IMDb ID,TMDb ID,Listed At,Notes\r\n/);
  assert.ok(csv.includes('3,movie,"Movie, ""Amélie""",2026,,,1,tt0000001,10,2026-11-01T12:00:00.000Z,\'@open'));
  assert.ok(csv.includes('0,show,Breaking Bad,2008,,,1388,tt0903747,1396,2026-10-01T00:00:00.000Z,Watch with friends'));
  assert.ok(csv.includes('1,season,Breaking Bad,2008,2,,302,,,2026-09-01T00:00:00.000Z,'));
  assert.ok(csv.includes('2,episode,Ted Lasso — Do the Right-est Thing,2020,2,3,5256056,tt0000003,42,2026-08-01T00:00:00.000Z,'));
  assert.equal(b.button().textContent, 'Export CSV');
  assert.equal(b.button().disabled, false);
});

test('a second export reads fresh items instead of the cached list', async (t) => {
  const b = boot({ listRows: [movie] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.downloads.length === 1, { message: 'the first download' });
  await waitFor(() => !b.button().disabled, { message: 'the first export to finish' });
  assert.equal(b.requests.length, 1);
  assert.match(await b.blobs[0].text(), /Movie, ""Quoted""/);

  b.setListRows([show]);
  b.button().click();
  await waitFor(() => b.downloads.length === 2, { message: 'the second download' });
  assert.equal(b.requests.length, 2, 'the second export makes a fresh request');
  const csv = await b.blobs[1].text();
  assert.ok(csv.includes('Breaking Bad'));
  assert.ok(!csv.includes('Movie, ""Quoted""'));
});

test('exports the whole watchlist, not just the page’s movie filter', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/users/justin/watchlist?display=movie',
    html: WATCHLIST_PAGE_HTML,
    watchlistRows: [movie, show],
  });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 2 items.', { message: 'the finished export' });
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].pathname, '/users/justin/watchlist', 'no media filter on the export read');
  assert.equal(b.downloads[0].download, 'trakt-justin-watchlist.csv');

  const csv = await b.blobs[0].text();
  assert.ok(csv.includes('Movie, ""Quoted""'));
  assert.ok(csv.includes('Breaking Bad'), 'shows are exported too, even when the page is filtered to movies');
});

test('exports a liked official list by resolving its numeric id first', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/lists/official/avatar-collection',
    listRows: [movie],
    official: { slug: 'avatar-collection', id: 884 },
  });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 1 item.', { message: 'the official-list export' });
  assert.deepEqual(b.requests.map((request) => request.pathname),
    ['/lists/avatar-collection', '/lists/884/items']);
  assert.equal(b.requests[1].auth, true, 'official items use the og session');
  assert.equal(b.downloads[0].download, 'trakt-official-avatar-collection.csv');
  assert.ok((await b.blobs[0].text()).includes('Movie, ""Quoted""'));
});

test('signed in, reads every page with the authenticated session', async (t) => {
  const b = boot({ signedIn: true, pageCount: 2, listRows: [movie], extraRows: [show] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 2 items.', { message: 'the paged export' });
  const pages = b.requests.filter((request) => request.pathname === '/users/justin/lists/2015-fall-shows/items');
  assert.deepEqual(pages.map((request) => request.page), [1, 2]);
  assert.ok(pages.every((request) => request.auth), 'both pages use the og session');
  assert.ok(pages.every((request) => request.limit === '100'));

  const csv = await b.blobs[0].text();
  assert.ok(csv.includes('Movie, ""Quoted""'));
  assert.ok(csv.includes('Breaking Bad'));
});

test('reads follow the page count even when every page is short', async (t) => {
  const b = boot({ pageCount: 3, listRows: [movie], extraRows: [show], laterRows: [season] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 3 items.', { message: 'the paged export' });
  assert.deepEqual(b.requests.map((request) => request.page), [1, 2, 3]);
  assert.equal(b.downloads.length, 1);
});

test('a later page without a count does not end the export early', async (t) => {
  const b = boot({
    pageCounts: [3, null, null],
    listRows: [movie],
    extraRows: [show],
    laterRows: [season],
  });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Exported 3 items.', { message: 'the paged export' });
  assert.deepEqual(b.requests.map((request) => request.page), [1, 2, 3]);
  assert.equal(b.downloads.length, 1);
  assert.ok((await b.blobs[0].text()).includes('2008,2,,302'), 'the third page is included');
});

test('an export that would exceed the page cap fails without a download', async (t) => {
  const b = boot({ pageCount: MAX_PAGES + 1, listRows: [movie] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'This list is too large to export as one CSV.' && !b.button().disabled,
    { message: 'the oversized-export hint' });
  assert.equal(b.requests.length, 1);
  assert.equal(b.downloads.length, 0);
});

test('empty lists and empty signed-in responses download the header row', async (t) => {
  for (const options of [{ listRows: [] }, { signedIn: true, emptyBody: true }]) {
    const b = boot(options);
    t.after(() => b.window.close());
    await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

    b.button().click();
    await waitFor(() => b.status().textContent === 'Exported 0 items.', { message: 'the empty export' });
    assert.equal(b.downloads.length, 1);
    assert.equal(new TextDecoder().decode(await b.blobs[0].arrayBuffer()),
      'Rank,Type,Title,Year,Season,Episode,Trakt ID,IMDb ID,TMDb ID,Listed At,Notes\r\n');
  }
});

test('a missing signed-in page reports an incomplete export without downloading', async (t) => {
  const b = boot({ signedIn: true, pageCount: 2, listRows: [movie] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.status().textContent === 'Could not read this list completely. Try again later.',
    { message: 'the incomplete export hint' });
  assert.equal(b.downloads.length, 0);
});

test('private, missing and expired credentials keep their one-line hints', async (t) => {
  const signedOut = boot({ signedIn: false });
  t.after(() => signedOut.window.close());
  await waitFor(() => signedOut.panel(), { message: 'the CSV exporter to mount' });
  signedOut.button().click();
  await waitFor(() => signedOut.status().textContent ===
    'Sign in to og.trakt.tv to export this list.', { message: 'the sign-in hint' });
  assert.equal(signedOut.requests.length, 0);
  assert.equal(signedOut.downloads.length, 0);

  const missing = boot({ fail: () => true });
  t.after(() => missing.window.close());
  await waitFor(() => missing.panel(), { message: 'the CSV exporter to mount' });
  missing.button().click();
  await waitFor(() => missing.status().textContent === 'This list is private or unavailable.',
    { message: 'the private-list hint' });
  assert.equal(missing.downloads.length, 0);

  const expired = boot({ expired: true });
  t.after(() => expired.window.close());
  await waitFor(() => expired.panel(), { message: 'the CSV exporter to mount' });
  expired.button().click();
  await waitFor(() => expired.status().textContent ===
    'Your og.trakt.tv session expired; reload the page to renew it.', { message: 'the og reload hint' });
  assert.equal(expired.requests.length, 0);
  assert.equal(expired.downloads.length, 0);
});

test('leaving the list removes the exporter', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });
  b.button().click();
  await waitFor(() => b.downloads.length === 1, { message: 'the download to start' });

  b.window.history.pushState({}, '', '/shows/breaking-bad');
  b.window.dispatchEvent(new b.window.Event('popstate'));
  await waitFor(() => !b.panel(), { message: 'the exporter to be removed' });
  assert.deepEqual(b.revocations, [], 'navigation leaves the download URL alive');
  b.expireDownloadUrls();
  assert.deepEqual(b.revocations, [b.downloads[0].href]);
});

test('a navigation during the read does not start a download', async (t) => {
  const b = boot({ defer: true });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the CSV exporter to mount' });

  b.button().click();
  await waitFor(() => b.requests.length === 1, { message: 'the list read to start' });
  b.window.history.pushState({}, '', '/shows/breaking-bad');
  b.release();

  await waitFor(() => !b.panel(), { message: 'the exporter to be removed after leaving the list' });
  assert.equal(b.downloads.length, 0);
});
