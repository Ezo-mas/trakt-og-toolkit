/** Built-bundle tests for the watchlist random picker on a captured og watchlist page. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { setOgSession } from './session.js';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { wait, waitFor } from './wait.js';
import { WATCHLIST_PAGE_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');

const movie = (slug, title) => ({
  type: 'movie', movie: { title, year: 2026, ids: { slug, trakt: 1 } },
});
const showItem = {
  type: 'show', show: { title: 'Breaking Bad', year: 2008, ids: { slug: 'breaking-bad', trakt: 1388 } },
};
const seasonItem = {
  type: 'season', show: { title: 'Breaking Bad', year: 2008, ids: { slug: 'breaking-bad' } },
  season: { number: 2, ids: { trakt: 302 } },
};
const episodeItem = {
  type: 'episode', show: { title: 'Ted Lasso', year: 2020, ids: { slug: 'ted-lasso' } },
  episode: { title: 'Do the Right-est Thing', season: 2, number: 3, ids: { trakt: 5256056 } },
};
const defaultMovies = [movie('project-hail-mary-2026', 'Project Hail Mary'), movie('spider-man-brand-new-day-2026', 'Spider-Man: Brand New Day')];

function boot({
  url = 'https://og.trakt.tv/users/justin/watchlist',
  signedIn = true,
  movies = defaultMovies,
  shows = [showItem],
  fail = () => false,
  pageCount = 1,
  pageRows = null,
  expired = false,
  delay = 0,
} = {}) {
  const window = new Window({ url });
  const store = new Map([['features.disabled', ['list-preview']]]);
  if (signedIn) setOgSession(window.localStorage, { expires: Date.now() + (expired ? -60000 : 3600000) });
  const requests = [];
  window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  window.Math.random = () => 0;
  window.GM_xmlhttpRequest = (request) => {
    const { pathname, searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page'));
    requests.push({ pathname, searchParams, auth: Boolean(request.headers?.Authorization) });
    let body = null;
    let headers = '';
    if (fail(pathname)) {
      // answered below with a 404
    } else if (/\/watchlist(?:\/(?:movies|shows|seasons|episodes))?$/.test(pathname)) {
      const rows = pathname.endsWith('/shows') ? shows : movies;
      body = pageRows ? pageRows(page) : page === 1 ? rows : page === 2 && pageCount > 1 ? [...movies, ...shows].slice(-1) : [];
      if (pageCount > 1) headers = `x-pagination-page-count: ${pageCount}`;
    }
    const status = fail(pathname) ? 404 : 200;
    const respond = () => request.onload({ status, responseText: JSON.stringify(body), responseHeaders: headers });
    if (delay) setTimeout(respond, delay);
    else queueMicrotask(respond);
    return { abort() {} };
  };
  window.document.write(`<!doctype html><html><head><title>Watchlist</title></head><body>${WATCHLIST_PAGE_HTML}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window,
    document: window.document,
    requests,
    panel: () => window.document.getElementById('ogt-watchlist-pick'),
    button: () => window.document.querySelector('.ogt-watchlist-pick__button'),
    result: () => window.document.querySelector('.ogt-watchlist-pick__result'),
    announcer: () => window.document.querySelector('.ogt-watchlist-pick [role="status"].ogt-visually-hidden'),
    status: () => window.document.querySelector('.ogt-watchlist-pick__status'),
  };
}

test('mounts a Pick something button beside the list actions and fetches nothing until clicked', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  assert.ok(b.panel().parentElement.matches('section.title-row .title-bar .actions'));
  assert.ok(b.panel().nextElementSibling?.classList.contains('share'), 'sits before og’s Copy Link');
  assert.equal(b.button().textContent, 'Pick something');
  assert.equal(b.result().hidden, true);
  assert.equal(b.requests.length, 0, 'a page view costs no API request');
});

test('picks a title, links to it, and Pick again rerolls from the whole list', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the first pick' });
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].pathname, '/users/justin/watchlist');
  assert.equal(b.requests[0].searchParams.get('page'), '1');
  assert.equal(b.requests[0].searchParams.get('limit'), '100');
  assert.equal(b.result().getAttribute('href'), '/movies/project-hail-mary-2026');
  assert.equal(b.result().textContent, 'Project Hail Mary (2026)');
  assert.equal(b.result().title, 'Project Hail Mary (2026)', 'the full label survives the truncated display');
  assert.equal(b.announcer().textContent, 'Picked Project Hail Mary (2026).');
  assert.equal(b.button().textContent, 'Pick again');

  const first = b.result().getAttribute('href');
  b.window.Math.random = () => 0.999;
  b.button().click();
  await waitFor(() => b.result().getAttribute('href') !== first, { message: 'the second pick' });
  assert.equal(b.result().getAttribute('href'), '/movies/spider-man-brand-new-day-2026');
  assert.equal(b.requests.length, 1, 'rerolls reuse the loaded list');
});

test('respects the page’s media filter', async (t) => {
  const b = boot({ url: 'https://og.trakt.tv/users/justin/watchlist?display=show' });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the filtered pick' });
  assert.equal(b.requests[0].pathname, '/users/justin/watchlist/shows');
  assert.equal(b.result().getAttribute('href'), '/shows/breaking-bad');
  assert.equal(b.result().textContent, 'Breaking Bad (2008)');
});

test('signed in, reads every page with the authenticated session', async (t) => {
  const b = boot({ signedIn: true, pageCount: 2 });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the authenticated pick' });
  const pages = b.requests.filter((request) => request.pathname === '/users/justin/watchlist');
  assert.deepEqual(pages.map((request) => request.searchParams.get('page')), ['1', '2']);
  assert.ok(pages.every((request) => request.auth), 'both pages use the og session');
  assert.ok(pages.every((request) => request.searchParams.get('limit') === '100'));
});

test('a filter change during a read picks from the new filter', async (t) => {
  const b = boot({ delay: 100 });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  b.window.history.replaceState({}, '', '/users/justin/watchlist?display=show');
  await waitFor(() => b.requests.some((request) => request.pathname === '/users/justin/watchlist/shows'),
    { message: 'the re-read for the new filter' });
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the filtered pick' });
  assert.equal(b.result().getAttribute('href'), '/shows/breaking-bad');
  assert.equal(b.result().textContent, 'Breaking Bad (2008)');
});

test('a failed read after a filter change asks to try again', async (t) => {
  const b = boot({ delay: 100, fail: (pathname) => pathname === '/users/justin/watchlist' });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  b.window.history.replaceState({}, '', '/users/justin/watchlist?display=show');
  await waitFor(() => !b.button().disabled, { message: 'the failed read to finish' });
  assert.equal(b.status().textContent, 'The page filter changed while picking. Try again.');
  assert.ok(b.result().hidden);
});

test('changing the filter hides a result from the old filter', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the first pick' });
  b.window.history.replaceState({}, '', '/users/justin/watchlist?display=show');
  b.window.dispatchEvent(new b.window.Event('popstate'));
  await waitFor(() => b.result().hidden, { message: 'the stale result to be hidden' });
  assert.equal(b.result().hasAttribute('href'), false);
  assert.equal(b.result().hasAttribute('title'), false);
  assert.equal(b.button().textContent, 'Pick something');
  assert.equal(b.announcer().textContent, '');
});

test('a filter navigation that lands after the click still hides the old pick', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.button().click();
  await waitFor(() => !b.result().hidden && b.result().textContent, { message: 'the first pick' });

  // og handles the filter link first; its navigation updates the URL a moment later.
  const link = b.document.createElement('a');
  link.setAttribute('href', '/users/justin/watchlist?display=show');
  link.addEventListener('click', (event) => event.preventDefault());
  b.document.body.append(link);
  link.click();
  await wait(100);
  assert.equal(b.result().hidden, false, 'the pick is still visible before the URL changes');

  b.window.history.pushState({}, '', '/users/justin/watchlist?display=show');
  await waitFor(() => b.result().hidden, { message: 'the stale result to be hidden after navigation settles' });
  assert.equal(b.button().textContent, 'Pick something');
});

test('picks seasons and episodes with their own routes', async (t) => {
  for (const [item, href, label] of [
    [seasonItem, '/shows/breaking-bad/seasons/2', 'Breaking Bad (2008) — Season 2'],
    [episodeItem, '/shows/ted-lasso/seasons/2/episodes/3', 'Ted Lasso (2020) — S2E3 · Do the Right-est Thing'],
  ]) {
    const b = boot({ movies: [item] });
    t.after(() => b.window.close());
    await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });
    b.button().click();
    await waitFor(() => !b.result().hidden && b.result().textContent, { message: `${item.type} pick` });
    assert.equal(b.result().getAttribute('href'), href);
    assert.equal(b.result().textContent, label);
    assert.equal(b.result().title, label);
  }
});

test('an empty filter shows a hint until the user switches filters', async (t) => {
  const b = boot({ url: 'https://og.trakt.tv/users/justin/watchlist?display=movie', movies: [] });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });
  b.button().click();
  await waitFor(() => b.status().textContent === 'Nothing to pick in this filter.', { message: 'the empty hint' });
  assert.equal(b.result().hidden, true);
  assert.equal(b.button().textContent, 'Pick something');

  const panel = b.panel();
  b.window.history.pushState({}, '', '/users/justin/watchlist?display=show');
  await waitFor(() => !b.status().textContent, { message: 'the stale empty-filter hint to be cleared' });
  assert.equal(b.panel(), panel, 'query navigation keeps the picker mounted');
});

test('picks at the read limit show a note and keep it on reroll', async (t) => {
  const b = boot({ signedIn: true, pageCount: 51, pageRows: () => defaultMovies });
  t.after(() => b.window.close());
  await waitFor(() => b.button());

  b.button().click();
  await waitFor(() => !b.result().hidden);
  assert.match(b.status().textContent, /first 5,000 watchlist entries/);
  assert.equal(b.requests.length, 50);

  b.button().click();
  await waitFor(() => !b.button().disabled);
  assert.match(b.status().textContent, /first 5,000 watchlist entries/);
  assert.equal(b.requests.length, 50);
});

test('an expired og session asks for a reload', async (t) => {
  const b = boot({ expired: true });
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });
  b.button().click();
  await waitFor(() => b.status().textContent === 'Your og.trakt.tv session expired; reload the page to renew it.',
    { message: 'the og reload hint' });
  assert.equal(b.requests.length, 0, 'an expired token is not sent');
});

test('private and unavailable lists show one-line hints instead of error boxes', async (t) => {
  const signedOut = boot({ signedIn: false });
  t.after(() => signedOut.window.close());
  await waitFor(() => signedOut.panel(), { message: 'the watchlist picker to mount' });
  signedOut.button().click();
  await waitFor(() => /Sign in to og\.trakt\.tv/.test(signedOut.status().textContent), { message: 'the sign-in hint' });
  assert.equal(signedOut.result().hidden, true);

  const missing = boot({ fail: () => true });
  t.after(() => missing.window.close());
  await waitFor(() => missing.panel(), { message: 'the watchlist picker to mount' });
  missing.button().click();
  await waitFor(() => missing.status().textContent === 'This watchlist is private or unavailable.',
    { message: 'the private-list hint' });
  assert.equal(missing.result().hidden, true);
});

test('leaving the watchlist removes the picker', async (t) => {
  const b = boot();
  t.after(() => b.window.close());
  await waitFor(() => b.panel(), { message: 'the watchlist picker to mount' });

  b.window.history.pushState({}, '', '/movies/the-matrix-1999');
  b.window.dispatchEvent(new b.window.Event('popstate'));
  await waitFor(() => !b.panel(), { message: 'the picker to be removed' });
});
