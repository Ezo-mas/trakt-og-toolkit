import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { MOVIE_HTML, SHOW_HTML } from './fixtures.js';
import { readLibraryTitle } from '../src/features/library/data.js';
import { nativeLibraryImports, isNativeLibraryStore } from '../src/features/library/native-refresh.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
const rootUrl = 'https://og.trakt.tv/_app/immutable/nodes/0.new.js';
const overlayUrl = 'https://og.trakt.tv/_app/immutable/chunks/new-overlay.js';
const rootSource = 'import{a as o}from"../chunks/new-overlay.js";o.start(user);o.stop();o.recheck();';
const overlaySource = 'const o={state:()=>{},collectionCounts:()=>{},refresh:()=>{},recheck:()=>{},patch:()=>{}};export{o as a};';

test('library title reads only the summary title, preserving punctuation without year or certification', t => {
  const window = new Window(); t.after(() => window.close());
  window.document.body.innerHTML = MOVIE_HTML;
  const heading = window.document.querySelector('.summary-title h1');
  heading.firstChild.textContent = 'Spider-Man: "Brand New Day" ';
  heading.insertAdjacentHTML('beforeend', '<span class="certification">PG-13</span>');
  assert.equal(readLibraryTitle(window.document), 'Spider-Man: "Brand New Day"');
  heading.remove();
  assert.equal(readLibraryTitle(window.document), 'this title');
});

test('library module discovery follows only loaded root imports with the native overlay contract', () => {
  assert.deepEqual(nativeLibraryImports(rootSource, rootUrl, [overlayUrl]), [overlayUrl]);
  assert.deepEqual(nativeLibraryImports(rootSource, rootUrl, []), []);
  assert.deepEqual(nativeLibraryImports(rootSource.replace('.stop()', '.success()'), rootUrl, [overlayUrl]), []);
  assert.deepEqual(nativeLibraryImports(rootSource.replace('../chunks/new-overlay.js', 'https://example.com/overlay.js'), rootUrl, ['https://example.com/overlay.js']), []);
  assert.equal(isNativeLibraryStore(overlaySource), true);
  assert.equal(isNativeLibraryStore(overlaySource.replace('refresh:', 'reset:')), false);
});

function boot(t, { show = false, nativeSignedIn = true, differentAccount = false, failRefresh = false,
  blocked = false, result, deferLookup = false, deferRefresh = false } = {}) {
  const path = show ? '/shows/breaking-bad' : '/movies/the-dark-2005';
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map([
    ['trakt.clientId', 'client'],
    ['trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 }],
  ]);
  const calls = [], assets = [], bridges = [], pending = [];
  let refreshes = 0;
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = key => store.delete(key);
  window.GM_registerMenuCommand = () => {};
  window.confirm = () => true;
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    const body = r.method === 'POST' ? result ?? { added: { [show ? 'episodes' : 'movies']: 1 } } :
      show ? [{ number: 1, episodes: [{ ids: { trakt: 10 }, first_aired: '2020-01-01' }] }] : { ids: { trakt: 12 } };
    const respond = () => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' });
    if (deferLookup && r.method === 'GET') pending.push(respond); else queueMicrotask(respond);
    return { abort() {} };
  };
  window.performance.getEntriesByType = () => [{ name: rootUrl }, { name: overlayUrl }];
  window.fetch = async (url, options) => {
    assets.push({ url, options });
    return new window.Response(url === rootUrl ? rootSource : overlaySource, { status: 200 });
  };
  document.write(`<!doctype html><html><head></head><body>${nativeSignedIn ? '<header class="top-nav"><a class="profile"></a></header>' : ''}${show ? SHOW_HTML : MOVIE_HTML}</body></html>`);
  const reconcile = () => {
    if (differentAccount) return;
    const native = document.createElement('div');
    native.className = 'summary-action'; native.id = 'native-collected';
    native.innerHTML = `<span class="title">${show ? '100% in library' : 'In Library'}</span>`;
    document.querySelector('#ogt-library').parentElement.append(native);
  };
  window.__libraryModule = { a: { state() {}, collectionCounts() {}, patch() {}, recheck() {}, async refresh() {
    refreshes++;
    if (deferRefresh) await new Promise(resolve => pending.push(resolve));
    if (failRefresh) throw new Error('Native read failed');
    reconcile();
  } } };
  const append = document.head.append.bind(document.head);
  document.head.append = (...nodes) => {
    append(...nodes);
    for (const script of nodes) if (script.nodeName === 'SCRIPT' && script.id.startsWith('ogt:library-refresh:')) {
      bridges.push(script);
      if (blocked) queueMicrotask(() => script.onerror());
      else window.eval(script.textContent.replace(/await import\([^)]*\)/, 'await Promise.resolve(window.__libraryModule)'));
    }
  };
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, calls, assets, bridges, pending, store,
    refreshes: () => refreshes, writes: () => calls.filter(r => r.method === 'POST'),
    button: () => document.querySelector('#ogt-library button') };
}

for (const show of [false, true]) test(`built library ${show ? 'show' : 'movie'} uses title notification, one write and a read-only native refresh`, async t => {
  const b = boot(t, { show }); await wait();
  assert.equal(b.document.querySelector('.ogt-library-card'), null);
  b.button().click(); b.button().click(); await wait();
  assert.equal(b.writes().length, 1);
  assert.equal(b.writes()[0].url, 'https://api.trakt.tv/sync/collection');
  assert.equal(b.refreshes(), 1);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent,
    `You added ${show ? 'Breaking Bad' : 'The Dark'} to your library.`);
  assert.equal(b.document.querySelector('#ogt-library').hidden, true);
  assert.ok(b.document.querySelector('#native-collected'));
  assert.equal(b.assets.length, 2);
  assert.ok(b.assets.every(({ options }) => options.credentials === 'omit' && options.cache === 'force-cache'));
  assert.ok(b.bridges.every(script => !script.isConnected));
  b.document.querySelector('#native-collected').remove(); await wait();
  assert.equal(b.document.querySelector('#ogt-library').hidden, false);
  assert.equal(b.writes().length, 1, 'native removal does not write');
});

for (const mode of ['signed-out', 'different-account', 'failed-read', 'blocked']) test(`library native ${mode} keeps the successful addition and one notification`, async t => {
  const b = boot(t, { nativeSignedIn: mode !== 'signed-out', differentAccount: mode === 'different-account',
    failRefresh: mode === 'failed-read', blocked: mode === 'blocked' }); await wait();
  b.button().click(); await wait();
  assert.equal(b.writes().length, 1);
  assert.equal(b.document.querySelector('#ogt-library').hidden, true);
  assert.equal(b.document.querySelectorAll('.ogt-watchlist-toast').length, 1);
  assert.equal(b.document.querySelector('#native-collected'), null);
  assert.ok(b.bridges.every(script => !script.isConnected));
  if (mode === 'signed-out') assert.equal(b.assets.length, 0);
});

test('failed API writes never refresh native state or show success', async t => {
  const b = boot(t, { result: { added: { movies: 1 }, not_found: { movies: [{}] } } }); await wait();
  b.button().click(); await wait();
  assert.equal(b.refreshes(), 0);
  assert.equal(b.assets.length, 0);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast'), null);
  assert.equal(b.document.querySelector('#ogt-library').hidden, false);
});

for (const change of ['auth', 'navigate']) test(`library ${change} during lookup prevents a late save`, async t => {
  const b = boot(t, { deferLookup: true }); await wait(); b.button().click(); await wait();
  if (change === 'auth') { b.store.delete('trakt.oauth.tokens'); b.document.dispatchEvent(new b.window.Event('ogt:authchange')); }
  else b.window.history.pushState({}, '', '/movies/another-title');
  for (const resume of b.pending) resume(); await wait();
  assert.equal(b.writes().length, 0);
  assert.equal(b.assets.length, 0);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast'), null);
});

test('an account change while native refresh runs removes the bridge and ignores its late acknowledgement', async t => {
  const b = boot(t, { deferRefresh: true, differentAccount: true }); await wait();
  b.button().click(); await wait();
  assert.equal(b.refreshes(), 1);
  assert.equal(b.bridges[0].isConnected, true);
  b.document.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.equal(b.bridges[0].isConnected, false);
  for (const resume of b.pending) resume(); await wait();
  assert.equal(b.document.querySelector('#ogt-library').hidden, false);
  assert.equal(b.writes().length, 1);
});
