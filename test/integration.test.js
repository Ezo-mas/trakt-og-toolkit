/**
 * End-to-end-ish test of the built userscript against realistic og markup.
 * happy-dom provides the DOM, history and MutationObserver the script needs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { SHOW_HTML, MOVIE_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot({ url, html, storage = {} }) {
  const window = new Window({ url });
  const { document } = window;
  const store = new Map(Object.entries(storage));

  window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_addStyle = (css) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    return style;
  };
  window.GM_registerMenuCommand = () => {};

  document.write(`<!doctype html><html><head><title>Test - Trakt OG Redux</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return { window, document, store };
}

const panel = (document) => document.getElementById('ogt-watch-now');
const chips = (document) => [...document.querySelectorAll('#ogt-watch-now .ogt-chip')];
const chip = (document, label) => chips(document).find((node) => node.textContent.trim() === label);

test('mounts under the summary stats with links from the page', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const node = panel(document);
  assert.ok(node, 'panel is mounted');
  assert.equal(node.previousElementSibling?.className, 'top');

  assert.equal(chip(document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/tv/1396');
  assert.equal(chip(document, 'IMDb').getAttribute('href'), 'https://www.imdb.com/title/tt0903747/');
  assert.equal(chip(document, 'JustWatch').getAttribute('href'), 'https://www.justwatch.com/us/search?q=Breaking%20Bad');
  assert.equal(chip(document, 'Trakt').getAttribute('href'), 'https://trakt.tv/shows/breaking-bad');
  assert.ok(document.querySelector('#ogt-watch-now style, head style'), 'styles injected');

});

test('season and episode pickers come from the season cards', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const seasonSelect = document.querySelector('#ogt-watch-now select[aria-label="Season"]');
  assert.ok(seasonSelect, 'season select exists');
  assert.deepEqual([...seasonSelect.options].map((o) => o.textContent), ['Season 1', 'Season 2']);
  assert.equal(seasonSelect.value, '1');

  const episodeSelect = () => document.querySelector('#ogt-watch-now select[aria-label="Episode"]');
  assert.equal(episodeSelect().options.length, 7);

  seasonSelect.value = '2';
  seasonSelect.dispatchEvent(new window.Event('change'));

  assert.equal(episodeSelect().options.length, 13);
  assert.equal(episodeSelect().value, '1');

});

test('custom link templates follow the selection and persist it', async (t) => {
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Mine', url: 'https://e.test/{tmdb}/{season}/{episode}' }] },
  });
  await wait(50);

  assert.equal(chip(document, 'Mine').getAttribute('href'), 'https://e.test/1396/1/1');

  const seasonSelect = document.querySelector('#ogt-watch-now select[aria-label="Season"]');
  seasonSelect.value = '2';
  seasonSelect.dispatchEvent(new window.Event('change'));

  assert.equal(chip(document, 'Mine').getAttribute('href'), 'https://e.test/1396/2/1');
  assert.deepEqual({ ...store.get('selection.show.breaking-bad') }, { season: 2, episode: 1 });

});

test('remounts after the app re-renders the panel away', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(500);
  assert.ok(panel(document));

  panel(document).remove();
  assert.equal(panel(document), null);

  await wait(100);
  document.body.append(document.createComment('render'));
  await wait(700);

  assert.ok(panel(document), 'panel comes back');
  assert.ok(chip(document, 'TMDb'));

});

test('movie pages get links but no season controls', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/movies/the-dark-2005', html: MOVIE_HTML });
  t.after(() => window.close());
  await wait(50);

  assert.ok(panel(document));
  assert.equal(chip(document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/movie/8967');
  const fields = [...document.querySelectorAll('#ogt-watch-now .ogt-field')];
  assert.equal(fields.length, 2);
  assert.ok(fields.every((field) => field.hidden), 'season and episode controls stay hidden without seasons');
  assert.ok(chip(document, 'Watch trailer'), 'movies still get the trailer button');

});

test('chart pages are left alone', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/trending', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(200);
  assert.equal(panel(document), null);
});
