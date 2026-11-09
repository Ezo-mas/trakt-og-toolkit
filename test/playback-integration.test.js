import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { answerDialogs } from './dialogs.js';
import { MOVIE_HTML, PLAYBACK_EPISODE_HTML, PLAYBACK_PROGRESS_HTML } from './fixtures.js';
import { waitFor } from './wait.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const samples = () => ({
  movies: [{ id: 101, progress: 42, paused_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    movie: { title: 'The Dark', ids: { slug: 'the-dark-2005', trakt: 1 }, images: { poster: ['media.trakt.tv/images/poster.jpg'] } } }],
  episodes: [{ id: 102, progress: 73.5, paused_at: new Date(Date.now() - 86400000).toISOString(),
    show: { title: 'Breaking Bad', ids: { slug: 'breaking-bad', trakt: 1388 } }, episode: { season: 1, number: 1, title: 'Pilot' } }],
});
function boot(t, { path = '/users/tester/progress', html = PLAYBACK_PROGRESS_HTML, signedIn = true, failed = [], deferred = false, empty = false, failPause = false } = {}) {
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(); const calls = []; const scrobbles = []; const pending = [];
  const rows = samples(); let allow = true; let promptValue = null;
  if (empty) { rows.movies = []; rows.episodes = []; }
  if (signedIn) {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'private-access', refresh_token: 'private-refresh', expires_at: Date.now() + 3600000 });
  }
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = (k) => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  const dialogs = answerDialogs(window, { confirm: () => allow, prompt: () => promptValue });
  const { confirms: confirmations, prompts, errors } = dialogs;
  window.GM_xmlhttpRequest = (r) => {
    calls.push(r);
    const url = new URL(r.url);
    assert.doesNotMatch(r.url, /private-access|private-refresh/);
    let body = [], status = 200;
    if (r.method === 'POST' && /^\/scrobble\/(start|pause)$/.test(url.pathname)) {
      const payload = JSON.parse(r.data);
      scrobbles.push({ path: url.pathname, payload });
      status = failPause && url.pathname.endsWith('/pause') ? 500 : 201;
      body = { action: url.pathname.endsWith('/pause') ? 'pause' : 'start', progress: payload.progress };
    } else if (r.method === 'DELETE') {
      const id = Number(url.pathname.split('/').at(-1));
      status = failed.includes(id) ? 500 : 204;
      if (status === 204) for (const kind of ['movies', 'episodes']) rows[kind] = rows[kind].filter((row) => row.id !== id);
    } else if (url.pathname === '/sync/playback/movies') body = rows.movies;
    else if (url.pathname === '/sync/playback/episodes') body = rows.episodes;
    else if (/^\/shows\/[^/]+\/seasons\/\d+\/episodes\/\d+$/.test(url.pathname)) body = { ids: { trakt: 4 } };
    else if (url.pathname.startsWith('/movies/')) body = { ids: { trakt: 1, slug: 'the-dark-2005' }, title: 'The Dark', year: 2005 };
    const respond = () => r.onload({ status, responseText: JSON.stringify(body), responseHeaders: '' });
    if (deferred) pending.push(respond); else queueMicrotask(respond);
    return { abort() { r.onabort(); } };
  };
  document.write(`<!doctype html><html><head></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, calls, confirmations, prompts, errors, dialogs, scrobbles, pending,
    setPrompt: (value) => { promptValue = value; }, deny: () => { allow = false; } };
}
const panel = (doc) => doc.getElementById('ogt-playback');
const click = (doc, action) => panel(doc).querySelector(`[data-action="${action}"]`).click();

test('signed out: no badges, overview or authenticated requests', async (t) => {
  const b = boot(t, { signedIn: false }); await wait();
  assert.equal(Boolean(panel(b.document)), false); assert.equal(b.calls.length, 0);
});
test('overview is on demand and includes posters, titles, percentages and dates', async (t) => {
  const b = boot(t); await wait();
  assert.equal(b.calls.length, 0);
  const column = panel(b.document).parentElement;
  assert.equal(column.className, 'ogt-playback__column', 'the overview sits in a column matching og\'s container');
  assert.equal(column.parentElement.className, 'progress watched', 'inside og\'s progress section');
  assert.ok(column.parentElement.firstElementChild === column, 'before og\'s own content');
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
      assert.equal(panel(b.document).hidden, false);
      assert.match(panel(b.document).textContent, /No saved playback/);
      assert.match(panel(b.document).textContent, /1 cleared/);
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
  click(b.document, 'selected');
  await waitFor(() => /1 failed/.test(panel(b.document).textContent) && panel(b.document).querySelectorAll('li').length === 1,
    { message: 'the partial clear and refreshed lists' });
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
  assert.equal(Boolean(panel(b.document)), false);
  b.store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'other-access', refresh_token: 'other-refresh', expires_at: Date.now() + 3600000 });
  b.document.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.ok(panel(b.document)); assert.equal(panel(b.document).querySelectorAll('li').length, 0);
  click(b.document, 'load'); await wait();
  assert.equal(b.calls.length, 4);
});
test('auth changes clear loaded playback and cancel a pending save', async (t) => {
  const b = boot(t); await wait(); click(b.document, 'load'); await wait();
  assert.equal(panel(b.document).querySelectorAll('li').length, 2);
  b.setPrompt('70');
  panel(b.document).querySelector('li [data-action="save"]').click();
  // The test dialog helper answers on a timer; switch accounts before that happens.
  b.store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'other-access',
    refresh_token: 'other-refresh', expires_at: Date.now() + 3600000 });
  b.document.dispatchEvent(new b.window.Event('ogt:authchange'));
  assert.equal(panel(b.document).querySelectorAll('li').length, 0, 'old rows disappear immediately');
  assert.match(panel(b.document).textContent, /Load paused playback/);
  assert.equal(Boolean(b.document.querySelector('dialog[open]')), false, 'the old dialog is cancelled');
  await wait();
  assert.equal(b.scrobbles.length, 0, 'the pending save belongs to the old account');
  assert.equal(b.prompts.length, 1);
});
test('leaving the progress page removes the overview and its column', async (t) => {
  const b = boot(t); await wait();
  assert.ok(b.document.querySelector('.ogt-playback__column'));
  b.window.history.pushState({}, '', '/'); await wait(250);
  assert.equal(Boolean(panel(b.document)), false);
  assert.equal(Boolean(b.document.querySelector('.ogt-playback__column')), false);
});
test('navigation destroys the panel and late responses cannot mount it again', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, deferred: true }); await wait();
  b.window.history.pushState({}, '', '/'); await wait(250);
  assert.equal(Boolean(panel(b.document)), false);
  for (const respond of b.pending) respond(); await wait();
  assert.equal(Boolean(panel(b.document)), false);
});
test('a title page with no saved playback saves progress with start then pause', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, empty: true }); await wait();
  assert.equal(panel(b.document).hidden, false);
  assert.match(panel(b.document).textContent, /No saved playback/);
  b.setPrompt('35');
  click(b.document, 'save');
  await waitFor(() => /Progress saved/.test(panel(b.document).textContent), { message: 'the saved progress' });
  assert.equal(b.prompts.length, 1, 'one dialog asks and warns');
  assert.equal(b.confirmations.length, 0);
  assert.equal(b.prompts[0].value, '');
  assert.match(b.prompts[0].message, /may briefly show it as watching/);
  assert.equal(b.dialogs.titles[0], 'Save progress');
  assert.deepEqual(b.scrobbles.map((call) => call.path), ['/scrobble/start', '/scrobble/pause']);
  assert.deepEqual(b.scrobbles[0].payload, { movie: { ids: { trakt: 1 }, title: 'The Dark', year: 2005 }, progress: 35 });
  assert.deepEqual(b.scrobbles[1].payload, b.scrobbles[0].payload);
  assert.match(panel(b.document).textContent, /Progress saved/);
  assert.equal(b.calls.some((call) => call.url.includes('/scrobble/stop')), false);
});
test('navigating after start still completes the pause for the same session', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, empty: true }); await wait();
  b.setPrompt('35');
  click(b.document, 'save');
  await waitFor(() => b.scrobbles.length === 1);
  await wait();
  b.window.history.pushState({}, '', '/');
  await waitFor(() => b.scrobbles.length === 2, { message: 'the pause after navigation' });
  assert.deepEqual(b.scrobbles.map((call) => call.path), ['/scrobble/start', '/scrobble/pause']);
  assert.equal(Boolean(panel(b.document)), false);
});

test('an overview row saves episode progress after resolving episode ids', async (t) => {
  const b = boot(t); await wait(); click(b.document, 'load'); await wait();
  const row = panel(b.document).querySelector('li');
  assert.match(row.textContent, /Pilot/);
  b.setPrompt('60');
  row.querySelector('[data-action="save"]').click();
  await waitFor(() => b.scrobbles.length === 2, { message: 'the episode start and pause' });
  assert.match(b.prompts[0].message, /for Breaking Bad · 1×01 · Pilot/);
  assert.equal(b.prompts[0].value, '73.5');
  assert.ok(b.calls.find((call) => call.method === 'GET' && new URL(call.url).pathname === '/shows/breaking-bad/seasons/1/episodes/1'));
  assert.deepEqual(b.scrobbles.map((call) => call.path), ['/scrobble/start', '/scrobble/pause']);
  assert.deepEqual(b.scrobbles[0].payload, { episode: { ids: { trakt: 4 } }, progress: 60 });
});
test('cancelled or invalid progress sends nothing', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, empty: true }); await wait();
  b.setPrompt(null); click(b.document, 'save'); await wait();
  assert.equal(b.prompts.length, 1); assert.equal(b.scrobbles.length, 0);
  b.setPrompt('0'); click(b.document, 'save'); await wait();
  assert.equal(b.errors[0], 'Enter a percentage from 1 to 100.', 'the dialog keeps itself open with the error');
  assert.equal(b.scrobbles.length, 0);
  assert.equal(Boolean(b.document.querySelector('dialog[open]')), false, 'closed dialogs are removed');
});
test('a title page with saved playback can replace it, prefilled with the current value', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML }); await wait();
  assert.match(panel(b.document).textContent, /42% paused/);
  b.setPrompt('70');
  click(b.document, 'save');
  await waitFor(() => /Progress saved/.test(panel(b.document).textContent), { message: 'the replaced progress' });
  assert.equal(b.prompts[0].value, '42');
  // The ratings chart (feature 31) reads /movies/:id/ratings and /stats on the same page; playback must not look the movie up.
  assert.equal(b.calls.some((call) => {
    const path = new URL(call.url).pathname;
    return path.startsWith('/movies/') && !/\/(?:ratings|stats)$/.test(path);
  }), false, 'reuses the playback ids');
  assert.deepEqual(b.scrobbles.map((call) => call.path), ['/scrobble/start', '/scrobble/pause']);
  assert.equal(b.scrobbles[0].payload.progress, 70);
  assert.match(panel(b.document).textContent, /Progress saved/);
});
test('a pause that fails after start says the earlier progress was removed', async (t) => {
  const b = boot(t, { path: '/movies/the-dark-2005', html: MOVIE_HTML, failPause: true }); await wait();
  b.setPrompt('70');
  click(b.document, 'save');
  await waitFor(() => /did not save the pause/.test(panel(b.document).textContent), { message: 'the failed-pause message' });
  assert.deepEqual(b.scrobbles.map((call) => call.path).slice(0, 2), ['/scrobble/start', '/scrobble/pause']);
  assert.match(panel(b.document).textContent, /did not save the pause, so earlier progress for this title was removed/);
});
