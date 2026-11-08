/**
 * End-to-end-ish test of the built userscript against realistic og markup.
 * happy-dom provides the DOM, history and MutationObserver the script needs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import {
  SHOW_HTML,
  ELEMENT_TITLE_SHOW_HTML,
  MOVIE_HTML,
  MOVIE_NO_PROVIDER_HTML,
  SEASON_HTML,
  SEASON_PAGE_HTML,
  EPISODE_PAGE_HTML,
  PERSON_HTML,
  FORVO_HTML,
  FORVO_EMPTY_HTML,
  FORVO_MULTI_HTML,
} from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot({ url, html, storage = {}, gmRequest, narrow = null }) {
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
  let narrowValue = narrow ?? false;
  const mediaListeners = new Set();
  if (narrow !== null) {
    window.matchMedia = () => ({
      get matches() { return narrowValue; },
      addEventListener(type, handler) { if (type === 'change') mediaListeners.add(handler); },
      removeEventListener(type, handler) { mediaListeners.delete(handler); },
    });
  }

  document.write(`<!doctype html><html><head><title>Test - Trakt OG Redux</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return {
    window,
    document,
    store,
    setNarrow(value) {
      narrowValue = value;
      for (const handler of mediaListeners) handler({ matches: value, media: '(max-width: 767px)' });
    },
  };
}

const panel = (document) => document.getElementById('ogt-custom-links');
const chips = (document) => [
  ...document.querySelectorAll('#ogt-custom-links .ogt-chip, #ogt-custom-links .ogt-manage-button, #ogt-custom-links .ogt-links a.ogt-service-link'),
];
const chip = (document, label) => chips(document).find((node) =>
  node.textContent.trim() === label || node.getAttribute('aria-label') === label || node.dataset.ogtTooltip === label);
const activate = (window, link) => link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const wikidataResponse = (...values) => ({
  status: 200,
  responseHeaders: '',
  responseText: JSON.stringify({
    results: {
      bindings: values.map((value, index) => ({
        item: { value: `http://www.wikidata.org/entity/Q${1000 + index}` },
        value: { value },
      })),
    },
  }),
});

test('mounts under the summary stats with preset and editor chips', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const node = panel(document);
  assert.ok(node, 'panel is mounted');
  assert.equal(node.parentElement, document.querySelector('aside.sidebar'), 'panel sits in the summary sidebar');
  assert.ok(node.nextElementSibling?.matches('ul.external-links'), 'panel is directly above native external links');

  assert.ok(chip(document, 'Add presets…'), 'preset button exists');
  assert.ok(chip(document, 'Edit links'), 'editor button exists');
  assert.ok(document.querySelector('.ogt-hint'), 'hint text shown when no custom links');
  assert.equal(document.querySelectorAll('#ogt-custom-links .ogt-field').length, 0, 'no pickers without season-dependent links');
  assert.ok(document.querySelector('head style'), 'styles injected');
});

test('compact links show local service marks with names and a text fallback', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
        { label: 'My Cinema', url: 'https://cinema.test/search?q={title}' },
        { label: 'Plex', url: 'https://app.plex.tv/desktop/#!/search?query={title}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  const links = [...document.querySelectorAll('#ogt-custom-links .ogt-links a.ogt-service-link')];
  assert.equal(links.length, 3);
  assert.deepEqual(links.map((link) => link.getAttribute('aria-label')), ['Plex', 'IMDb', 'My Cinema'],
    'grouped: services, then logos, then text links');
  assert.ok(links[0].closest('.ogt-links-services'), 'Plex is a service row');
  assert.ok(links[0].querySelector('.ogt-service-icon'), 'Plex gets a local mark');
  assert.ok(links[1].closest('.ogt-links-logos'), 'IMDb sits in the logo grid');
  assert.ok(links[1].querySelector('.ogt-service-icon'), 'a known service gets a local mark');
  assert.equal(links[1].getAttribute('data-ogt-tooltip'), 'IMDb');
  assert.ok(links[2].closest('.ogt-links-texts'), 'unknown labels come last');
  assert.equal(links[2].querySelector('.ogt-service-icon'), null, 'an unknown service has no mark');
  assert.equal(links[2].querySelector('.ogt-service-label').textContent, 'My Cinema');
  const manage = [...document.querySelectorAll('#ogt-custom-links .ogt-links-manage button')];
  assert.deepEqual(manage.map((button) => button.getAttribute('aria-label')), ['Add presets…', 'Servers…', 'Edit links']);
  assert.ok(manage.every((button) => button.classList.contains('ogt-manage-button') && !button.classList.contains('ogt-chip')),
    'management actions are square buttons, not pills');
  for (const link of links) {
    assert.equal(link.getAttribute('target'), '_blank');
    assert.match(link.getAttribute('rel'), /noopener/);
    assert.match(link.getAttribute('href'), /^https:\/\//);
  }
});

test('media servers, subtitles and Seerr use distinct service marks', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://imdb.test/{title}' },
        { label: 'Plex', url: 'https://plex.test/{title}' },
        { label: 'Jellyfin', url: 'https://jellyfin.test/{title}' },
        { label: 'Emby', url: 'https://emby.test/{title}' },
        { label: 'OpenSubtitles', url: 'https://opensubtitles.test/{title}' },
        { label: 'Seerr', url: 'https://seerr.test/{title}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  const marks = Object.fromEntries(
    [...document.querySelectorAll('#ogt-custom-links .ogt-service-link')].map((link) => [
      link.getAttribute('aria-label'),
      link.querySelector('.ogt-service-icon'),
    ]),
  );
  const path = (label) => marks[label].querySelector('svg path')?.getAttribute('d');

  for (const label of ['Plex', 'Jellyfin', 'Emby']) {
    assert.equal(marks[label].dataset.ogtMark, 'brand', `${label} uses its bundled logo`);
  }
  assert.equal(new Set([path('Plex'), path('Jellyfin'), path('Emby')]).size, 3, 'media-server logos differ');
  assert.equal(marks.OpenSubtitles.dataset.ogtMark, 'text');
  assert.equal(marks.OpenSubtitles.textContent, 'OS');
  assert.notEqual(marks.OpenSubtitles.style.getPropertyValue('--ogt-brand'), marks.IMDb.style.getPropertyValue('--ogt-brand'),
    'OpenSubtitles does not reuse IMDb colours');
  assert.equal(marks.Seerr.textContent, 'SEER', 'Seerr has a word mark rather than a question mark');
});

test('watch and library links join only the summary Watch Now dialogs and keep native results', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
        { label: 'JustWatch', url: 'https://www.justwatch.com/us/search?q={title}' },
        { label: 'Radarr', url: '{radarr}/add/new?term={title}' },
        { label: 'Plex', url: 'https://app.plex.tv/desktop/#!/search?query={title}' },
      ],
      'watch.servers': { radarr: 'http://radarr.test' },
    },
  });
  t.after(() => window.close());
  await wait(100);

  const dialogs = [...document.querySelectorAll('.summary-frame dialog .streaming-links')];
  assert.equal(dialogs.length, 2, 'both desktop and phone Watch Now dialogs are found');
  for (const dialog of dialogs) {
    const section = dialog.querySelector(':scope > [data-ogt-watch-now]');
    assert.ok(section, 'a scoped Your services section is added');
    assert.deepEqual(
      [...section.querySelectorAll('a')].map((link) => link.getAttribute('aria-label')),
      ['Radarr', 'Plex'],
      'only watch/library links are added, in saved order',
    );
    assert.equal(dialog.querySelector('.section-title .count').textContent, '2', 'native availability count is untouched');
    assert.equal(dialog.querySelectorAll('a.service').length, 2, 'native provider links are untouched');
    assert.equal(section.querySelector('[aria-label="IMDb"]'), null, 'reference links stay out of Watch Now');
    assert.equal(section.querySelector('[aria-label="JustWatch"]'), null, 'JustWatch is a reference link, like og\'s own');
    for (const link of section.querySelectorAll('a')) {
      assert.equal(link.getAttribute('target'), '_blank');
      assert.match(link.getAttribute('rel'), /noopener/);
    }
  }
  assert.equal(document.querySelectorAll('[data-ogt-watch-now]').length, 2);
  assert.deepEqual(
    [...document.querySelectorAll('#ogt-custom-links .ogt-links a.ogt-service-link')]
      .map((link) => link.getAttribute('aria-label')),
    ['Radarr', 'Plex', 'IMDb', 'JustWatch'],
    'the compact strip keeps all saved links, services first, then logos',
  );
});

test('an empty native Watch Now dialog keeps its message and gets Your services below it', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_NO_PROVIDER_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
        { label: 'Plex', url: 'https://app.plex.tv/desktop/#!/search?query={title}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(100);

  assert.equal(document.querySelector('#ogt-custom-links .ogt-watch-fallback').hidden, true);
  const dialogs = [...document.querySelectorAll('.summary-frame dialog .streaming-links')];
  assert.equal(dialogs.length, 2, 'the 0-services Watch Now button still owns its dialogs');
  for (const dialog of dialogs) {
    assert.match(dialog.textContent, /No watch now links in United States yet/);
    const section = dialog.querySelector(':scope > [data-ogt-watch-now]');
    assert.ok(section, 'Your services is appended after the native no-links message');
    assert.equal(section.previousElementSibling?.tagName, 'P');
    assert.match(section.previousElementSibling.textContent, /No watch now links in United States yet/);
    assert.deepEqual([...section.querySelectorAll('a')].map((link) => link.getAttribute('aria-label')), ['Plex']);
    assert.equal(dialog.querySelectorAll('.section-title .count').length, 1, 'only the toolkit section has a count');
  }
  assert.equal(document.querySelectorAll('[data-ogt-watch-now]').length, 2);
});

test('reference-only links do not create a Watch Now fallback', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_NO_PROVIDER_HTML,
    storage: { 'watch.customLinks': [{ label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' }] },
  });
  t.after(() => window.close());
  await wait(100);
  assert.equal(document.querySelector('#ogt-custom-links .ogt-watch-fallback').hidden, true);
  assert.equal(document.querySelectorAll('[data-ogt-watch-now]').length, 0);
});

test('season and episode pages place the compact panel above native external links', async (t) => {
  for (const [url, html] of [
    ['https://og.trakt.tv/shows/breaking-bad/seasons/1', SEASON_PAGE_HTML],
    ['https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1', EPISODE_PAGE_HTML],
  ]) {
    const { window, document } = boot({ url, html });
    t.after(() => window.close());
    await wait(50);
    const node = panel(document);
    assert.equal(node.parentElement, document.querySelector('aside.sidebar'), url);
    assert.ok(node.nextElementSibling?.matches('ul.external-links'), `${url} sits above external links`);
  }
});

test('leaving a title page removes injected Watch Now sections', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: { 'watch.customLinks': [{ label: 'Plex', url: 'https://app.plex.tv/desktop/#!/search?query={title}' }] },
  });
  t.after(() => window.close());
  await wait(100);
  assert.equal(document.querySelectorAll('[data-ogt-watch-now]').length, 2);

  window.history.pushState({}, '', '/dashboard');
  await wait(300);
  assert.equal(document.querySelectorAll('[data-ogt-watch-now]').length, 0, 'injected sections leave with the panel');
});

test('the management dialog reopens without duplicating controls', async (t) => {
  const { window, document } = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => window.close());
  await wait(50);

  const open = chip(document, 'Add presets…');
  open.click();
  const manager = () => document.getElementById('ogt-custom-links-manager');
  assert.equal(manager().open, true);
  assert.equal(manager().parentElement, document.body, 'the modal lives outside the movable panel');
  assert.equal(document.querySelectorAll('.ogt-manager').length, 1);
  document.querySelector('.ogt-manager-close').click();
  assert.equal(manager().open, false);
  assert.equal(document.activeElement, open, 'focus returns after closing');

  open.click();
  assert.equal(manager().open, true);
  assert.ok(document.querySelector('.ogt-presets input[aria-label="IMDb"]'), 'preset form is rebuilt on reopen');
  assert.equal(document.querySelectorAll('.ogt-manager').length, 1);
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

test('stored links with arbitrary placeholders are not rendered as relative URLs', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'Relative', url: '{title}/evil' },
        { label: 'Unconfigured server', url: '{jellyfin}/web/#/search?query={title}' },
        { label: 'Valid', url: 'https://valid.test/{title}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(Boolean(chip(document, 'Relative')), false, 'an arbitrary placeholder is not a server template');
  assert.equal(Boolean(chip(document, 'Unconfigured server')), false, 'a server link waits for its host');
  assert.equal(chip(document, 'Valid').getAttribute('href'), 'https://valid.test/Breaking%20Bad');
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
  assert.equal(document.activeElement, document.querySelector('.ogt-presets input[aria-label="IMDb"]'));
  for (const label of ['IMDb', 'TMDb', 'TVDB', 'Rotten Tomatoes', 'Wikipedia', 'JustWatch', 'MyAnimeList']) {
    assert.ok(document.querySelector(`.ogt-presets input[aria-label="${label}"]`), `${label} preset exists`);
  }
  assert.equal(document.querySelector('.ogt-presets input[aria-label="Letterboxd"]'), null, 'Letterboxd is movie-only');

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

test('server presets wait for their host and use it in the rendered link', async (t) => {
  const { window, document, store } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
  });
  t.after(() => window.close());
  await wait(50);

  const servers = chip(document, 'Servers…');
  servers.click();
  const jellyfin = document.querySelector('.ogt-servers input[aria-label="Jellyfin URL"]');
  assert.equal(document.activeElement, jellyfin, 'the first server field gets focus');

  jellyfin.value = 'ftp://media.test';
  [...document.querySelectorAll('.ogt-servers button')].find((button) => button.textContent === 'Save servers').click();
  assert.equal(document.querySelector('.ogt-servers [role="alert"]').hidden, false, 'invalid hosts are rejected');
  assert.equal(store.has('watch.servers'), false);

  jellyfin.value = 'media.test:8096/jellyfin/';
  document.querySelector('.ogt-servers input[aria-label="Emby URL"]').value = 'https://media.test/emby/';
  document.querySelector('.ogt-servers input[aria-label="Seerr URL"]').value = 'https://requests.test/seerr/';
  [...document.querySelectorAll('.ogt-servers button')].find((button) => button.textContent === 'Save servers').click();

  assert.deepEqual(JSON.parse(JSON.stringify(store.get('watch.servers'))), {
    jellyfin: 'http://media.test:8096/jellyfin',
    emby: 'https://media.test/emby',
    seerr: 'https://requests.test/seerr',
  });
  assert.equal(document.activeElement, servers, 'focus returns to the Servers chip');

  chip(document, 'Add presets…').click();
  const jellyfinPreset = document.querySelector('.ogt-presets input[aria-label="Jellyfin"]');
  const embyPreset = document.querySelector('.ogt-presets input[aria-label="Emby"]');
  const sonarrPreset = document.querySelector('.ogt-presets input[aria-label="Sonarr"]');
  assert.equal(jellyfinPreset.disabled, false, 'a configured server preset can be added');
  assert.equal(embyPreset.disabled, false, 'a second configured server preset can be added');
  assert.equal(sonarrPreset.disabled, true, 'an unconfigured server preset cannot be added');
  assert.match(sonarrPreset.closest('label').textContent, /set server URL/);

  jellyfinPreset.checked = true;
  jellyfinPreset.dispatchEvent(new window.Event('change', { bubbles: true }));
  embyPreset.checked = true;
  embyPreset.dispatchEvent(new window.Event('change', { bubbles: true }));
  const seerrPreset = document.querySelector('.ogt-presets input[aria-label="Seerr"]');
  seerrPreset.checked = true;
  seerrPreset.dispatchEvent(new window.Event('change', { bubbles: true }));
  document.querySelector('.ogt-presets button').click();

  assert.equal(
    chip(document, 'Jellyfin').getAttribute('href'),
    'http://media.test:8096/jellyfin/web/#/search?query=Breaking%20Bad',
    'the base path, HTTP scheme and current search route survive filling',
  );
  assert.equal(
    chip(document, 'Emby').getAttribute('href'),
    'https://media.test/emby/web/index.html#!/list/list.html?type=search&searchtext=Breaking%20Bad',
    'the Emby route carries the title through searchtext',
  );
  assert.equal(
    chip(document, 'Seerr').getAttribute('href'),
    'https://requests.test/seerr/tv/1396',
    'Seerr opens the show by TMDb id',
  );
});

test('og-service presets resolve to exact movie links', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
        { label: 'TMDb', url: 'https://www.themoviedb.org/search?query={title}' },
        { label: 'Letterboxd', url: 'https://letterboxd.com/search/{title}/' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(chip(document, 'IMDb').getAttribute('href'), 'https://www.imdb.com/title/tt0465676/');
  assert.equal(chip(document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/movie/8967');
  assert.equal(chip(document, 'Letterboxd').getAttribute('href'), 'https://letterboxd.com/imdb/tt0465676/');
});

test('Stremio opens exact titles and the visible show selection, and falls back without an IMDb id', async (t) => {
  const stremio = { label: 'Stremio', url: 'https://web.stremio.com/#/search?search={title}' };
  const windows = [];
  t.after(() => windows.forEach((window) => window.close()));

  const movie = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: { 'watch.customLinks': [stremio] },
  });
  windows.push(movie.window);
  await wait(50);
  assert.equal(
    chip(movie.document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/movie/tt0465676',
  );

  const show = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [stremio] },
  });
  windows.push(show.window);
  await wait(50);
  assert.equal(
    chip(show.document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:1:1',
  );
  assert.ok(show.document.querySelector('select[aria-label="Season"]'), 'deep-only preset exposes its selection');

  const season = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage: { 'watch.customLinks': [stremio] },
  });
  windows.push(season.window);
  await wait(50);
  assert.equal(
    chip(season.document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/series/tt0903747?season=1',
    'a season page has no episode id, so the series page opens with the season selected',
  );

  const episode = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1',
    html: EPISODE_PAGE_HTML,
    storage: { 'watch.customLinks': [stremio] },
  });
  windows.push(episode.window);
  await wait(50);
  assert.equal(
    chip(episode.document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/search?search=Breaking%20Bad',
    'the episode page\'s IMDb id is the episode\'s own, so the search URL is used',
  );
});

test('Stremio opens the exact episode once the show IMDb id is looked up', async (t) => {
  const requested = [];
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1',
    html: EPISODE_PAGE_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [{ label: 'Stremio', url: 'https://web.stremio.com/#/search?search={title}' }],
    },
    gmRequest(options) {
      if (new URL(options.url).pathname === '/shows/breaking-bad') requested.push(options.url);
      setTimeout(() => options.onload({
        status: 200,
        responseHeaders: '',
        responseText: JSON.stringify({
          title: 'Breaking Bad',
          year: 2008,
          ids: { trakt: 1388, slug: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747' },
        }),
      }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);

  assert.equal(
    chip(document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:1:1',
  );
  assert.equal(requested.length, 1, 'the deep route asks for the show IMDb id the page does not have');
});

test('custom links use the plain title when og decorates the heading', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: ELEMENT_TITLE_SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Search', url: 'https://search.test/{title}/{year}' }] },
  });
  t.after(() => window.close());
  await wait(50);
  assert.equal(chip(document, 'Search').getAttribute('href'), 'https://search.test/Breaking%20Bad/2008');
});

test('the Stremio link follows the season/episode picker on a show page', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'Stremio', url: 'https://web.stremio.com/#/search?search={title}' },
        { label: 'Season link', url: 'https://e.test/{season}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(
    chip(document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:1:1',
  );

  const seasonSelect = document.querySelector('#ogt-custom-links select[aria-label="Season"]');
  seasonSelect.value = '2';
  seasonSelect.dispatchEvent(new window.Event('change'));

  assert.equal(
    chip(document, 'Stremio').getAttribute('href'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:2:1',
  );
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
    [...document.querySelectorAll('#ogt-custom-links .ogt-links a.ogt-service-link')].map((link) => link.textContent),
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
  assert.equal(Boolean(document.querySelector('.ogt-manager')), false, 'management dialog is removed with the panel');
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

test('season pages fill custom links from the show and preset the route season', async (t) => {
  const requested = [];
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [
        { label: 'Show', url: 'https://e.test/{title}/{year}/{tmdb}/{imdb}/{season}' },
        { label: 'Episode only', url: 'https://e.test/{episode}' },
      ],
    },
    gmRequest(options) {
      if (new URL(options.url).pathname === '/shows/breaking-bad') requested.push(options.url);
      setTimeout(() => options.onload({
        status: 200,
        responseHeaders: '',
        responseText: JSON.stringify({
          title: 'Breaking Bad',
          year: 2008,
          ids: { trakt: 1388, slug: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747' },
        }),
      }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);

  assert.ok(panel(document), 'panel is mounted');
  assert.equal(
    chip(document, 'Show').getAttribute('href'),
    'https://e.test/Breaking%20Bad/2008/1396/tt0903747/1',
  );
  assert.equal(Boolean(chip(document, 'Episode only')), false, 'the season page has no episode');
  assert.equal(document.querySelectorAll('#ogt-custom-links select').length, 0, 'no picker on a season page');
  assert.equal(requested.length, 1, 'one show lookup, for the year');
  assert.equal(new URL(requested[0]).search, '', 'the basic show response has the year and ids');
});

test('season pages fill show ids from og\'s links and only look the show up for what the page lacks', async (t) => {
  const requested = [];
  const storage = {
    'trakt.clientId': 'client',
    'watch.customLinks': [{ label: 'Ids', url: 'https://e.test/{tmdb}/{imdb}/{season}' }],
  };
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage,
    gmRequest(options) {
      if (new URL(options.url).pathname === '/shows/breaking-bad') requested.push(options.url);
      setTimeout(() => options.onload({ status: 200, responseHeaders: '', responseText: JSON.stringify(new URL(options.url).pathname === '/shows/breaking-bad' ? { title: 'Breaking Bad', year: 2008, ids: { tmdb: 1396, imdb: 'tt0903747' } } : []) }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);
  assert.equal(chip(document, 'Ids').getAttribute('href'), 'https://e.test/1396/tt0903747/1');
  assert.equal(requested.length, 0, 'no lookup while og\'s page has every value');

  // A {year} link added later (the editor saves and refreshes) asks for the show then.
  window.GM_setValue('watch.customLinks', [...storage['watch.customLinks'], { label: 'Year', url: 'https://e.test/{year}' }]);
  document.dispatchEvent(new window.Event('ogt:refresh'));
  await wait(80);
  assert.equal(requested.length, 1);
  assert.equal(chip(document, 'Year').getAttribute('href'), 'https://e.test/2008');
});

test('TVDB preset looks up the show id on a season page', async (t) => {
  const requested = [];
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [{ label: 'TVDB', url: 'https://thetvdb.com/search?query={title}' }],
    },
    gmRequest(options) {
      if (new URL(options.url).pathname === '/shows/breaking-bad') requested.push(options.url);
      setTimeout(() => options.onload({
        status: 200,
        responseHeaders: '',
        responseText: JSON.stringify({
          title: 'Breaking Bad',
          year: 2008,
          ids: { trakt: 1388, slug: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747', tvdb: 81189 },
        }),
      }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);

  assert.equal(chip(document, 'TVDB').getAttribute('href'), 'https://thetvdb.com/dereferrer/series/81189');
  assert.equal(requested.length, 1, 'the season page asks for the show TVDB id it does not have');
});

test('MDBList and OpenSubtitles presets follow the page kind and episode ids', async (t) => {
  const links = [
    { label: 'MDBList', url: 'https://mdblist.com/movies/?q_title={title}' },
    { label: 'OpenSubtitles', url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{imdbnum}' },
  ];
  const windows = [];
  t.after(() => windows.forEach((window) => window.close()));

  const movie = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: { 'watch.customLinks': links },
  });
  windows.push(movie.window);
  await wait(50);
  assert.equal(chip(movie.document, 'MDBList').getAttribute('href'), 'https://mdblist.com/movie/tt0465676');
  assert.equal(
    chip(movie.document, 'OpenSubtitles').getAttribute('href'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-465676',
  );

  const show = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': links },
  });
  windows.push(show.window);
  await wait(50);
  assert.equal(chip(show.document, 'MDBList').getAttribute('href'), 'https://mdblist.com/show/tt0903747');
  assert.equal(
    chip(show.document, 'OpenSubtitles').getAttribute('href'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-903747/season-1',
  );

  const season = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage: { 'watch.customLinks': links },
  });
  windows.push(season.window);
  await wait(50);
  assert.equal(
    chip(season.document, 'OpenSubtitles').getAttribute('href'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-903747/season-1',
  );

  const episode = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1',
    html: EPISODE_PAGE_HTML,
    storage: { 'watch.customLinks': links },
  });
  windows.push(episode.window);
  await wait(50);
  assert.equal(
    chip(episode.document, 'OpenSubtitles').getAttribute('href'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-959621',
    'the episode page uses its own IMDb id',
  );
});

test('episode pages look up the show for an IMDb-number link', async (t) => {
  const requested = [];
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1',
    html: EPISODE_PAGE_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [{ label: 'Number', url: 'https://e.test/{imdbnum}' }],
    },
    gmRequest(options) {
      if (new URL(options.url).pathname === '/shows/breaking-bad') requested.push(options.url);
      setTimeout(() => options.onload({
        status: 200,
        responseHeaders: '',
        responseText: JSON.stringify({
          title: 'Breaking Bad',
          year: 2008,
          ids: { trakt: 1388, slug: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747' },
        }),
      }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);

  assert.equal(chip(document, 'Number').getAttribute('href'), 'https://e.test/903747');
  assert.equal(requested.length, 1, 'an episode page looks up the show for its IMDb number');
});

test('episode pages fill custom links from the show and preset the route season and episode', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1',
    html: EPISODE_PAGE_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [
        { label: 'Episode', url: 'https://e.test/{title}/{imdb}/{season}/{episode}' },
      ],
    },
    gmRequest(options) {
      setTimeout(() => options.onload({
        status: 200,
        responseHeaders: '',
        responseText: JSON.stringify({
          title: 'Breaking Bad',
          year: 2008,
          ids: { trakt: 1388, slug: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747' },
        }),
      }), 0);
      return { abort() {} };
    },
  });
  t.after(() => window.close());
  await wait(80);

  assert.equal(
    chip(document, 'Episode').getAttribute('href'),
    'https://e.test/Breaking%20Bad/tt0903747/1/1',
    'the show\'s IMDb id is used, not the episode\'s tt0959621',
  );
  assert.equal(document.querySelectorAll('#ogt-custom-links select').length, 0, 'no picker on an episode page');
});

test('season pages without a client ID use the show link and og\'s ids, and hide year links', async (t) => {
  const { window, document } = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1',
    html: SEASON_PAGE_HTML,
    storage: {
      'watch.customLinks': [
        { label: 'Season', url: 'https://e.test/{title}/{season}' },
        { label: 'Ids', url: 'https://e.test/{tmdb}' },
        { label: 'Year', url: 'https://e.test/{year}' },
      ],
    },
  });
  t.after(() => window.close());
  await wait(50);

  assert.equal(chip(document, 'Season').getAttribute('href'), 'https://e.test/Breaking%20Bad/1');
  assert.equal(chip(document, 'Ids').getAttribute('href'), 'https://e.test/1396', 'og\'s TMDb season link has the show id');
  // Compare a boolean: a failing assertion on a happy-dom element tries to print it and runs out of memory.
  assert.equal(Boolean(chip(document, 'Year')), false, 'the page year is the season\'s, so no year link');
});


test('globally stored presets only render on their supported page kinds', async t => {
  const links = [
    { label: 'Radarr', url: '{radarr}/add/new?term={title}' },
    { label: 'Sonarr', url: '{sonarr}/add/new?term={title}' },
    { label: 'Letterboxd', url: 'https://letterboxd.com/search/{title}/' },
    { label: 'Custom', url: 'https://custom.test/{title}' },
  ];
  for (const kind of ['movie', 'show']) {
    const b = boot({ url: kind === 'movie' ? 'https://og.trakt.tv/movies/the-dark-2005' : 'https://og.trakt.tv/shows/breaking-bad',
      html: kind === 'movie' ? MOVIE_HTML : SHOW_HTML,
      storage: { 'watch.customLinks': links, 'watch.servers': { radarr: 'http://radarr.test', sonarr: 'http://sonarr.test' } } });
    t.after(() => b.window.close());
    await wait(50);
    assert.equal(Boolean(chip(b.document, 'Radarr')), kind === 'movie');
    assert.equal(Boolean(chip(b.document, 'Sonarr')), kind === 'show');
    assert.equal(Boolean(chip(b.document, 'Letterboxd')), kind === 'movie');
    assert.ok(chip(b.document, 'Custom'), 'user-defined links still work on both kinds');
  }
});

test('deep preset routes expose remembered selections and update when the picker changes', async t => {
  const b = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'TMDb', url: 'https://www.themoviedb.org/search?query={title}' }],
      'selection.show.breaking-bad': { season: 2, episode: 3 } } });
  t.after(() => b.window.close());
  await wait(50);
  const season = b.document.querySelector('select[aria-label="Season"]');
  assert.ok(season && !season.closest('[hidden]'));
  assert.equal(season.value, '2');
  assert.equal(chip(b.document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/tv/1396/season/2/episode/3');
  season.value = '1';
  season.dispatchEvent(new b.window.Event('change'));
  assert.equal(chip(b.document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/tv/1396/season/1/episode/1');
});

test('adding a deep preset immediately builds its season and episode pickers', async t => {
  const b = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => b.window.close());
  await wait(50);
  chip(b.document, 'Add presets…').click();
  const choice = b.document.querySelector('.ogt-presets input[aria-label="TMDb"]');
  choice.checked = true;
  choice.dispatchEvent(new b.window.Event('change'));
  b.document.querySelector('.ogt-presets button').click();
  const season = b.document.querySelector('select[aria-label="Season"]');
  assert.ok(season && !season.closest('[hidden]'));
  assert.equal(chip(b.document, 'TMDb').getAttribute('href'), 'https://www.themoviedb.org/tv/1396/season/1/episode/1');
});


test('IMDb episode preset uses the episode id without waiting for a show lookup', async t => {
  const b = boot({ url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1', html: EPISODE_PAGE_HTML,
    storage: { 'watch.customLinks': [{ label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' }] } });
  t.after(() => b.window.close());
  await wait(50);
  assert.equal(chip(b.document, 'IMDb').getAttribute('href'), 'https://www.imdb.com/title/tt0959621/');
});


test('custom-link anchors restate their colour for :focus, over og\'s red focused-link style', async (t) => {
  // og: a:is(:hover, :focus) { color: var(--color-link-hover); text-decoration: underline; } outweighs a bare class, so
  // a clicked tile turned red until focus moved. happy-dom gives :is() no specificity, so check the rules exist.
  const b = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML });
  t.after(() => b.window.close());
  await wait(50);
  const css = [...b.document.querySelectorAll('style')].map((style) => style.textContent).join('\n');
  assert.match(css, /\.ogt-service-link:focus\s*\{[^}]*color:[^}]*text-decoration:\s*none/);
  assert.match(css, /\.ogt-watch-now-link:focus,/);
});

test('the picker looks up the episode IMDb id so IMDb and OpenSubtitles open the episode', async (t) => {
  const episodes = { '1/1': 'tt0959621', '2/3': 'tt1232248' };
  const requested = [];
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: {
      'trakt.clientId': 'client',
      'watch.customLinks': [
        { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
        { label: 'OpenSubtitles', url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{imdbnum}' },
      ],
    },
    gmRequest(options) {
      const path = new URL(options.url).pathname;
      const match = path.match(/^\/shows\/breaking-bad\/seasons\/(\d+)\/episodes\/(\d+)$/);
      let body = null;
      if (match) {
        requested.push(`${match[1]}/${match[2]}`);
        body = { season: Number(match[1]), number: Number(match[2]), ids: { imdb: episodes[`${match[1]}/${match[2]}`] ?? null } };
      } else if (path === '/shows/breaking-bad/seasons') {
        body = [{ number: 1, episode_count: 7 }, { number: 2, episode_count: 13 }];
      }
      setTimeout(() => options.onload(body
        ? { status: 200, responseHeaders: '', responseText: JSON.stringify(body) }
        : { status: 404, responseHeaders: '', responseText: '' }), 0);
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  const href = (label) => chip(b.document, label).getAttribute('href');
  const until = async (check) => {
    for (let i = 0; i < 50 && !check(); i++) await wait(20);
  };

  await until(() => href('IMDb') === 'https://www.imdb.com/title/tt0959621/');
  assert.equal(href('IMDb'), 'https://www.imdb.com/title/tt0959621/');
  assert.equal(href('OpenSubtitles'), 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-959621');

  const season = b.document.querySelector('#ogt-custom-links select[aria-label="Season"]');
  season.value = '2';
  season.dispatchEvent(new b.window.Event('change'));
  assert.equal(href('IMDb'), 'https://www.imdb.com/title/tt0903747/episodes?season=2', 'season route until the id arrives');
  const episode = b.document.querySelector('#ogt-custom-links input[aria-label="Episode"]');
  episode.value = '3';
  episode.dispatchEvent(new b.window.Event('change'));
  await until(() => href('IMDb') === 'https://www.imdb.com/title/tt1232248/');
  assert.equal(href('IMDb'), 'https://www.imdb.com/title/tt1232248/');
  assert.equal(href('OpenSubtitles'), 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-1232248');

  season.value = '1';
  season.dispatchEvent(new b.window.Event('change'));
  assert.equal(href('IMDb'), 'https://www.imdb.com/title/tt0959621/', 'a looked-up episode is reused');
  assert.deepEqual(requested, ['1/1', '2/1', '2/3']);
});

test('Rotten Tomatoes reuses OG’s header ratings URL without a lookup and keeps search when missing', async t => {
  const preset = { label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' };
  for (const [kind, html, route, href] of [
    ['movie', MOVIE_HTML, '/movies/the-dark-2005', 'https://www.rottentomatoes.com/m/the_dark'],
    ['show', SHOW_HTML, '/shows/breaking-bad', 'https://www.rottentomatoes.com/tv/breaking_bad'],
    ['show', SEASON_PAGE_HTML, '/shows/breaking-bad/seasons/1', null],
  ]) {
    for (const available of href ? [true, false] : [false]) {
      let requests = 0;
      const native = available
        ? `<li><a class="glass-action" href="${href}?tracking=og" aria-label="Rotten Tomatoes">Rotten Tomatoes</a></li>`
        : '';
      const withNative = available
        ? html.replace('<div class="ratings-strip"><ul>', `<div class="ratings-strip"><ul>${native}`)
        : html;
      const b = boot({ url: `https://og.trakt.tv${route}`, html: withNative,
        storage: { 'watch.customLinks': [preset] },
        gmRequest() { requests += 1; return { abort() {} }; } });
      t.after(() => b.window.close());
      await wait(50);
      const link = chip(b.document, 'Rotten Tomatoes');
      assert.equal(link.getAttribute('href'), available ? href :
        `https://www.rottentomatoes.com/search?search=${kind === 'movie' ? 'The%20Dark' : 'Breaking%20Bad'}`);
      if (available) {
        link.dispatchEvent(new b.window.Event('pointerenter'));
        link.dispatchEvent(new b.window.FocusEvent('focusin', { bubbles: true }));
        activate(b.window, link);
        assert.equal(requests, 0, 'native RT URLs never need Wikidata, even on activation');
      }
      b.document.dispatchEvent(new b.window.CustomEvent('ogt:refresh'));
      assert.equal(chip(b.document, 'Rotten Tomatoes').getAttribute('href'), link.getAttribute('href'));
    }
  }
});

test('Rotten Tomatoes resolves on hover and preserves cached hrefs across redraws', async (t) => {
  const requests = [];
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' }] },
    gmRequest(options) {
      requests.push(options);
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        setTimeout(() => options.onload(wikidataResponse('tv/breaking_bad')), 0);
        return { abort() {} };
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const link = chip(b.document, 'Rotten Tomatoes');
  assert.equal(link.getAttribute('href'), 'https://www.rottentomatoes.com/search?search=Breaking%20Bad');
  assert.equal(requests.length, 0, 'rendering does not start a lookup');
  link.dispatchEvent(new b.window.Event('pointerenter'));
  await wait(40);

  assert.equal(link.getAttribute('href'), 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(requests.length, 1);
  assert.match(requests[0].headers['Api-User-Agent'], /^TraktOGToolkit\/[\d.]+ \(https:\/\/github.com\/Ezo-mas\/trakt-og-toolkit\)$/);
  assert.equal(requests[0].timeout, 8000, 'the lookup is bounded');
  assert.match(decodeURIComponent(requests[0].url), /wdt:P1258/);

  b.document.dispatchEvent(new b.window.CustomEvent('ogt:refresh'));
  const redrawn = chip(b.document, 'Rotten Tomatoes');
  assert.notEqual(redrawn, link);
  assert.equal(redrawn.getAttribute('href'), 'https://www.rottentomatoes.com/tv/breaking_bad',
    'cached href is direct before hover, copy-link, context-menu or click');
  activate(b.window, redrawn);
  await wait(20);
  assert.equal(requests.length, 1, 'a warm activation does not look up again');
});

test('Metacritic resolves a movie mapping and keeps the search fallback on a miss', async (t) => {
  const requests = [];
  let result = ['movie/the-dark'];
  const b = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: { 'watch.customLinks': [{ label: 'Metacritic', url: 'https://www.metacritic.com/search/{title}/' }] },
    gmRequest(options) {
      requests.push(options);
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        setTimeout(() => options.onload(wikidataResponse(...result)), 0);
        return { abort() {} };
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const link = chip(b.document, 'Metacritic');
  link.dispatchEvent(new b.window.FocusEvent('focusin', { bubbles: true }));
  await wait(40);
  assert.equal(link.getAttribute('href'), 'https://www.metacritic.com/movie/the-dark/');
  assert.match(decodeURIComponent(requests[0].url), /wdt:P1712/);

  result = [];
  const second = boot({
    url: 'https://og.trakt.tv/movies/another-2005',
    html: MOVIE_HTML,
    storage: { 'watch.customLinks': [{ label: 'Metacritic', url: 'https://www.metacritic.com/search/{title}/' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        setTimeout(() => options.onload(wikidataResponse(...result)), 0);
      }
      return { abort() {} };
    },
  });
  t.after(() => second.window.close());
  await wait(50);
  const missingLink = chip(second.document, 'Metacritic');
  activate(second.window, missingLink);
  await wait(40);
  assert.equal(missingLink.getAttribute('href'), 'https://www.metacritic.com/search/The%20Dark/');
});

test('ambiguous mappings leave the search URL and are cached as a brief miss', async (t) => {
  let requests = 0;
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        requests += 1;
        setTimeout(() => options.onload(wikidataResponse('tv/breaking_bad', 'tv/breaking_bad_2')), 0);
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const link = chip(b.document, 'Rotten Tomatoes');
  activate(b.window, link);
  await wait(40);
  const fallback = 'https://www.rottentomatoes.com/search?search=Breaking%20Bad';
  assert.equal(link.getAttribute('href'), fallback);

  activate(b.window, link);
  await wait(20);
  assert.equal(requests, 1, 'the ambiguous result is a cached miss');
  assert.equal(link.getAttribute('href'), fallback);
});

test('a failed lookup stays on search and pauses repeated hover/focus lookups', async (t) => {
  let requests = 0;
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        requests += 1;
        setTimeout(() => options.onerror(), 0);
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const link = chip(b.document, 'Rotten Tomatoes');
  activate(b.window, link);
  await wait(40);
  assert.equal(link.getAttribute('href'), 'https://www.rottentomatoes.com/search?search=Breaking%20Bad');

  link.dispatchEvent(new b.window.Event('pointerenter'));
  link.dispatchEvent(new b.window.FocusEvent('focusin', { bubbles: true }));
  activate(b.window, link);
  await wait(40);
  assert.equal(link.getAttribute('href'), 'https://www.rottentomatoes.com/search?search=Breaking%20Bad');
  assert.equal(requests, 1, 'hover, focus and click all respect the shared failure pause');
});

test('concurrent activations share one lookup and both chips upgrade', async (t) => {
  let requests = 0;
  const preset = { label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' };
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ ...preset, label: 'RT one' }, { ...preset, label: 'RT two' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        requests += 1;
        setTimeout(() => options.onload(wikidataResponse('tv/breaking_bad')), 20);
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const first = chip(b.document, 'RT one');
  const second = chip(b.document, 'RT two');
  activate(b.window, first);
  activate(b.window, second);
  await wait(60);

  assert.equal(first.getAttribute('href'), 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(second.getAttribute('href'), 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(requests, 1);
});

test('a result arriving after navigation does not touch the old chip', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        setTimeout(() => options.onload(wikidataResponse('tv/breaking_bad')), 350);
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const oldLink = chip(b.document, 'Rotten Tomatoes');
  activate(b.window, oldLink);
  b.window.history.pushState({}, '', '/shows/another-show');
  await wait(500);

  assert.equal(oldLink.getAttribute('href'), 'https://www.rottentomatoes.com/search?search=Breaking%20Bad');
});

test('a Wikidata 429 cools down and does not retry on the next activation', async (t) => {
  let requests = 0;
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: { 'watch.customLinks': [{ label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={title}' }] },
    gmRequest(options) {
      if (options.url.startsWith('https://query.wikidata.org/sparql')) {
        requests += 1;
        setTimeout(() => options.onload({
          status: 429,
          responseHeaders: 'Retry-After: 60',
          responseText: 'rate limited',
        }), 0);
      }
      return { abort() {} };
    },
  });
  t.after(() => b.window.close());
  await wait(50);

  const link = chip(b.document, 'Rotten Tomatoes');
  activate(b.window, link);
  await wait(40);
  activate(b.window, link);
  await wait(40);

  assert.equal(requests, 1, 'Retry-After blocks a second lookup');
  assert.equal(link.getAttribute('href'), 'https://www.rottentomatoes.com/search?search=Breaking%20Bad');
  assert.notEqual(link.getAttribute('href'), 'javascript:void(0)');
});
