import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { watchlistCardHtml } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));
function boot(t, { signedIn = true, html = watchlistCardHtml(), deferred = '', result } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/movies/trending' });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(), calls = [], pending = [];
  const signIn = () => {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  };
  if (signedIn) signIn();
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = k => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    const path = new URL(r.url).pathname;
    const body = r.method === 'POST' ? result ?? { added: { [Object.keys(JSON.parse(r.data))[0]]: 1 } }
      : path.endsWith('/seasons') ? [{ number: 0, ids: { trakt: 20 } }] : { ids: { trakt: 12 }, title: 'Spider-Man: Brand New Day' };
    const respond = () => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' });
    if (r.method === deferred) pending.push(respond); else queueMicrotask(respond);
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, calls, pending, signIn,
    buttons: () => [...document.querySelectorAll('.ogt-watchlist-card')],
    writes: () => calls.filter(r => r.method === 'POST'),
    authChange: () => document.dispatchEvent(new window.Event('ogt:authchange')) };
}
function nativeState(b, id, watchlisted, lists = true) {
  b.document.getElementById(`${id}-tip`).innerHTML = `<span class="listed-tip">
    ${watchlisted ? '<a href="/users/test/watchlist">Watchlist</a>' : ''}
    ${lists ? '<a href="/lists/123">Watchlist</a>' : ''}</span>`;
}

test('built bundle adds beside the list icon on fanart/poster cards using each card’s own route', async t => {
  for (const [href, type, small] of [['/movies/verity-2026', 'movies', false], ['/shows/breaking-bad', 'shows', true],
    ['/shows/breaking-bad/seasons/0', 'seasons', true], ['/shows/breaking-bad/seasons/1/episodes/2', 'episodes', false]]) {
    await t.test(type, async t => {
      const b = boot(t, { html: watchlistCardHtml({ href, small }) }); await wait();
      const [button] = b.buttons(); assert.ok(button);
      assert.equal(button.previousElementSibling.classList.contains('list-control'), true);
      assert.equal(button.getAttribute('aria-label'), 'Add to watchlist');
      assert.ok(button.querySelector('svg'));
      assert.equal(b.calls.length, 0, 'no API requests per card on mount');
      let bubbled = false;
      b.document.querySelector('article').addEventListener('click', () => { bubbled = true; });
      button.click(); button.click(); await wait();
      assert.equal(bubbled, false);
      assert.equal(b.writes().length, 1);
      assert.equal(b.writes()[0].url, 'https://api.trakt.tv/sync/watchlist');
      assert.deepEqual(JSON.parse(b.writes()[0].data), { [type]: [{ ids: { trakt: type === 'seasons' ? 20 : 12 } }] });
      assert.equal(button.hidden, true);
      assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, `You added ${type === 'seasons' ? 'Season 0' : 'Spider-Man: Brand New Day'} to your watchlist.`);
    });
  }
});

test('lazy/replaced/recycled cards mount once and unsupported cards get no shortcut', async t => {
  const b = boot(t, { html: '' }); await wait(); assert.equal(b.buttons().length, 0);
  b.document.body.insertAdjacentHTML('beforeend', watchlistCardHtml()); await wait();
  assert.equal(b.buttons().length, 1);
  const old = b.buttons()[0]; old.remove(); await wait();
  assert.equal(b.buttons().length, 1, 'replacement after Svelte discards our button');
  b.document.querySelector('.image-link').setAttribute('href', '/shows/breaking-bad'); await wait();
  b.buttons()[0].click(); await wait();
  assert.deepEqual(JSON.parse(b.writes()[0].data), { shows: [{ ids: { trakt: 12 } }] });
  b.document.querySelector('article').remove();
  b.document.body.insertAdjacentHTML('beforeend', watchlistCardHtml({ href: '/people/test' })); await wait();
  assert.equal(b.buttons().length, 0);
});

test('card membership tracks native Watchlist additions/removals while custom lists keep the shortcut', async t => {
  const b = boot(t); await wait();
  nativeState(b, 'card-movie', true); await wait(); assert.equal(b.buttons()[0].hidden, true);
  nativeState(b, 'card-movie', false); await wait(); assert.equal(b.buttons()[0].hidden, false);
  b.buttons()[0].click(); await wait(); assert.equal(b.buttons()[0].hidden, true);
  nativeState(b, 'card-movie', true); await wait();
  nativeState(b, 'card-movie', false); await wait(); assert.equal(b.buttons()[0].hidden, false);
  assert.equal(b.writes().length, 1);
});

test('repeated cards share in-flight and successful additions, including later cards', async t => {
  const b = boot(t, { deferred: 'POST', html: watchlistCardHtml() + watchlistCardHtml({ id: 'duplicate' }) });
  await wait(); b.buttons()[0].click(); b.buttons()[1].click(); await wait();
  assert.equal(b.writes().length, 1);
  assert.ok(b.buttons().every(button => button.disabled));
  for (const respond of b.pending) respond(); await wait();
  assert.ok(b.buttons().every(button => button.hidden));
  b.document.body.insertAdjacentHTML('beforeend', watchlistCardHtml({ id: 'later' })); await wait();
  assert.ok(b.buttons().every(button => button.hidden));
});

test('signed-out and failed card additions stay available with guidance and retries', async t => {
  const b = boot(t, { signedIn: false, result: { added: { movies: 1 }, not_found: { movies: [{}] } } });
  await wait(); b.buttons()[0].click();
  assert.match(b.document.querySelector('.ogt-toast').textContent, /Sign in/);
  assert.equal(b.calls.length, 0);
  b.signIn(); b.authChange(); b.buttons()[0].click(); await wait();
  assert.equal(b.buttons()[0].hidden, false);
  assert.equal(b.buttons()[0].disabled, false);
  assert.match(b.document.querySelector('.ogt-toast').textContent, /could not find/);
  b.buttons()[0].click(); await wait(); assert.equal(b.writes().length, 2);
});

test('account changes, card removal and navigation cancel lookups and ignore late saves', async t => {
  for (const action of ['auth', 'remove', 'navigate']) await t.test(action, async t => {
    const b = boot(t, { deferred: 'GET' }); await wait(); b.buttons()[0].click(); await wait();
    if (action === 'auth') { b.store.delete('trakt.oauth.tokens'); b.authChange(); }
    if (action === 'remove') b.document.querySelector('article').remove();
    if (action === 'navigate') { b.window.history.pushState({}, '', '/users/test/lists'); await wait(450); }
    await wait(); for (const respond of b.pending) respond(); await wait();
    assert.equal(b.writes().length, 0);
    if (action === 'remove') assert.equal(b.buttons().length, 0);
    else assert.equal(b.buttons()[0].disabled, false);
  });
  const b = boot(t, { deferred: 'POST' }); await wait(); b.buttons()[0].click(); await wait();
  b.store.delete('trakt.oauth.tokens'); b.authChange();
  for (const respond of b.pending) respond(); await wait();
  assert.equal(b.buttons()[0].hidden, false);
  assert.equal(b.document.querySelector('.ogt-toast'), null);
});
