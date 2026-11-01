import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { WATCHLIST_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));
function boot(t, { path = '/movies/fight-club-1999', signedIn = true, result = { added: { movies: 1 } }, deferred = '' } = {}) {
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(), calls = [], pending = [];
  const signIn = () => {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'private-access', refresh_token: 'private-refresh', expires_at: Date.now() + 3600000 });
  };
  if (signedIn) signIn();
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = k => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    const url = new URL(r.url);
    const isLookup = /^\/(movies|shows)\//.test(url.pathname);
    const body = r.method === 'POST' ? result : isLookup
      ? url.pathname.endsWith('/seasons') ? [{ number: 1, ids: { trakt: 12 } }] : { ids: { trakt: 12 }, title: 'Spider-Man: Brand New Day' }
      : [];
    const respond = () => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' });
    if (isLookup && deferred === 'GET' || r.method === 'POST' && deferred === 'POST') pending.push(respond);
    else queueMicrotask(respond);
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${WATCHLIST_HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, calls, pending, signIn,
    panel: () => document.getElementById('ogt-watchlist'),
    button: () => document.querySelector('#ogt-watchlist button'),
    writes: () => calls.filter(r => r.method === 'POST'),
    authChange: () => document.dispatchEvent(new window.Event('ogt:authchange')) };
}
function nativeState(b, detail) {
  const action = b.document.querySelector('.list-control .summary-action');
  action.classList.toggle('selected', Boolean(detail));
  action.querySelector('.text').innerHTML = detail
    ? `<span class="title">Listed On</span><span class="detail">${detail}</span>`
    : '<span class="title">Add to list</span>';
}

test('built bundle adds exactly once on all four page types, alongside the library action', async t => {
  for (const [path, type, lookup] of [
    ['/movies/fight-club-1999', 'movies', '/movies/fight-club-1999'],
    ['/shows/breaking-bad', 'shows', '/shows/breaking-bad'],
    ['/shows/breaking-bad/seasons/1', 'seasons', '/shows/breaking-bad/seasons'],
    ['/shows/breaking-bad/seasons/1/episodes/1', 'episodes', '/shows/breaking-bad/seasons/1/episodes/1'],
  ]) await t.test(type, async t => {
    const b = boot(t, { path, result: { added: { [type]: 1 } } }); await wait();
    assert.ok(b.document.getElementById('ogt-library'));
    assert.equal(b.panel().parentElement.className, 'action-buttons');
    assert.equal(b.panel().previousElementSibling.className, 'stacked');
    assert.equal(b.panel().querySelector('.summary-action'), null, 'independent toolkit styling');
    assert.ok(b.button().querySelector('svg'));
    assert.equal(b.calls.some(r => r.url.endsWith('/sync/watchlist')), false, 'no watchlist fetch on mount');
    b.button().click(); b.button().click(); await wait();
    assert.ok(b.calls.some(r => r.method === 'GET' && new URL(r.url).pathname === lookup));
    assert.equal(b.writes().length, 1);
    const request = b.writes()[0];
    assert.equal(request.url, 'https://api.trakt.tv/sync/watchlist');
    assert.deepEqual(JSON.parse(request.data), { [type]: [{ ids: { trakt: 12 } }] });
    assert.equal(request.headers.Authorization, 'Bearer private-access');
    assert.equal(b.panel().hidden, true);
    assert.equal(b.document.querySelector('.ogt-toast').textContent, `You added ${type === 'seasons' ? 'Season 1' : 'Spider-Man: Brand New Day'} to your watchlist.`);
    assert.equal(b.document.getElementById('ogt-library').hidden, false);
    b.window.history.pushState({}, '', '/'); await wait(250);
    assert.equal(b.panel(), null);
  });
});

test('signed-out action gives menu guidance; sign-in clears the hint and enables saving', async t => {
  const b = boot(t, { signedIn: false }); await wait(); b.button().click();
  assert.match(b.panel().textContent, /Sign in to Trakt through the toolkit menu/);
  assert.equal(b.calls.length, 0);
  b.signIn(); b.authChange();
  assert.doesNotMatch(b.panel().textContent, /Sign in/);
  b.button().click(); await wait();
  assert.equal(b.writes().length, 1);
  assert.equal(b.panel().hidden, true);
});

test('native Watchlist and mixed membership hide the action; custom lists alone keep it available', async t => {
  const b = boot(t); await wait();
  for (const [detail, hidden] of [['3 lists', false], ['Watchlist + 3 lists', true], ['3 lists', false], ['Watchlist', true], ['', false]]) {
    nativeState(b, detail); await wait(); assert.equal(b.panel().hidden, hidden, detail);
  }
  b.button().click(); await wait(); assert.equal(b.panel().hidden, true);
  // OG learns the new state, then the user removes just the watchlist membership.
  nativeState(b, 'Watchlist + 3 lists'); await wait();
  nativeState(b, '3 lists'); await wait();
  assert.equal(b.panel().hidden, false);
  assert.equal(b.writes().length, 1, 'native removal does not trigger a toolkit write');
});

test('built bundle leaves failed additions visible and retryable', async t => {
  for (const result of [{}, { added: { movies: 0 } }, { added: { movies: 1 }, not_found: { movies: [{}] } }]) {
    await t.test(JSON.stringify(result), async t => {
      const b = boot(t, { result }); await wait(); b.button().click(); await wait();
      assert.equal(b.panel().hidden, false);
      assert.equal(b.button().disabled, false);
      assert.match(b.panel().querySelector('[role="status"]').textContent, /Trakt/);
      assert.equal(b.document.querySelector('.ogt-toast'), null);
      b.button().click(); await wait(); assert.equal(b.writes().length, 2);
    });
  }
});

test('auth changes and navigation during lookup prevent writes; late POSTs cannot hide a new session', async t => {
  for (const change of ['auth', 'navigation']) await t.test(change, async t => {
    const b = boot(t, { deferred: 'GET' }); await wait(); b.button().click(); await wait();
    if (change === 'auth') { b.store.delete('trakt.oauth.tokens'); b.authChange(); }
    else b.window.history.pushState({}, '', '/');
    await wait(250);
    for (const respond of b.pending) respond(); await wait();
    assert.equal(b.writes().length, 0);
    if (change === 'navigation') assert.equal(b.panel(), null);
    else assert.equal(b.button().disabled, false);
  });
  const b = boot(t, { deferred: 'POST' }); await wait(); b.button().click(); await wait();
  assert.equal(b.writes().length, 1);
  b.store.delete('trakt.oauth.tokens'); b.authChange();
  for (const respond of b.pending) respond(); await wait();
  assert.equal(b.panel().hidden, false);
  assert.equal(b.document.querySelector('.ogt-toast'), null);
});
