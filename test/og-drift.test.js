import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { checkSelectors, unreachableReason } from '../scripts/og-drift-checks.mjs';
import { checkNativeModules } from '../scripts/og-drift-native.mjs';
import { MOVIE_HTML, SHOW_HTML, SEASON_HTML, PLAYBACK_EPISODE_HTML, PERSON_HTML, SEASON_PAGE_HTML, EPISODE_PAGE_HTML, WATCHLIST_HTML, watchlistCardHtml } from './fixtures.js';

function documentFor(html) {
  const window = new Window();
  window.document.write(`<script>node_ids: [0, 50]</script>${html}`);
  return window;
}

test('checks each page against its required markup', (t) => {
  for (const [page, html] of Object.entries({ movie: MOVIE_HTML, show: SHOW_HTML, season: SEASON_HTML, episode: PLAYBACK_EPISODE_HTML, person: PERSON_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    // The show-link checks run against the live season/episode captures below, and the
    // action-stack checks have their own live-shaped action fixture below.
    assert.deepEqual(checkSelectors(window.document, page)
      .filter((check) => !check.ok && !SHOW_CONTEXT(check) && !ACTION_CONTEXT(check)), [], page);
  }
});

const SHOW_CONTEXT = (check) => check.feature.startsWith('custom links (show');
const ACTION_CONTEXT = (check) => ['title actions', 'watchlist list control', 'watchlist picker trigger', 'watchlist card list controls'].includes(check.feature);

test('title action stack and card quick icons still expose the list controls', (t) => {
  const title = documentFor(WATCHLIST_HTML);
  const cards = documentFor(watchlistCardHtml());
  t.after(() => { title.close(); cards.close(); });
  for (const check of checkSelectors(title.document, 'movie').filter(ACTION_CONTEXT)) {
    assert.equal(check.ok, true, check.selector);
  }
  assert.deepEqual(checkSelectors(cards.document, 'listing').filter((check) => !check.ok), []);
  title.document.querySelector('.list-control.summary button').removeAttribute('aria-keyshortcuts');
  assert.equal(checkSelectors(title.document, 'movie').find((check) => check.feature === 'watchlist picker trigger').ok, false);
});

test('static native module check follows the app entry to the root layout and validates both stores', async () => {
  const pageUrl = 'https://og.trakt.tv/movies/test';
  const appUrl = 'https://og.trakt.tv/_app/immutable/entry/app.abc.js';
  const layoutUrl = 'https://og.trakt.tv/_app/immutable/nodes/0.abc.js';
  const toastUrl = 'https://og.trakt.tv/_app/immutable/chunks/toast.js';
  const libraryUrl = 'https://og.trakt.tv/_app/immutable/chunks/library.js';
  const sources = new Map([
    [appUrl, 'x(()=>import(`../nodes/0.abc.js`))'],
    [layoutUrl, 'import{t as Y}from"../chunks/toast.js";import{t as W}from"../chunks/library.js";Y.dismiss(1);Y.list;W.start(1);W.stop();W.recheck();'],
    [toastUrl, 'const s={get list(){return []},success:1,error:2,dismiss:3};export{s as a};'],
    [libraryUrl, 'const o={state:1,collectionCounts:2,refresh:3,recheck:4,patch:5};export{o as a};'],
  ]);
  const read = async (url) => {
    if (!sources.has(url)) throw new Error(`HTTP 404 for ${url}`);
    return sources.get(url);
  };
  assert.deepEqual(await checkNativeModules({
    html: '<script>"/_app/immutable/entry/app.abc.js"</script>',
    pageUrl,
    read,
  }), []);
});

test('static native module check reports a missing root layout and missing stores', async () => {
  const pageUrl = 'https://og.trakt.tv/movies/test';
  assert.deepEqual(await checkNativeModules({ html: '<html></html>', pageUrl, read: async () => { throw new Error('HTTP 404'); } }), [
    'native modules: root layout not found',
  ]);
  const layoutUrl = 'https://og.trakt.tv/_app/immutable/nodes/0.abc.js';
  assert.deepEqual(await checkNativeModules({
    html: `"${layoutUrl}"`,
    pageUrl,
    read: async () => 'export const x = 1;',
  }), ['native toast: import not found', 'native library refresh: import not found']);
});

test('season and episode pages still carry the show link and the show ids custom links read', (t) => {
  for (const [page, html] of Object.entries({ season: SEASON_PAGE_HTML, episode: EPISODE_PAGE_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    const checks = checkSelectors(window.document, page).filter(SHOW_CONTEXT);
    assert.equal(checks.length, page === 'season' ? 3 : 2, page);
    assert.deepEqual(checks.filter((check) => !check.ok), [], page);
  }
});

test('reports missing selectors by feature and checks the first episode row', (t) => {
  const window = documentFor(SEASON_HTML);
  t.after(() => window.close());
  window.document.querySelector('article.row .rating-trigger .value').remove();
  assert.deepEqual(checkSelectors(window.document, 'season').filter((check) => !check.ok && !SHOW_CONTEXT(check) && !ACTION_CONTEXT(check)), [
    { feature: 'season chart', selector: '.rating-trigger .value', ok: false },
  ]);
});

test('requires an inline hydration script and a nonempty person name', (t) => {
  const window = documentFor(PERSON_HTML);
  t.after(() => window.close());
  window.document.querySelector('script').setAttribute('src', '/bootstrap.js');
  window.document.querySelector('.summary .summary-title h1').textContent = '  ';
  assert.deepEqual(checkSelectors(window.document, 'person').filter((check) => !check.ok).map((check) => check.feature), [
    'hydration gate', 'pronunciation',
  ]);
});

test('detects sign-in, Cloudflare and HTTP failures', () => {
  const response = { status: 200, url: 'https://og.trakt.tv/movies/example', html: '<html>og</html>' };
  assert.equal(unreachableReason(response), null);
  assert.equal(unreachableReason({ ...response, html: '<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>' }), null);
  assert.equal(unreachableReason({ ...response, url: 'https://og.trakt.tv/signin?next=%2F' }), 'redirected to sign-in');
  assert.equal(unreachableReason({ ...response, html: '<title>Just a moment...</title><div id="cf-challenge"></div>' }), 'Cloudflare challenge');
  assert.equal(unreachableReason({ ...response, status: 403 }), 'HTTP 403');
});
