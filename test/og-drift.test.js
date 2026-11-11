import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { checkSelectors, unreachableReason } from '../scripts/og-drift-checks.mjs';
import { checkNativeModules, checkOgSessionStorage } from '../scripts/og-drift-native.mjs';
import { MOVIE_HTML, SHOW_HTML, PERSON_HTML, PERSON_CREDITS_HTML, SEASON_PAGE_HTML, EPISODE_PAGE_HTML, WATCHLIST_HTML, WATCHLIST_PAGE_HTML, LIST_PAGE_HTML, watchlistCardHtml } from './fixtures.js';

function documentFor(html) {
  const window = new Window();
  window.document.write(`<script>node_ids: [0, 50]</script>${html}`);
  return window;
}

test('checks each page against its required markup', (t) => {
  for (const [page, html] of Object.entries({ movie: MOVIE_HTML, show: SHOW_HTML, season: SEASON_PAGE_HTML, episode: EPISODE_PAGE_HTML, person: PERSON_HTML, watchlist: WATCHLIST_PAGE_HTML, list: LIST_PAGE_HTML, official: LIST_PAGE_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    // The full season/episode captures supply the show-link and summary anchors, and the
    // action-stack checks have their own live-shaped action fixture below.
    assert.deepEqual(checkSelectors(window.document, page)
      .filter((check) => !check.ok && !ACTION_CONTEXT(check)), [], page);
  }
});

const ACTION_CONTEXT = (check) => ['title actions', 'watchlist list control', 'watchlist picker trigger', 'watchlist card list controls',
  'watchlist credit rows', 'watchlist credit list controls', 'watchlist credit toolbar'].includes(check.feature);

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

test('watchlist pick needs the title actions and the media filter', (t) => {
  const window = documentFor(WATCHLIST_PAGE_HTML);
  t.after(() => window.close());
  assert.deepEqual(checkSelectors(window.document, 'watchlist').filter((check) => !check.ok), []);
  window.document.querySelector('section.title-row .title-bar .actions').remove();
  assert.deepEqual(checkSelectors(window.document, 'watchlist').filter((check) => !check.ok).map((check) => check.feature),
    ['watchlist pick']);
});

test('CSV export needs the list title actions', (t) => {
  const window = documentFor(LIST_PAGE_HTML);
  t.after(() => window.close());
  assert.deepEqual(checkSelectors(window.document, 'list').filter((check) => !check.ok), []);
  window.document.querySelector('section.title-row .title-bar .actions').remove();
  assert.deepEqual(checkSelectors(window.document, 'list').filter((check) => !check.ok).map((check) => check.feature),
    ['csv export']);
});

test('person credit rows still expose the poster link and card-sized list controls', (t) => {
  const credits = documentFor(PERSON_CREDITS_HTML);
  t.after(() => credits.close());
  const checks = checkSelectors(credits.document, 'person').filter((check) => check.feature.startsWith('watchlist credit'));
  assert.equal(checks.length, 3);
  assert.deepEqual(checks.filter((check) => !check.ok), []);
  for (const control of credits.document.querySelectorAll('article.credit-row .list-control')) control.classList.remove('card');
  assert.equal(checkSelectors(credits.document, 'person')
    .find((check) => check.feature === 'watchlist credit list controls').ok, false);
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

const SESSION_CLIENT = 'WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI';

function sessionSources({ authority = 'https://auth.trakt.tv', clientId = SESSION_CLIENT, userKey = true, prefix = true } = {}) {
  const pageUrl = 'https://og.trakt.tv/movies/test';
  const appUrl = 'https://og.trakt.tv/_app/immutable/entry/app.abc.js';
  const layoutUrl = 'https://og.trakt.tv/_app/immutable/nodes/0.abc.js';
  const authUrl = 'https://og.trakt.tv/_app/immutable/chunks/auth.js';
  const oidcUrl = 'https://og.trakt.tv/_app/immutable/chunks/oidc.js';
  const sources = new Map([
    [appUrl, 'x(()=>import(`../nodes/0.abc.js`))'],
    [layoutUrl, 'import{t as Y}from"../chunks/auth.js";Y.getUser();'],
    [authUrl, `import{i as e}from"./oidc.js";var n=null;function r(){return n??=new t({authority:\`${authority}\`,client_id:\`${clientId}\`})}export{r as t};`],
    [oidcUrl, `${prefix ? 'D=class{constructor({prefix:e=\`oidc.\`}={}){}};' : ''}${userKey ? 'q=class{get _userStoreKey(){return\`user:${this.settings.authority}:${this.settings.client_id}\`}};' : ''}`],
  ]);
  const read = async (url) => {
    if (!sources.has(url)) throw new Error(`HTTP 404 for ${url}`);
    return sources.get(url);
  };
  return { html: '<script>"/_app/immutable/entry/app.abc.js"</script>', pageUrl, read };
}

test('og session drift follows the oidc user key into localStorage', async () => {
  assert.deepEqual(await checkOgSessionStorage(sessionSources()), []);
  assert.deepEqual(await checkOgSessionStorage(sessionSources({ authority: 'https://other.trakt.tv' })), [
    'og session: authority is https://other.trakt.tv',
  ]);
  assert.deepEqual(await checkOgSessionStorage(sessionSources({ clientId: 'AnotherClientId_1234567890' })), [
    'og session: client ID is AnotherClientId_1234567890',
  ]);
  assert.deepEqual(await checkOgSessionStorage(sessionSources({ clientId: '' })), [
    'og session: user manager not found',
  ]);
  assert.deepEqual(await checkOgSessionStorage(sessionSources({ userKey: false })), [
    'og session: oidc user-store key not found',
  ]);
  assert.deepEqual(await checkOgSessionStorage({ ...sessionSources(), html: '<html></html>' }), [
    'og session: root layout not found',
  ]);
});

test('season and episode pages carry the show ids and the summary anchors custom links use', (t) => {
  for (const [page, html] of Object.entries({ season: SEASON_PAGE_HTML, episode: EPISODE_PAGE_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    const checks = checkSelectors(window.document, page).filter((check) => check.feature.startsWith('custom links'));
    assert.equal(checks.length, page === 'season' ? 7 : 6, page);
    assert.deepEqual(checks.filter((check) => !check.ok), [], page);
  }
});

test('reports missing selectors by feature and checks the first episode row', (t) => {
  const window = documentFor(SEASON_PAGE_HTML);
  t.after(() => window.close());
  window.document.querySelector('article.row .rating-trigger .value').remove();
  assert.deepEqual(checkSelectors(window.document, 'season').filter((check) => !check.ok && !ACTION_CONTEXT(check)), [
    { feature: 'season chart', selector: '.rating-trigger .value', ok: false },
  ]);
});

test('requires an inline hydration script and a nonempty person name', (t) => {
  const window = documentFor(PERSON_HTML);
  t.after(() => window.close());
  window.document.querySelector('script').setAttribute('src', '/bootstrap.js');
  window.document.querySelector('.summary .summary-title h1').textContent = '  ';
  assert.deepEqual(checkSelectors(window.document, 'person').filter((check) => !check.ok && !ACTION_CONTEXT(check)).map((check) => check.feature), [
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
