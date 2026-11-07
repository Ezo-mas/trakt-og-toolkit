import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { parseRoute } from '../src/core/router.js';
import { createWatchlistApi } from '../src/features/watchlist/api.js';
import { createLibraryApi } from '../src/features/library/api.js';
import { showSuccessToast } from '../src/ui/success-notification.js';
import { MOVIE_HTML, WATCHLIST_HTML, watchlistCardHtml } from './fixtures.js';
import { answerDialogs } from './dialogs.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
const now = () => Date.parse('2026-10-30T12:00:00Z');

test('watchlist undo reuses the saved body and only newly added entries are undoable', async () => {
  const writes = [];
  let response = { added: { movies: 1 } };
  const api = createWatchlistApi({ signedIn: () => true,
    get: async () => ({ ids: { trakt: 12 }, title: 'Spider-Man: Brand New Day' }),
    auth: async (...args) => { writes.push(args); return args[1] === '/sync/watchlist/remove' ? { deleted: { movies: 1 } } : response; } });
  const result = await api.add(parseRoute('/movies/test'));
  assert.equal(result.undoable, true);
  assert.deepEqual(result.body, { movies: [{ ids: { trakt: 12 } }] });
  await api.remove(result.body);
  assert.deepEqual(writes[1], ['POST', '/sync/watchlist/remove', result.body]);

  response = { added: { movies: 0 }, existing: { movies: 1 } };
  const existing = await api.add(parseRoute('/movies/test'));
  assert.equal(existing.undoable, false);
  assert.equal(writes.filter(args => args[1] === '/sync/watchlist').length, 2);
  await assert.rejects(createWatchlistApi({ signedIn: () => false }).remove({ movies: [] }), /Sign in/);
});

test('collection undo is not offered when any item was already collected', async () => {
  const writes = [];
  let response = { added: { movies: 1 } };
  const api = createLibraryApi({ now, signedIn: () => true,
    get: async () => ({ ids: { trakt: 12 } }),
    auth: async (...args) => { writes.push(args); return args[1] === '/sync/collection/remove' ? { deleted: { movies: 1 } } : response; } });
  const result = await api.add(parseRoute('/movies/test'));
  assert.equal(result.undoable, true);
  await api.remove(result.body);
  assert.deepEqual(writes[1], ['POST', '/sync/collection/remove', result.body]);

  for (const already of [{ updated: { movies: 1 } }, { updated: { movies: 2, episodes: 1 } }, { existing: { episodes: 3 } }]) {
    response = { added: { movies: 2 }, ...already };
    assert.equal((await api.add(parseRoute('/movies/test'))).undoable, false, JSON.stringify(already));
  }
  await assert.rejects(createLibraryApi({ signedIn: () => false }).remove({ movies: [] }), /Sign in/);
});

test('fallback success notice offers Undo and keeps a failed removal retryable', async t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/test' });
  const saved = {};
  for (const name of ['document', 'Node', 'ResizeObserver']) { saved[name] = globalThis[name]; globalThis[name] = window[name]; }
  const handles = [];
  t.after(() => {
    for (const handle of handles) handle.destroy();
    window.close();
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value;
    }
  });
  let fail = true, undos = 0;
  const handle = showSuccessToast('You added Test to your watchlist.', { onUndo: async () => {
    undos++;
    if (fail) throw new Error('network');
    return true;
  } });
  handles.push(handle);
  const undo = handle.node.querySelector('.ogt-watchlist-toast__undo');
  assert.ok(undo);
  assert.equal(undo.textContent, 'Undo');
  undo.click();
  await wait(0);
  assert.equal(undos, 1);
  assert.equal(handle.node.isConnected, true);
  assert.equal(undo.disabled, false);
  assert.equal(handle.node.querySelector('.ogt-watchlist-toast__error').textContent, 'Could not undo. Try again.');
  fail = false;
  undo.click();
  await wait(0);
  assert.equal(undos, 2);
  assert.equal(handle.node.isConnected, false);
  let here = true;
  const stale = showSuccessToast('Left the page', { onUndo: async () => { undos++; return true; }, active: () => here });
  handles.push(stale);
  here = false;
  stale.node.querySelector('.ogt-watchlist-toast__undo').click();
  await wait(0);
  assert.equal(undos, 2, 'a stale Undo never writes');
  assert.equal(stale.node.querySelector('.ogt-watchlist-toast__undo'), null);
  assert.match(stale.node.querySelector('.ogt-watchlist-toast__error').textContent, /page you saved from/);
  const plain = showSuccessToast('No undo');
  handles.push(plain);
  assert.equal(plain.node.querySelector('.ogt-watchlist-toast__undo'), null);
});

function boot(t, { path = '/movies/fight-club-1999', html = WATCHLIST_HTML, library = false } = {}) {
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map([
    ['trakt.clientId', 'client'],
    ['trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 }],
  ]);
  const calls = [];
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = key => store.delete(key);
  window.GM_registerMenuCommand = () => {};
  answerDialogs(window);
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    let body;
    if (r.method === 'POST') {
      body = r.url.endsWith('/remove') ? { deleted: { movies: 1 } }
        : library ? { added: { movies: 1 } } : { added: { [Object.keys(JSON.parse(r.data))[0]]: 1 } };
    } else body = library ? { ids: { trakt: 12 } } : { ids: { trakt: 12 }, title: 'Spider-Man: Brand New Day' };
    queueMicrotask(() => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' }));
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, calls, writes: () => calls.filter(r => r.method === 'POST') };
}

test('built watchlist Undo removes with the same body and restores the action', async t => {
  const b = boot(t); await wait();
  const panel = () => b.document.getElementById('ogt-watchlist');
  const button = () => b.document.querySelector('#ogt-watchlist button');
  button().click(); await wait();
  assert.equal(panel().hidden, true);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, 'You added Spider-Man: Brand New Day to your watchlist.');
  const undo = b.document.querySelector('.ogt-watchlist-toast__undo');
  assert.ok(undo);
  undo.click(); await wait();
  assert.equal(b.writes().length, 2);
  assert.equal(b.writes()[1].url, 'https://api.trakt.tv/sync/watchlist/remove');
  assert.deepEqual(JSON.parse(b.writes()[1].data), { movies: [{ ids: { trakt: 12 } }] });
  assert.equal(b.document.querySelector('.ogt-watchlist-toast'), null);
  assert.equal(panel().hidden, false);
  assert.equal(button().textContent, 'Add to watchlist');
});

test('built library Undo removes the collected items and restores the action', async t => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, library: true }); await wait();
  const panel = () => b.document.getElementById('ogt-library');
  const button = () => b.document.querySelector('#ogt-library button');
  button().click(); await wait();
  assert.equal(panel().hidden, true);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, 'You added The Dark to your library.');
  const undo = b.document.querySelector('.ogt-watchlist-toast__undo');
  assert.ok(undo);
  undo.click(); await wait();
  assert.equal(b.writes().length, 2);
  assert.equal(b.writes()[1].url, 'https://api.trakt.tv/sync/collection/remove');
  assert.deepEqual(JSON.parse(b.writes()[1].data), JSON.parse(b.writes()[0].data));
  assert.equal(b.document.querySelector('.ogt-watchlist-toast'), null);
  assert.equal(panel().hidden, false);
  assert.equal(button().textContent, 'Add to library');
});

test('built card Undo restores the card shortcut', async t => {
  const b = boot(t, { path: '/movies/trending', html: watchlistCardHtml() }); await wait();
  const button = () => b.document.querySelector('.ogt-watchlist-card');
  button().click(); await wait();
  assert.equal(button().hidden, true);
  const undo = b.document.querySelector('.ogt-watchlist-toast__undo');
  assert.ok(undo);
  undo.click(); await wait();
  assert.equal(b.writes().length, 2);
  assert.equal(b.writes()[1].url, 'https://api.trakt.tv/sync/watchlist/remove');
  assert.equal(button().hidden, false);
  assert.equal(button().getAttribute('aria-label'), 'Add to watchlist');
});
