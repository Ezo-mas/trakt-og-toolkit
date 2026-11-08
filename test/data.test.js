import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parseRoute } from '../src/core/router.js';
import {
  EPISODE_PAGE_HTML,
  PERSON_PAGE_HTML,
  SEASON_PAGE_HTML,
  SHOW_HTML,
  withGenres,
} from './fixtures.js';
import {
  addPresets,
  filterPresetsByKind,
  imdbNumber,
  mergeSeasons,
  moveLink,
  personTemplateVars,
  presetAlreadyAdded,
  readGenres,
  readPersonData,
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

test('genre restrictions gate conditional presets and fail open when metadata is unknown', () => {
  const anime = { label: 'Anime', url: 'https://anime.test/{title}', kinds: ['show'], genres: ['anime'] };
  const all = { label: 'All', url: 'https://all.test/{title}', kinds: ['show'] };
  assert.deepEqual(filterPresetsByKind([anime, all], 'show', ['anime']), [anime, all]);
  assert.deepEqual(filterPresetsByKind([anime, all], 'show', ['drama']), [all]);
  assert.deepEqual(filterPresetsByKind([anime, all], 'show', null), [anime, all], 'unknown genres keep presets');
  assert.deepEqual(filterPresetsByKind([anime, all], 'show'), [anime, all], 'omitted genres are unknown');
});

test('title genres come only from the current title genre field', (t) => {
  const window = new Window();
  t.after(() => window.close());

  window.document.body.innerHTML = withGenres(SHOW_HTML, ['anime', 'action']) +
    '<nav><a href="/shows/popular?genres=drama">Browse drama</a></nav>';
  assert.deepEqual(readGenres(window.document), ['anime', 'action'], 'navigation links are ignored');
  assert.deepEqual(readTitleData(window.document, parseRoute('/shows/cowboy-bebop')).genres, ['anime', 'action']);

  window.document.body.innerHTML = withGenres(SHOW_HTML, ['drama']) +
    '<nav><a href="/shows/popular?genres=anime">Browse anime</a></nav>';
  assert.deepEqual(readGenres(window.document), ['drama'], 'the field wins over a navigation link');

  window.document.body.innerHTML = SHOW_HTML +
    '<nav><a href="/shows/popular?genres=drama">Browse drama</a></nav>';
  assert.equal(readGenres(window.document), null, 'missing genre metadata stays unknown');
  assert.equal(readTitleData(window.document, parseRoute('/shows/unknown')).genres, null);
});

test('person pages read their name and native ids without title variables', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = PERSON_PAGE_HTML;
  const person = readPersonData(window.document, parseRoute('/people/bryan-cranston'));
  assert.deepEqual(person, {
    kind: 'person',
    id: 'bryan-cranston',
    name: 'Bryan Cranston',
    imdb: 'nm0186505',
    tmdb: 17419,
  });
  assert.deepEqual(personTemplateVars(person), {
    person: 'Bryan Cranston',
    personid: 'bryan-cranston',
    personimdb: 'nm0186505',
    persontmdb: 17419,
  });
  const titleVars = templateVars({ id: 'breaking-bad', title: 'Breaking Bad' });
  assert.equal('person' in titleVars, false, 'person values do not leak into title templates');
  assert.equal('personid' in titleVars, false);
});

test('person ids come only from the native external-link strip', (t) => {
  const window = new Window();
  t.after(() => window.close());
  const html = PERSON_PAGE_HTML
    .replace(/<li><a[^>]*href="https:\/\/www\.imdb\.com\/name\/nm0186505"[^>]*>[\s\S]*?<\/li>/, '')
    .replace('</main>', '<section id="comments"><a href="https://www.imdb.com/name/nm9999999">Other person</a></section></main>');
  window.document.body.innerHTML = html;
  const person = readPersonData(window.document, parseRoute('/people/bryan-cranston'));
  assert.equal(person.imdb, null, 'a comment link cannot supply the person id');
  assert.equal(person.tmdb, 17419, 'the native TMDb link still works');
});

test('person ids ignore lookalike hosts and insecure links', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = PERSON_PAGE_HTML
    .replace('https://www.imdb.com/name/nm0186505', 'https://imdb.com.evil.test/name/nm0186505')
    .replace('https://www.themoviedb.org/person/17419', 'http://www.themoviedb.org/person/17419');
  const person = readPersonData(window.document, parseRoute('/people/bryan-cranston'));
  assert.equal(person.imdb, null);
  assert.equal(person.tmdb, null);
});

test('person pages keep a missing name and missing native links null', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = '<div class="summary-title"><h1> </h1></div>';
  assert.equal(readPersonData(window.document, parseRoute('/people/unknown')).name, null);
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
    window.document.body.innerHTML = `<div class="ratings-strip"><a href="${href}">Link</a></div>`;
    assert.equal(readTitleData(window.document, parseRoute('/movies/test')).rottenTomatoesUrl, null, href);
  }
});

test('direct Metacritic and Rotten Tomatoes URLs come only from native title strips', t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/the-dark-2005' });
  t.after(() => window.close());
  const route = parseRoute('/movies/the-dark-2005');

  window.document.body.innerHTML = '<a href="https://www.metacritic.com/movie/the-matrix">Comment</a>' +
    '<a href="https://www.rottentomatoes.com/m/the_matrix">Comment</a>';
  const unrelated = readTitleData(window.document, route);
  assert.equal(unrelated.metacriticUrl, null, 'a comment link must not choose another title');
  assert.equal(unrelated.rottenTomatoesUrl, null);

  for (const [open, close] of [['<div class="ratings-strip"><ul>', '</ul></div>'],
    ['<ul class="external-links">', '</ul>']]) {
    window.document.body.innerHTML = `${open}
      <li><a href="https://www.metacritic.com/movie/the-dark">Metacritic</a></li>
      <li><a href="https://www.rottentomatoes.com/m/the_dark?tracking=og">Rotten Tomatoes</a></li>
    ${close}`;
    const native = readTitleData(window.document, route);
    assert.equal(native.metacriticUrl, 'https://www.metacritic.com/movie/the-dark/');
    assert.equal(native.rottenTomatoesUrl, 'https://www.rottentomatoes.com/m/the_dark');
  }
});

test('template vars expose direct Metacritic and Rotten Tomatoes URLs', () => {
  const vars = templateVars({
    id: 'the-dark',
    metacriticUrl: 'https://www.metacritic.com/movie/the-dark/',
    rottenTomatoesUrl: 'https://www.rottentomatoes.com/m/the_dark',
  });
  assert.equal(vars.metacriticUrl, 'https://www.metacritic.com/movie/the-dark/');
  assert.equal(vars.rottenTomatoesUrl, 'https://www.rottentomatoes.com/m/the_dark');
});
