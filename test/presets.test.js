import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '../src/core/text.js';
import { PRESETS, presetTemplateUrls, resolvePresetUrl } from '../src/features/custom-links/presets.js';

const stremio = PRESETS.find((preset) => preset.label === 'Stremio');
const filled = (vars, kind) => fillTemplate(resolvePresetUrl(stremio.url, vars, kind), vars);

test('Stremio opens the exact movie, show and episode pages', () => {
  assert.equal(
    filled({ title: 'The Dark', imdb: 'tt0465676' }, 'movie'),
    'https://web.stremio.com/#/detail/movie/tt0465676',
  );
  assert.equal(
    filled({ title: 'Breaking Bad', imdb: 'tt0903747' }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0903747',
  );
  assert.equal(
    filled({ title: 'Breaking Bad', imdb: 'tt0903747', season: 1, episode: 2 }, 'show'),
    'https://web.stremio.com/#/detail/series/tt0903747/tt0903747:1:2',
  );
});

test('Stremio keeps its search URL when a deep link cannot be filled', () => {
  assert.equal(resolvePresetUrl(stremio.url, { title: 'Breaking Bad' }, 'show'), stremio.url);
  assert.equal(
    resolvePresetUrl(stremio.url, { title: 'Breaking Bad', season: 1, episode: 1 }, 'show'),
    stremio.url,
    'the episode route needs the IMDb id',
  );
});

test('deep links only apply to their own page kind and presets stay unchanged otherwise', () => {
  assert.equal(
    filled({ imdb: 'tt0903747', season: 1, episode: 1 }, 'movie'),
    'https://web.stremio.com/#/detail/movie/tt0903747',
    'a show selection on a movie page still uses the movie route',
  );
  assert.equal(resolvePresetUrl(stremio.url, { imdb: 'tt0903747' }, 'other'), stremio.url);

  const metacritic = PRESETS.find((preset) => preset.label === 'Metacritic');
  assert.equal(resolvePresetUrl(metacritic.url, { imdb: 'tt0903747' }, 'show'), metacritic.url);
  assert.equal(resolvePresetUrl('https://custom.test/{imdb}', { imdb: 'tt0903747' }, 'show'), 'https://custom.test/{imdb}');
});

test('presetTemplateUrls lists the search fallback and every deep route for the page kind', () => {
  assert.deepEqual(presetTemplateUrls(stremio.url, 'show'), [
    stremio.url,
    'https://web.stremio.com/#/detail/series/{imdb}/{imdb}:{season}:{episode}',
    'https://web.stremio.com/#/detail/series/{imdb}',
  ]);
  assert.deepEqual(presetTemplateUrls(stremio.url, 'movie'), [
    stremio.url,
    'https://web.stremio.com/#/detail/movie/{imdb}',
  ]);
  assert.deepEqual(presetTemplateUrls('https://custom.test/{imdb}', 'show'), ['https://custom.test/{imdb}']);
});
