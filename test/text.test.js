import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate, missingPlaceholders, youtubeId, cleanTitle, parseYear } from '../src/core/text.js';

test('fillTemplate encodes values and drops empty ones', () => {
  assert.equal(
    fillTemplate('https://x.test/{type}/{tmdb}?s={season}&e={episode}', { type: 'tv', tmdb: 1396, season: 5, episode: null }),
    'https://x.test/tv/1396?s=5&e=',
  );
  assert.equal(fillTemplate('{title}', { title: 'Breaking Bad' }), 'Breaking%20Bad');
});

test('missingPlaceholders reports only unfilled names', () => {
  assert.deepEqual(missingPlaceholders('{tmdb}/{nope}', { tmdb: 1, nope: '' }), ['nope']);
  assert.deepEqual(missingPlaceholders('{tmdb}', { tmdb: 0 }), []);
  assert.deepEqual(missingPlaceholders('no placeholders', {}), []);
});

test('youtubeId accepts the usual URL shapes', () => {
  assert.equal(youtubeId('https://youtu.be/VFkjBy2b50Q'), 'VFkjBy2b50Q');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=VFkjBy2b50Q'), 'VFkjBy2b50Q');
  assert.equal(youtubeId('https://www.youtube.com/embed/VFkjBy2b50Q'), 'VFkjBy2b50Q');
  assert.equal(youtubeId('https://vimeo.com/123'), null);
});

test('cleanTitle and parseYear', () => {
  assert.equal(cleanTitle('Breaking Bad (2008)'), 'Breaking Bad');
  assert.equal(cleanTitle('  The Dark  '), 'The Dark');
  assert.equal(parseYear('2008'), 2008);
  assert.equal(parseYear('Breaking Bad 2008'), 2008);
  assert.equal(parseYear('nope'), null);
});
