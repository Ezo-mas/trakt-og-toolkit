import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { checkSelectors, driftPageType } from '../src/core/drift-checks.js';
import { parseRoute } from '../src/core/router.js';
import {
  LIST_PAGE_HTML, ALL_LISTS_HTML, MOVIE_HTML, SHOW_HTML, SEASON_PAGE_HTML, EPISODE_PAGE_HTML, PERSON_PAGE_HTML,
  WATCHLIST_PAGE_HTML,
} from './fixtures.js';
import { wait, waitFor } from './wait.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');

test('live drift maps route types and filters signed-in and disabled checks', async (t) => {
  for (const [path, page] of Object.entries({
    '/movies/test': 'movie', '/shows/test': 'show', '/shows/test/seasons/1': 'season',
    '/shows/test/seasons/1/episodes/1': 'episode', '/people/test': 'person', '/movies/trending': 'listing',
    '/users/test/watchlist': 'watchlist', '/users/test/lists/test': 'list', '/lists/official/test': 'official',
    '/users/test/progress': 'progress', '/dashboard': 'dashboard', '/settings': null,
    '/lists/trending': 'lists', '/lists/popular': 'lists',
  })) assert.equal(driftPageType(parseRoute(path)), page, path);
  const window = new Window();
  t.after(() => window.close());
  assert.deepEqual(checkSelectors(window.document, 'progress', { signedIn: false, isEnabled: () => true }), []);
  assert.deepEqual(checkSelectors(window.document, 'progress', { signedIn: true, isEnabled: () => false }), []);
  assert.equal(checkSelectors(window.document, 'progress', { signedIn: true, isEnabled: () => true })[0].ok, false);
});

async function boot(t, path, html, { debug = false } = {}) {
  const window = new Window({ url: `https://og.trakt.tv${path}` });
  t.after(() => window.close());
  const store = new Map(debug ? [['debug', true]] : []);
  const warnings = [];
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.console.warn = (...args) => warnings.push(args.join(' '));
  const timers = new Map();
  const setTimeout = window.setTimeout.bind(window);
  const clearTimeout = window.clearTimeout.bind(window);
  let nextId = -1;
  window.setTimeout = (callback, delay, ...args) => {
    if (delay !== 3000 && delay !== 10000 && delay !== 20000) return setTimeout(callback, delay, ...args);
    const id = nextId--;
    timers.set(id, { callback, delay });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id) || clearTimeout(id);
  window.document.write(`<html><head></head><body data-sveltekit-preload-data="hover">${html}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  window.dispatchEvent(new window.Event('load'));

  async function pass(delay) {
    const timer = await waitFor(() => [...timers].find(([, timer]) => timer.delay === delay),
      { message: `the ${delay}ms drift pass` });
    timers.delete(timer[0]);
    timer[1].callback();
  }
  return { window, store, warnings, pass };
}

const listPath = '/users/test/lists/test';

test('built drift ignores intact snapshots and misses that recover between passes', async (t) => {
  const intact = await boot(t, listPath, LIST_PAGE_HTML);
  await intact.pass(3000);
  await intact.pass(10000);
  assert.deepEqual(intact.warnings, []);
  assert.equal(intact.store.has('drift.reports'), false);

  const broken = LIST_PAGE_HTML.replace('class="actions"', 'class="missing-actions"');
  assert.notEqual(broken, LIST_PAGE_HTML);
  const recovering = await boot(t, listPath, broken);
  await recovering.pass(3000);
  await wait(410);
  recovering.window.document.querySelector('.missing-actions').outerHTML = '<div class="actions"></div>';
  await waitFor(() => recovering.window.document.querySelector('#ogt-csv-export'));
  await recovering.pass(10000);
  assert.deepEqual(recovering.warnings, []);
});

test('built drift reports a broken selector and its failed mount without storing the route', async (t) => {
  const b = await boot(t, listPath, LIST_PAGE_HTML.replace('class="actions"', 'class="missing-actions"'));
  await b.pass(3000);
  assert.deepEqual(b.warnings, []);
  await b.pass(10000);
  const reports = b.store.get('drift.reports');
  assert.deepEqual(Array.from(reports.list.problems), [
    'csv export: section.title-row .title-bar .actions', 'csv-export: did not mount',
  ]);
  assert.deepEqual(Object.keys(reports.list).sort(), ['page', 'problems', 'time', 'version']);
  assert.equal(JSON.stringify(reports).includes(listPath), false);
  assert.ok(b.warnings.every((line) => line.startsWith('[OGT] og drift on list pages: ')));
  b.window.history.pushState({}, '', '/users/test/lists/other');
  b.window.document.body.innerHTML = LIST_PAGE_HTML;
  await b.pass(3000);
  await b.pass(10000);
  assert.equal(Object.keys(b.store.get('drift.reports')).length, 0);
});

test('built drift detects unrecognised list preview posters', async (t) => {
  const html = ALL_LISTS_HTML + '<div class="list-row"><div class="fan"><div class="slot">' +
    '<img class="poster" src="https://media.trakt.tv/changed/poster.webp"></div></div></div>';
  const b = await boot(t, '/users/test/lists', html);
  await b.pass(3000);
  await b.pass(10000);
  assert.ok(b.warnings.includes('[OGT] og drift on lists pages: list-preview: posters found but none recognised'));
});

test('built drift reports a missing session only when og shows a signed-in header', async (t) => {
  const b = await boot(t, listPath, '<header class="top-nav"><div class="profile"></div></header>' + LIST_PAGE_HTML);
  await b.pass(3000);
  await b.pass(10000);
  assert.deepEqual(Array.from(b.store.get('drift.reports').list.problems), [
    'og session: signed-in header without a session entry',
  ]);
});

test('built drift reports nothing on the other intact snapshots', async (t) => {
  for (const [path, html] of [
    ['/movies/the-matrix-1999', MOVIE_HTML], ['/shows/breaking-bad', SHOW_HTML],
    ['/shows/breaking-bad/seasons/1', SEASON_PAGE_HTML], ['/shows/breaking-bad/seasons/1/episodes/1', EPISODE_PAGE_HTML],
    ['/people/bryan-cranston', PERSON_PAGE_HTML], ['/users/justin/watchlist', WATCHLIST_PAGE_HTML],
  ]) {
    const b = await boot(t, path, html);
    await b.pass(3000);
    await b.pass(10000);
    assert.deepEqual(b.warnings, [], path);
  }
});

test('built drift skips the episode checks for a season og lists with no episodes', async (t) => {
  const empty = SEASON_PAGE_HTML.replace(/<section class="episodes[\s\S]*?<\/section>/, '');
  assert.notEqual(empty, SEASON_PAGE_HTML);
  const path = '/shows/breaking-bad/seasons/6';
  const none = await boot(t, path, '<nav><a href="#episodes">0 Episodes</a></nav>' + empty);
  await none.pass(3000);
  await none.pass(10000);
  assert.deepEqual(none.warnings, []);

  const missing = await boot(t, path, '<nav><a href="#episodes">7 Episodes</a></nav>' + empty);
  await missing.pass(3000);
  await missing.pass(10000);
  assert.deepEqual(Array.from(missing.store.get('drift.reports').season.problems),
    ['season chart: section.episodes', 'season-chart: did not mount']);
});

test('built drift checks a page that never goes quiet once the wait cap passes', async (t) => {
  const b = await boot(t, listPath, LIST_PAGE_HTML.replace('class="actions"', 'class="missing-actions"'));
  await b.pass(20000);
  await b.pass(10000);
  assert.ok(b.warnings.includes('[OGT] og drift on list pages: csv-export: did not mount'));
});

test('with debug logging on, a confirmed miss shows a toast naming it', async (t) => {
  const b = await boot(t, listPath, LIST_PAGE_HTML.replace('class="actions"', 'class="missing-actions"'), { debug: true });
  await b.pass(3000);
  await b.pass(10000);
  await waitFor(() => b.window.document.body.textContent.includes(
    'og drift on list pages: csv export: section.title-row .title-bar .actions (+1 more, see Diagnostics)'));
});
