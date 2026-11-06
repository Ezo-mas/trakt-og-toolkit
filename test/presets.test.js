import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '../src/core/text.js';
import { SERVER_KEYS } from '../src/settings.js';
import { imdbNumber } from '../src/features/custom-links/data.js';
import { PRESETS, presetTemplateUrls, resolvePresetUrl } from '../src/features/custom-links/presets.js';

const preset = (label) => PRESETS.find((entry) => entry.label === label);
const withNumbers = (vars) => ({
  ...vars,
  imdbnum: imdbNumber(vars.imdb),
  episodeimdbnum: imdbNumber(vars.episodeImdb),
});
const filled = (label, vars, kind) => {
  const values = withNumbers(vars);
  return fillTemplate(resolvePresetUrl(preset(label).url, values, kind), values, SERVER_KEYS);
};
const stremio = preset('Stremio');

test('Stremio opens the exact movie, show, season and episode pages', () => {
  assert.equal(
    filled('Stremio', { title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://web.stremio.com/#/detail/movie/tt0465676',
  );
  assert.equal(
    filled('Stremio', { title: 'Breaking Bad', imdb: 'tt0903747' }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0903747',
  );
  assert.equal(
    filled('Stremio', { title: 'Star Wars: The Clone Wars', imdb: 'tt0458290', season: 6 }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0458290?season=6',
  );
  assert.equal(
    filled('Stremio', { title: 'Show specials', imdb: 'tt0903747', season: 0 }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0903747?season=0',
    'season 0 is a value, not a missing placeholder',
  );
  assert.equal(
    filled('Stremio', { title: 'Breaking Bad', imdb: 'tt0903747', season: 1, episode: 2 }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:1:2',
  );
});

test('Stremio keeps its search URL when a deep link cannot be filled', () => {
  assert.equal(resolvePresetUrl(stremio.url, { title: 'Breaking Bad' }, 'show'), stremio.url);
  assert.equal(
    resolvePresetUrl(stremio.url, { title: 'Breaking Bad', season: 1 }, 'show'),
    stremio.url,
    'the season route needs the IMDb id',
  );
  assert.equal(
    resolvePresetUrl(stremio.url, { title: 'Breaking Bad', season: 1, episode: 1 }, 'show'),
    stremio.url,
    'the episode route needs the IMDb id',
  );
});

test('deep links only apply to their own page kind and presets stay unchanged otherwise', () => {
  assert.equal(
    filled('Stremio', { imdb: 'tt0903747', season: 1, episode: 1 }, 'movie'),
    'https://web.stremio.com/#/detail/movie/tt0903747',
    'a show selection on a movie page still uses the movie route',
  );
  assert.equal(resolvePresetUrl(stremio.url, { imdb: 'tt0903747' }, 'other'), stremio.url);

  const metacritic = preset('Metacritic');
  assert.equal(resolvePresetUrl(metacritic.url, { imdb: 'tt0903747' }, 'show'), metacritic.url);
  assert.equal(resolvePresetUrl('https://custom.test/{imdb}', { imdb: 'tt0903747' }, 'show'), 'https://custom.test/{imdb}');
});

test('IMDb opens the title or season and otherwise searches', () => {
  assert.equal(
    filled('IMDb', { title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://www.imdb.com/title/tt0465676/',
  );
  assert.equal(
    filled('IMDb', { title: 'Breaking Bad', imdb: 'tt0903747' }, 'show'),
    'https://www.imdb.com/title/tt0903747/',
  );
  assert.equal(
    filled('IMDb', { title: 'Breaking Bad', imdb: 'tt0903747', season: 1 }, 'show'),
    'https://www.imdb.com/title/tt0903747/episodes?season=1',
  );
  assert.equal(
    filled('IMDb', { title: 'Breaking Bad' }, 'show'),
    'https://www.imdb.com/find/?q=Breaking%20Bad',
  );
});

test('TMDb opens the exact movie, show, season and episode', () => {
  assert.equal(
    filled('TMDb', { title: 'Breaking Bad', tmdb: 1396 }, 'show'),
    'https://www.themoviedb.org/tv/1396',
  );
  assert.equal(
    filled('TMDb', { title: 'Breaking Bad', tmdb: 1396, season: 1 }, 'show'),
    'https://www.themoviedb.org/tv/1396/season/1',
  );
  assert.equal(
    filled('TMDb', { title: 'Breaking Bad', tmdb: 1396, season: 1, episode: 2 }, 'show'),
    'https://www.themoviedb.org/tv/1396/season/1/episode/2',
  );
  assert.equal(
    filled('TMDb', { title: 'The Dark', tmdb: 8967 }, 'movie'),
    'https://www.themoviedb.org/movie/8967',
  );
  assert.equal(
    filled('TMDb', { title: 'The Dark' }, 'movie'),
    'https://www.themoviedb.org/search?query=The%20Dark',
  );
});

test('TVDB opens the exact show and otherwise searches', () => {
  assert.equal(
    filled('TVDB', { title: 'Breaking Bad', tvdb: 81189 }, 'show'),
    'https://thetvdb.com/dereferrer/series/81189',
  );
  assert.equal(
    filled('TVDB', { title: 'Breaking Bad' }, 'show'),
    'https://thetvdb.com/search?query=Breaking%20Bad',
  );
});

test('Letterboxd opens the exact movie by IMDb or TMDb id', () => {
  assert.equal(
    filled('Letterboxd', { title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://letterboxd.com/imdb/tt0465676/',
  );
  assert.equal(
    filled('Letterboxd', { title: 'The Dark', tmdb: 8967 }, 'movie'),
    'https://letterboxd.com/tmdb/8967/',
    'TMDb is the fallback when the page has no IMDb id',
  );
  assert.equal(
    filled('Letterboxd', { title: 'The Dark' }, 'movie'),
    'https://letterboxd.com/search/The%20Dark/',
  );
});

test('Debrid Media Manager opens movie, show and season routes', () => {
  assert.equal(
    filled('Debrid Media Manager', { title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://debridmediamanager.com/movie/tt0465676',
  );
  assert.equal(
    filled('Debrid Media Manager', { title: 'Breaking Bad', imdb: 'tt0903747' }, 'show'),
    'https://debridmediamanager.com/show/tt0903747',
  );
  assert.equal(
    filled('Debrid Media Manager', { title: 'Breaking Bad', imdb: 'tt0903747', season: 2 }, 'show'),
    'https://debridmediamanager.com/show/tt0903747/2',
  );
  assert.equal(
    filled('Debrid Media Manager', { title: 'Breaking Bad' }, 'show'),
    'https://debridmediamanager.com/search?query=Breaking%20Bad',
  );
});

test('MDBList searches movies and shows with its own forms', () => {
  assert.equal(
    filled('MDBList', { title: 'The Dark' }, 'movie'),
    'https://mdblist.com/movies/?q_title=The%20Dark',
  );
  assert.equal(
    filled('MDBList', { title: 'Breaking Bad' }, 'show'),
    'https://mdblist.com/shows/?q_title=Breaking%20Bad',
  );
});

test('OpenSubtitles opens movie, show, season and episode searches by IMDb number', () => {
  assert.equal(
    filled('OpenSubtitles', { title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-465676',
  );
  assert.equal(
    filled('OpenSubtitles', { title: 'Breaking Bad', imdb: 'tt0903747' }, 'show'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-903747',
  );
  assert.equal(
    filled('OpenSubtitles', { title: 'Breaking Bad', imdb: 'tt0903747', season: 1 }, 'show'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-903747/season-1',
  );
  assert.equal(
    filled(
      'OpenSubtitles',
      { title: 'Breaking Bad', imdb: 'tt0903747', season: 1, episode: 1, episodeImdb: 'tt0959621' },
      'show',
    ),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-959621',
  );
  assert.equal(
    filled('OpenSubtitles', { title: 'Breaking Bad', imdb: 'tt0903747', season: 1, episode: 1 }, 'show'),
    'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-903747/season-1',
    'without the episode id, the season page is the fallback',
  );
});

test('server presets use the configured host and the best id they have', () => {
  const servers = {
    jellyfin: 'http://media.test:8096/jellyfin',
    emby: 'https://media.test/emby',
    radarr: 'http://apps.test:7878',
    sonarr: 'http://apps.test:8989',
    seerr: 'https://requests.test/seerr',
  };
  assert.equal(
    filled('Jellyfin', { title: 'Breaking Bad', ...servers }, 'show'),
    'http://media.test:8096/jellyfin/web/#/search?query=Breaking%20Bad',
  );
  assert.equal(
    filled('Emby', { title: 'Breaking Bad', ...servers }, 'show'),
    'https://media.test/emby/web/index.html#!/list/list.html?type=search&searchtext=Breaking%20Bad',
  );
  assert.equal(
    filled('Radarr', { title: 'The Dark', imdb: 'tt0465676', tmdb: 8967, ...servers }, 'movie'),
    'http://apps.test:7878/add/new?term=imdb:tt0465676',
  );
  assert.equal(
    filled('Radarr', { title: 'The Dark', tmdb: 8967, ...servers }, 'movie'),
    'http://apps.test:7878/add/new?term=tmdb:8967',
  );
  assert.equal(
    filled('Radarr', { title: 'The Dark', ...servers }, 'movie'),
    'http://apps.test:7878/add/new?term=The%20Dark',
  );
  assert.equal(
    filled('Sonarr', { title: 'Breaking Bad', tvdb: 81189, ...servers }, 'show'),
    'http://apps.test:8989/add/new?term=tvdb:81189',
  );
  assert.equal(
    filled('Sonarr', { title: 'Breaking Bad', ...servers }, 'show'),
    'http://apps.test:8989/add/new?term=Breaking%20Bad',
  );
  assert.equal(
    filled('Seerr', { title: 'The Dark', tmdb: 8967, ...servers }, 'movie'),
    'https://requests.test/seerr/movie/8967',
  );
  assert.equal(
    filled('Seerr', { title: 'Breaking Bad', tmdb: 1396, ...servers }, 'show'),
    'https://requests.test/seerr/tv/1396',
  );
});

test('the og external-link services have search presets', () => {
  assert.equal(filled('Rotten Tomatoes', { title: 'The Dark' }, 'movie'), 'https://www.rottentomatoes.com/search?search=The%20Dark');
  assert.equal(filled('Wikipedia', { title: 'The Dark' }, 'movie'), 'https://en.wikipedia.org/w/index.php?search=The%20Dark');
  assert.equal(filled('JustWatch', { title: 'The Dark' }, 'movie'), 'https://www.justwatch.com/us/search?q=The%20Dark');
  assert.equal(filled('MyAnimeList', { title: 'The Dark' }, 'movie'), 'https://myanimelist.net/search/all?q=The%20Dark');
  assert.equal(filled('MDBList', { title: 'The Dark' }, 'movie'), 'https://mdblist.com/movies/?q_title=The%20Dark');
  assert.equal(filled('OpenSubtitles', { imdb: 'tt0465676' }, 'movie'), 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-465676');
});

test('presetTemplateUrls lists the search fallback and every deep route for the page kind', () => {
  assert.deepEqual(presetTemplateUrls(stremio.url, 'show'), [
    stremio.url,
    'https://web.stremio.com/#/detail/series/{imdb}/{imdb}:{season}:{episode}',
    'https://web.stremio.com/#/detail/series/{imdb}?season={season}',
    'https://web.stremio.com/#/detail/series/{imdb}',
  ]);
  assert.deepEqual(presetTemplateUrls(stremio.url, 'movie'), [
    stremio.url,
    'https://web.stremio.com/#/detail/movie/{imdb}',
  ]);
  assert.deepEqual(presetTemplateUrls('https://custom.test/{imdb}', 'show'), ['https://custom.test/{imdb}']);
});

test('every preset has a unique search URL and server presets name their host', () => {
  assert.equal(new Set(PRESETS.map((entry) => entry.url)).size, PRESETS.length);
  for (const label of ['Jellyfin', 'Emby', 'Radarr', 'Sonarr', 'Seerr']) {
    assert.ok(SERVER_KEYS.includes(preset(label).requires), `${label} declares its server`);
  }
});
