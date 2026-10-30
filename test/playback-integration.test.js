import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { MOVIE_HTML, PLAYBACK_EPISODE_HTML, PLAYBACK_PROGRESS_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const samples = () => ({
  movies: [{ id: 101, progress: 42, paused_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    movie: { title: 'The Dark', ids: { slug: 'the-dark-2005', trakt: 1 }, images: { poster: ['media.trakt.tv/images/poster.jpg'] } } }],
  episodes: [{ id: 102, progress: 73.5, paused_at: new Date(Date.now() - 86400000).toISOString(),
    show: { title: 'Breaking Bad', ids: { slug: 'breaking-bad', trakt: 1388 } }, episode: { season: 1, number: 1, title: 'Pilot' } }],
});
function boot(t, { path = '/users/tester/progress', html = PLAYBACK_PROGRESS_HTML, signedIn = true, failed = [], deferred = false } = {}) {
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(); const calls = []; const confirmations = []; const pending = [];
  const rows = samples(); let allow = true;
  if (signedIn) {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'private-access', refresh_token: 'private-refresh', expires_at: Date.now() + 3600000 });
  }
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = (k) => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.confirm = (text) => { confirmations.push(text); return allow; };
  window.GM_xmlhttpRequest = (r) => {
    calls.push(r);
    const url = new URL(r.url);
    assert.doesNotMatch(r.url, /private-access|private-refresh/);
    let body = [], status = 200;
    if (r.method === 'DELETE') {
      const id = Number(url.pathname.split('/').at(-1));
      status = failed.includes(id) ? 500 : 204;
      if (status === 204) for (const kind of ['movies', 'episodes']) rows[kind] = rows[kind].filter((row) => row.id !== id);
    } else if (url.pathname === '/sync/playback/movies') body = rows.movies;
    else if (url.pathname === '/sync/playback/episodes') body = rows.episodes;
    const respond = () => r.onload({ status, responseText: JSON.stringify(body), responseHeaders: '' });
    if (deferred) pending.push(respond); else queueMicrotask(respond);
    return { abort() { r.onabort(); } };
  };
  document.write(`<!doctype html><html><head></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, calls, confirmations, pending, deny: () => { allow = false; } };
}
const panel = (doc) => doc.getElementById('ogt-playback');
const click = (doc, action) => panel(doc).querySelector(`[data-action="${action}"]`).click();

test('signed out: no badges, overview or authenticated requests', async (t) => {
  const b = boot(t, { signedIn: false }); await wait();
  assert.equal(panel(b.document), null); assert.equal(b.calls.length, 0);
});
test('overview is on demand and includes posters, titles, percentages and dates', async (t) => {
  const b = boot(t); await wait();
  assert.equal(b.calls.length, 0);
  const column = panel(b.document).parentElement;
  assert.equal(column.className, 'ogt-playback__column', 'the overview sits in a column matching og\'s container');
  assert.equal(column.nextElementSibling.className, 'progress watched');
  click(b.document, 'load'); await wait();
  assert.equal(b.calls.length, 2);
  assert.ok(b.calls.every((r) => r.url.endsWith('?extended=images')));
  const rows = panel(b.document).querySelectorAll('li'); assert.equal(rows.length, 2);
  assert.match(rows[0].textContent, /Breaking Bad.*73.5%/);
  assert.ok(rows[0].querySelector('time').getAttribute('datetime'));
  assert.equal(rows[1].querySelector('img').getAttribute('src'), 'https://media.trakt.tv/images/poster.jpg');
});
test('movie and episode badges match exact media and clear the playback entry', async (t) => {
  for (const episode of [false, true]) {
    await t.test(episode ? 'episode' : 'movie', async (t) => {
      const b = boot(t, { path: episode ? '/shows/breaking-bad/seasons/1/episodes/1' : '/movies/the-dark-2005', html: episode ? PLAYBACK_EPISODE_HTML : MOVIE_HTML });
      await wait(); assert.equal(panel(b.document).hidden, false);
      assert.match(panel(b.document).textContent, episode ? /73.5%/ : /42%/);
      click(b.document, 'one'); await wait();
      assert.match(b.confirmations[0], /1 item\?/);
      assert.equal(b.calls.filter((r) => r.method === 'DELETE')[0].url, `https://api.trakt.tv/sync/playback/${episode ? 102 : 101}`);
      assert.equal(panel(b.document).hidden, true);
      assert.match(b.document.querySelector('.ogt-toast').textContent, /Paused playback: 1 cleared\./);
    });
  }
});
test('cancelled deletion sends nothing and retains rows', async (t) => {
  const b = boot(t); await wait(); click(b.document, 'load'); await wait(); b.deny();
  click(b.document, 'one'); await wait();
  assert.equal(b.calls.filter((r) => r.method === 'DELETE').length, 0);
  assert.equal(panel(b.document).querySelectorAll('li').length, 2);
});
test('multi-select clear reports partial failures and refreshes both lists', async (t) => {
  const b = boot(t, { failed: [102] }); await wait(); click(b.document, 'load'); await wait();
  const all = panel(b.document).querySelector('[data-action="all"]'); all.checked = true; all.dispatchEvent(new b.window.Event('change', { bubbles: true }));
  click(b.document, 'selected'); await wait(100);
  assert.match(b.confirmations[0], /2 items/);
  assert.match(panel(b.document).textContent, /1 cleared; 1 failed/);
  assert.equal(panel(b.document).querySelectorAll('li').length, 1);
  assert.equal(b.calls.filter((r) => r.method === 'GET').length, 4);
});
test('age clear confirms only entries older than the selected age', async (t) => {
  const b = boot(t); await wait(); click(b.document, 'load'); await wait();
  click(b.document, 'age'); await wait();
  assert.match(b.confirmations[0], /1 item\?/);
  assert.match(b.calls.find((r) => r.method === 'DELETE').url, /\/101$/);
  assert.equal(panel(b.document).querySelectorAll('li').length, 1);
});
test('sign-out removes private UI and discards the private cache', async (t) => {
  const b = boot(t); await wait(); click(b.document, 'load'); await wait();
  b.store.delete('trakt.oauth.tokens'); b.document.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.equal(panel(b.document), null);
  b.store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'other-access', refresh_token: 'other-refresh', expires_at: Date.now() + 3600000 });
  b.document.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.ok(panel(b.document)); assert.equal(panel(b.document).querySelectorAll('li').length, 0);
  click(b.document, 'load'); await wait();
  assert.equal(b.calls.length, 4);
});
test('leaving the progress page removes the overview and its column', async (t) => {
  const b = boot(t); await wait();
  assert.ok(b.document.querySelector('.ogt-playback__column'));
  b.window.history.pushState({}, '', '/'); await wait(250);
  assert.equal(panel(b.document), null);
  assert.equal(b.document.querySelector('.ogt-playback__column'), null);
});
test('navigation destroys the panel and late responses cannot mount it again', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, deferred: true }); await wait();
  b.window.history.pushState({}, '', '/'); await wait(250);
  assert.equal(panel(b.document), null);
  for (const respond of b.pending) respond(); await wait();
  assert.equal(panel(b.document), null);
});
