import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPresets,
  filterPresetsByKind,
  mergeSeasons,
  moveLink,
  presetAlreadyAdded,
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

test('custom link validation requires label and URL with an HTTP scheme', () => {
  assert.deepEqual(
    validateCustomLinks([
      { label: '  ', url: '' },
      { label: 'Bad URL', url: 'javascript:alert(1)' },
      { label: 'Good', url: 'https://example.test/{title}' },
    ]),
    [
      { index: 0, field: 'label', message: 'A label is required.' },
      { index: 0, field: 'url', message: 'A URL is required.' },
      { index: 1, field: 'url', message: 'URL must start with http:// or https://.' },
    ],
  );
});
