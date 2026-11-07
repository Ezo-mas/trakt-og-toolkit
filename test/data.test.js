import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parseRoute } from '../src/core/router.js';
import { EPISODE_PAGE_HTML, SEASON_PAGE_HTML, SHOW_HTML } from './fixtures.js';
import {
  addPresets,
  filterPresetsByKind,
  imdbNumber,
  mergeSeasons,
  moveLink,
  presetAlreadyAdded,
  readTitleData,
  selectionForRoute,
  showTemplateData,
  templateVars,
  validateCustomLinks,
} from '../src/features/custom-links/data.js';

test('mergeSeasons keeps API counts', () => {
  const merged = mergeSeasons([{ number: 1, episodes: 7 }], [{ number: 1, episodes: 99 }]);
  assert.deepEqual(merged, [{ number: 1, episodes: 7 }]);
});

test('mergeSeasons falls back to the rendered count when the API has none', () => {
  const merged = mergeSeasons([{ number: 1, episodes: null }], [{ number: 1, episodes: 7 }]);
  assert.deepEqual(merged, [{ number: 1, episodes: 7 }]);
});

test('mergeSeasons leaves unknown counts null and sorts by season', () => {
  const merged = mergeSeasons(
    [
      { number: 2, episodes: null },
      { number: 0, episodes: 3 },
    ],
    [],
  );
  assert.deepEqual(merged, [
    { number: 0, episodes: 3 },
    { number: 2, episodes: null },
  ]);
});

test('presets filter by kind and detect existing URLs', () => {
  const presets = [
    { label: 'Film', url: 'https://film.test/{title}', kinds: ['movie'] },
    { label: 'Both', url: 'https://both.test/{title}', kinds: ['movie', 'show'] },
  ];
  assert.deepEqual(filterPresetsByKind(presets, 'show'), [presets[1]]);
  assert.equal(presetAlreadyAdded([{ label: 'Saved', url: presets[0].url }], presets[0]), true);
  assert.equal(presetAlreadyAdded([], presets[0]), false);
});

test('adding presets copies only link fields and skips duplicate URLs', () => {
  const existing = [{ label: 'Mine', url: 'https://mine.test' }];
  const presets = [
    { label: 'Already there', url: 'https://mine.test', kinds: ['movie'] },
    { label: 'New', url: 'https://new.test/{title}', kinds: ['movie'] },
  ];
  assert.deepEqual(addPresets(existing, presets), [
    existing[0],
    { label: 'New', url: 'https://new.test/{title}' },
  ]);
  assert.deepEqual(existing, [{ label: 'Mine', url: 'https://mine.test' }]);
});

test('moveLink moves one row and leaves out-of-range moves unchanged', () => {
  const links = ['a', 'b', 'c'];
  assert.deepEqual(moveLink(links, 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveLink(links, 1, 1), ['a', 'c', 'b']);
  assert.deepEqual(moveLink(links, 0, -1), links);
  assert.deepEqual(moveLink(links, 2, 1), links);
  assert.deepEqual(links, ['a', 'b', 'c']);
});

test('season and episode pages read the show context instead of the page heading', (t) => {
  const seasonWindow = new Window();
  seasonWindow.document.body.innerHTML = SEASON_PAGE_HTML;
  const season = readTitleData(seasonWindow.document, parseRoute('/shows/breaking-bad/seasons/1'));
  seasonWindow.close();
  assert.deepEqual(
    { title: season.title, year: season.year, id: season.id, tmdb: season.tmdb, imdb: season.imdb, tvdb: season.tvdb },
    { title: 'Breaking Bad', year: null, id: 'breaking-bad', tmdb: 1396, imdb: 'tt0903747', tvdb: null },
    'the page year belongs to the season; og\'s TMDb and IMDb season links carry the show ids',
  );

  const episodeWindow = new Window();
  episodeWindow.document.body.innerHTML = EPISODE_PAGE_HTML;
  const episode = readTitleData(episodeWindow.document, parseRoute('/shows/breaking-bad/seasons/1/episodes/1'));
  episodeWindow.close();
  assert.equal(episode.title, 'Breaking Bad', 'the show link wins over the episode heading');
  assert.notEqual(episode.title, 'Pilot');
  assert.equal(episode.year, null, 'the episode air year is not the show year');
  assert.equal(episode.tmdb, 1396, 'TMDb episode links start with the show id');
  assert.equal(episode.imdb, null, 'the episode page\'s IMDb id is the episode\'s own');
  assert.equal(episode.episodeImdb, 'tt0959621', 'the episode strip carries the episode IMDb id');
  assert.equal(episode.tvdb, null, 'season and episode strips do not carry the show TVDB id');
});

test('an episode without its own IMDb id never borrows the show\'s season-list link', () => {
  const window = new Window();
  window.document.body.innerHTML = '<a href="https://www.imdb.com/title/tt0903747/episodes?season=1">IMDb</a>' +
    '<a href="https://www.imdb.com/find?q=Breaking+Bad+Episode+1&s=ep">IMDb</a>';
  const episode = readTitleData(window.document, parseRoute('/shows/breaking-bad/seasons/1/episodes/1'));
  window.close();
  assert.equal(episode.episodeImdb, null);
});

test('show pages read the TVDB id from og\'s external links', () => {
  const window = new Window();
  window.document.body.innerHTML = SHOW_HTML;
  const show = readTitleData(window.document, parseRoute('/shows/breaking-bad'));
  window.close();
  assert.equal(show.title, 'Breaking Bad');
  assert.equal(show.tvdb, 81189);
});

test('route selection presets season and episode, while title pages keep the stored picker values', () => {
  assert.deepEqual(selectionForRoute(parseRoute('/shows/breaking-bad/seasons/2')), { season: 2, episode: null });
  assert.deepEqual(
    selectionForRoute(parseRoute('/shows/breaking-bad/seasons/2/episodes/5')),
    { season: 2, episode: 5 },
  );
  assert.deepEqual(
    selectionForRoute(parseRoute('/shows/breaking-bad'), { season: 3, episode: 4 }),
    { season: 3, episode: 4 },
  );
  assert.deepEqual(selectionForRoute(parseRoute('/shows/breaking-bad'), null), { season: null, episode: null });
});

test('show lookup data supplies the show title, year and external ids, with validation', () => {
  assert.deepEqual(
    showTemplateData({ title: ' Breaking Bad ', year: 2008, ids: { trakt: 1388, tmdb: 1396, imdb: 'tt0903747', tvdb: 81189 } }),
    { title: 'Breaking Bad', year: 2008, tmdb: 1396, imdb: 'tt0903747', tvdb: 81189 },
  );
  assert.deepEqual(showTemplateData({ title: 'Show', ids: { tmdb: 0, imdb: 'nope', tvdb: 0 } }), {
    title: 'Show',
    year: null,
    tmdb: null,
    imdb: null,
    tvdb: null,
  });
  for (const bad of [null, [], 'show', { title: '  ' }]) assert.equal(showTemplateData(bad), null);
});

test('template vars include the TVDB id', () => {
  assert.equal(templateVars({ id: 'breaking-bad', tvdb: 81189 }, { season: 1 }).tvdb, 81189);
});

test('template vars expose configured server hosts', () => {
  const vars = templateVars({ id: 'breaking-bad' }, {}, {
    jellyfin: 'http://media.test:8096',
    seerr: 'https://requests.test/seerr',
  });
  assert.equal(vars.jellyfin, 'http://media.test:8096');
  assert.equal(vars.seerr, 'https://requests.test/seerr');
  assert.equal(vars.radarr, null);
});

test('template vars include IMDb numbers without tt or leading zeroes', () => {
  const vars = templateVars({ id: 'breaking-bad', imdb: 'tt0903747', episodeImdb: 'tt0959621' }, { season: 1 });
  assert.equal(vars.imdbnum, '903747');
  assert.equal(vars.episodeimdbnum, '959621');
  assert.equal(imdbNumber('tt0458290'), '458290');
  assert.equal(imdbNumber('tt2098416'), '2098416');
  assert.equal(imdbNumber(null), null);
});

test('custom link validation accepts HTTP and configured server-placeholder URLs', () => {
  assert.deepEqual(
    validateCustomLinks([
      { label: '  ', url: '' },
      { label: 'Bad URL', url: 'javascript:alert(1)' },
      { label: 'Good', url: 'https://example.test/{title}' },
      { label: 'Jellyfin', url: '{jellyfin}/web/#/search?query={title}' },
    ]),
    [
      { index: 0, field: 'label', message: 'A label is required.' },
      { index: 0, field: 'url', message: 'A URL is required.' },
      { index: 1, field: 'url', message: 'URL must start with http://, https://, or a server placeholder.' },
    ],
  );
});

test('custom link validation rejects arbitrary placeholder templates', () => {
  const message = 'URL must start with http://, https://, or a server placeholder.';
  for (const url of ['{title}/evil', '{plex}/search', '{Jellyfin}/web']) {
    assert.deepEqual(validateCustomLinks([{ label: 'Bad', url }]), [
      { index: 0, field: 'url', message },
    ]);
  }
  assert.deepEqual(validateCustomLinks([{ label: 'Emby', url: '{emby}/web/index.html' }]), []);
});


test('Rotten Tomatoes reader rejects lookalike domains, searches and the wrong page kind', t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/test' });
  t.after(() => window.close());
  for (const href of ['https://evilrottentomatoes.com/m/test', 'https://rottentomatoes.com.evil.test/m/test',
    'https://www.rottentomatoes.com/search?search=test', 'https://www.rottentomatoes.com/tv/test',
    'https://user:secret@www.rottentomatoes.com/m/test']) {
    window.document.body.innerHTML = `<a href="${href}">Link</a>`;
    assert.equal(readTitleData(window.document, parseRoute('/movies/test')).rottenTomatoesUrl, null, href);
  }
});
