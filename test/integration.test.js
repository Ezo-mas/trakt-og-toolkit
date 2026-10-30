/**
 * End-to-end-ish test of the built userscript against realistic og markup.
 * happy-dom provides the DOM, history and MutationObserver the script needs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { SHOW_HTML, MOVIE_HTML, SEASON_HTML, PERSON_HTML, FORVO_HTML, FORVO_EMPTY_HTML, FORVO_MULTI_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot({ url, html, storage = {}, gmRequest }) {
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
  if (gmRequest) window.GM_xmlhttpRequest = gmRequest;

  document.write(`<!doctype html><html><head><title>Test - Trakt OG Redux</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return { window, document, store };
}

const panel = (document) => document.getElementById('ogt-custom-links');
const chips = (document) => [...document.querySelectorAll('#ogt-custom-links .ogt-chip')];
const chip = (document, label) => chips(document).find((node) => node.textContent.trim() === label);

test('mounts under the summary stats with preset and editor chips', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const node = panel(document);
  assert.ok(node, 'panel is mounted');
  assert.equal(node.previousElementSibling?.className, 'top');

  assert.ok(chip(document, 'Add presets…'), 'preset button exists');
  assert.ok(chip(document, 'Edit links'), 'editor button exists');
  assert.ok(document.querySelector('.ogt-hint'), 'hint text shown when no custom links');
  assert.equal(document.querySelectorAll('#ogt-custom-links .ogt-field').length, 0, 'no pickers without season-dependent links');
  assert.ok(document.querySelector('head style'), 'styles injected');
});

test('season and episode pickers come from the season cards when a custom link needs them', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Mine', url: 'https://e.test/{season}/{episode}' }] },
  });
  t.after(() => window.close());
  await wait(50);

  const seasonSelect = document.querySelector('#ogt-custom-links select[aria-label="Season"]');
  assert.ok(seasonSelect, 'season select exists');
  assert.deepEqual([...seasonSelect.options].map((o) => o.textContent), ['Season 1', 'Season 2']);
  assert.equal(seasonSelect.value, '1');

  const episodeSelect = () => document.querySelector('#ogt-custom-links select[aria-label="Episode"]');
  assert.equal(episodeSelect().options.length, 7);

  seasonSelect.value = '2';
  seasonSelect.dispatchEvent(new window.Event('change'));

  // Season 2 has 13 episodes, so it renders as an input, not a select
  const episodeInput = document.querySelector('#ogt-custom-links input[aria-label="Episode"]');
  assert.ok(episodeInput, 'episode input exists for season 2');
  assert.equal(episodeInput.value, '1');
});

test('custom link templates follow the selection and persist it', async (t) => {
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Mine', url: 'https://e.test/{tmdb}/{season}/{episode}' }] },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(chip(document, 'Mine').getAttribute('href'), 'https://e.test/1396/1/1');

  const seasonSelect = document.querySelector('#ogt-custom-links select[aria-label="Season"]');
  seasonSelect.value = '2';
  seasonSelect.dispatchEvent(new window.Event('change'));

  assert.equal(chip(document, 'Mine').getAttribute('href'), 'https://e.test/1396/2/1');
  assert.deepEqual({ ...store.get('selection.show.breaking-bad') }, { season: 2, episode: 1 });
});

test('old-format stored links still load and render unchanged', async (t) => {
  const oldLinks = [{ label: 'Old format', url: 'https://old.test/{tmdb}' }];
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': oldLinks },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(chip(document, 'Old format').getAttribute('href'), 'https://old.test/1396');
  assert.deepEqual(store.get('watch.customLinks'), oldLinks);
});

test('preset checklist marks existing URLs and adds selected presets to storage', async (t) => {
  const oldLinks = [{ label: 'Metacritic', url: 'https://www.metacritic.com/search/{title}/' }];
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': oldLinks },
  });
  t.after(() => window.close());
  await wait(50);

  const open = chip(document, 'Add presets…');
  open.click();
  const metacritic = document.querySelector('.ogt-presets input[aria-label="Metacritic"]');
  assert.ok(metacritic.disabled, 'a preset with the same URL is disabled');
  assert.equal(document.activeElement, document.querySelector('.ogt-presets input[aria-label="Stremio"]'));
  for (const duplicate of ['Rotten Tomatoes', 'Wikipedia', 'Letterboxd']) {
    assert.equal(document.querySelector(`.ogt-presets input[aria-label="${duplicate}"]`), null, `og already links ${duplicate}`);
  }

  const stremio = document.querySelector('.ogt-presets input[aria-label="Stremio"]');
  stremio.checked = true;
  stremio.dispatchEvent(new window.Event('change', { bubbles: true }));
  document.querySelector('.ogt-presets button').click();

  assert.ok(chip(document, 'Stremio'), 'the new link is rendered immediately');
  assert.deepEqual(JSON.parse(JSON.stringify(store.get('watch.customLinks'))), [
    ...oldLinks,
    { label: 'Stremio', url: 'https://web.stremio.com/#/search?search={title}' },
  ]);
  assert.equal(document.activeElement, open, 'focus returns to the presets chip when closed');
});

test('inline editor renames, reorders, deletes and saves links', async (t) => {
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'A', url: 'https://a.test/{title}' },
        { label: 'B', url: 'https://b.test/{title}' },
        { label: 'C', url: 'https://c.test/{title}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  const edit = chip(document, 'Edit links');
  edit.click();
  const editor = document.querySelector('.ogt-editor');
  assert.equal(document.activeElement, editor.querySelector('input[aria-label="Link label"]'));

  let rows = [...editor.querySelectorAll('.ogt-editor-row')];
  const label = rows[0].querySelector('input[aria-label="Link label"]');
  label.value = 'Renamed A';
  label.dispatchEvent(new window.Event('input', { bubbles: true }));
  rows[0].querySelector('button[aria-label="Move down"]').click();
  rows = [...editor.querySelectorAll('.ogt-editor-row')];
  rows[2].querySelector('button[aria-label="Delete link"]').click();
  [...editor.querySelectorAll('button')].find((button) => button.textContent === 'Save links').click();

  assert.deepEqual(JSON.parse(JSON.stringify(store.get('watch.customLinks'))), [
    { label: 'B', url: 'https://b.test/{title}' },
    { label: 'Renamed A', url: 'https://a.test/{title}' },
  ]);
  assert.deepEqual(
    [...document.querySelectorAll('#ogt-custom-links .ogt-links a.ogt-chip')].map((link) => link.textContent),
    ['B', 'Renamed A'],
  );
  assert.equal(document.activeElement, edit, 'focus returns to the editor chip when closed');
});

test('inline editor adds a link and rejects invalid URLs before saving', async (t) => {
  const { window, document, store } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  chip(document, 'Edit links').click();
  document.querySelector('.ogt-editor [data-focus="add-link"]').click();
  const editor = document.querySelector('.ogt-editor');
  const label = editor.querySelector('input[aria-label="Link label"]');
  const url = editor.querySelector('input[aria-label="Link URL"]');
  label.value = 'New service';
  label.dispatchEvent(new window.Event('input', { bubbles: true }));
  url.value = 'javascript:alert(1)';
  url.dispatchEvent(new window.Event('input', { bubbles: true }));
  [...editor.querySelectorAll('button')].find((button) => button.textContent === 'Save links').click();

  assert.equal(editor.querySelector('[role="alert"]').hidden, false, 'invalid URLs are reported inline');
  assert.equal(store.has('watch.customLinks'), false, 'invalid edits are not saved');

  url.value = 'https://new.test/{title}';
  url.dispatchEvent(new window.Event('input', { bubbles: true }));
  [...editor.querySelectorAll('button')].find((button) => button.textContent === 'Save links').click();
  assert.deepEqual(JSON.parse(JSON.stringify(store.get('watch.customLinks'))), [
    { label: 'New service', url: 'https://new.test/{title}' },
  ]);
  assert.equal(chip(document, 'New service').getAttribute('href'), 'https://new.test/Breaking%20Bad');
});

test('Escape closes the inline views and restores focus to their chips', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const edit = chip(document, 'Edit links');
  edit.click();
  assert.equal(document.activeElement, document.querySelector('.ogt-editor [data-focus="add-link"]'));
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, edit);

  const presets = chip(document, 'Add presets…');
  presets.click();
  assert.equal(document.activeElement, document.querySelector('.ogt-presets input[type="checkbox"]'));
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, presets);
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
  assert.ok(chip(document, 'Add presets…'));
});

test('movie pages get custom links but no season controls', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/movies/the-dark-2005', html: MOVIE_HTML });
  t.after(() => window.close());
  await wait(50);

  assert.ok(panel(document));
  assert.ok(chip(document, 'Add presets…'));
  assert.equal(document.querySelectorAll('#ogt-custom-links .ogt-field').length, 0);
});

test('chart pages are left alone', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/trending', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(200);
  assert.equal(panel(document), null);
});

test('leaving a title page removes the panel', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);
  assert.ok(panel(document));
  chip(document, 'Edit links').click();
  assert.ok(document.querySelector('.ogt-editor'), 'inline editor is open');

  window.history.pushState({}, '', '/dashboard');
  await wait(300);

  assert.equal(panel(document), null);
  assert.equal(document.querySelector('.ogt-link-tools'), null, 'inline tools are removed with the panel');
  const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, false, 'the document listener is removed on navigation');
});

test('season pages mount the episode chart before the episode list and remove it on navigation', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_HTML,
  });
  t.after(() => window.close());
  await wait(50);

  const chart = document.getElementById('ogt-season-chart');
  assert.ok(chart, 'season chart is mounted');
  assert.equal(document.querySelector('section.episodes').previousElementSibling, chart);
  assert.equal(chart.querySelectorAll('svg a').length, 4, 'one chart link per rated episode');

  window.history.pushState({}, '', '/dashboard');
  await wait(300);
  assert.equal(document.getElementById('ogt-season-chart'), null, 'chart is removed on navigation');
});

test('show title pages do not mount the season chart', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  assert.equal(document.getElementById('ogt-season-chart'), null);
});

test('person pages fetch Forvo and play the recording in place', async (t) => {
  const requested = [];
  const played = [];
  const { window, document } = boot({
    url: 'https://og.trakt.tv/people/bryan-cranston',
    html: PERSON_HTML,
    gmRequest(options) {
      requested.push(options.url);
      setTimeout(() => options.onload({ status: 200, responseHeaders: '', responseText: FORVO_HTML }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(50);

  const heading = document.querySelector('.summary .summary-title h1');
  const widget = heading.nextElementSibling;
  assert.equal(widget?.className, 'ogt-pronounce__wrap');
  const button = widget.querySelector('button.ogt-pronounce');
  assert.equal(button?.textContent, 'Pronounce');

  window.HTMLMediaElement.prototype.play = function play() {
    played.push(this);
    this.dispatchEvent(new window.Event('play'));
    return Promise.resolve();
  };
  button.click();
  await wait(30);

  assert.deepEqual(requested, ['https://forvo.com/search/Bryan%20Cranston/']);
  const audio = widget.querySelector('audio');
  assert.ok(audio, 'audio element is created in place');
  assert.deepEqual(
    [...audio.querySelectorAll('source')].map((source) => source.getAttribute('src')),
    [
      'https://audio12.forvo.com/mp3/9574522/39/9574522_39_4307585.mp3',
      'https://audio12.forvo.com/ogg/9574522/39/9574522_39_4307585.ogg',
    ],
  );
  assert.equal(played.length, 1, 'the recording starts playing');

  window.history.pushState({}, '', '/dashboard');
  await wait(300);
  assert.equal(document.querySelector('.ogt-pronounce__wrap'), null);
});

test('person pages try the next recording when playback fails', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/people/bryan-cranston',
    html: PERSON_HTML,
    gmRequest(options) {
      setTimeout(() => options.onload({ status: 200, responseHeaders: '', responseText: FORVO_MULTI_HTML }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(50);

  const attempts = [];
  window.HTMLMediaElement.prototype.play = function play() {
    const src = this.querySelector('source')?.getAttribute('src');
    attempts.push(src);
    if (src?.includes('9574522')) {
      for (const source of this.querySelectorAll('source')) source.dispatchEvent(new window.Event('error'));
      return Promise.reject(new Error('unsupported'));
    }
    Object.defineProperty(this, 'paused', { configurable: true, get: () => false });
    this.dispatchEvent(new window.Event('play'));
    return Promise.resolve();
  };

  document.querySelector('.ogt-pronounce').click();
  await wait(50);

  assert.deepEqual(attempts, [
    'https://audio12.forvo.com/mp3/9574522/39/9574522_39_4307585.mp3',
    'https://audio12.forvo.com/mp3/2222222/22/2222222_22_2222222.mp3',
  ]);
  const audio = document.querySelector('.ogt-pronounce__audio');
  assert.equal(
    audio?.querySelector('source')?.getAttribute('src'),
    'https://audio12.forvo.com/mp3/2222222/22/2222222_22_2222222.mp3',
  );
  assert.equal(document.querySelector('.ogt-pronounce').textContent, 'Pause');
  assert.equal(document.querySelector('.ogt-pronounce__status').textContent, '');
});

test('person pages show the Forvo fallback when every recording fails', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/people/bryan-cranston',
    html: PERSON_HTML,
    gmRequest(options) {
      setTimeout(() => options.onload({ status: 200, responseHeaders: '', responseText: FORVO_MULTI_HTML }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(50);

  const attempts = [];
  window.HTMLMediaElement.prototype.play = function play() {
    attempts.push(this.querySelector('source')?.getAttribute('src'));
    this.dispatchEvent(new window.Event('error'));
    return Promise.reject(new Error('unsupported'));
  };

  document.querySelector('.ogt-pronounce').click();
  await wait(50);

  assert.equal(attempts.length, 2, 'both cached recordings are tried');
  assert.equal(document.querySelector('.ogt-pronounce__audio'), null);
  assert.equal(document.querySelector('.ogt-pronounce').textContent, 'Pronounce');
  const status = document.querySelector('.ogt-pronounce__status');
  assert.match(status.textContent, /Audio unavailable/);
  assert.equal(status.querySelector('a')?.getAttribute('href'), 'https://forvo.com/search/Bryan%20Cranston/');
});

test('person pages fall back to a Forvo search link when there is no recording', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/people/bryan-cranston',
    html: PERSON_HTML,
    gmRequest(options) {
      setTimeout(() => options.onload({ status: 200, responseHeaders: '', responseText: FORVO_EMPTY_HTML }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(50);

  document.querySelector('.ogt-pronounce').click();
  await wait(30);

  const status = document.querySelector('.ogt-pronounce__status');
  assert.match(status.textContent, /No pronunciation found/);
  assert.equal(status.querySelector('a')?.getAttribute('href'), 'https://forvo.com/search/Bryan%20Cranston/');
});

test('show pages do not mount pronunciation controls', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);
  assert.equal(document.querySelector('.ogt-pronounce__wrap'), null);
});
