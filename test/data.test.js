import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSeasons } from '../src/features/watch-now/data.js';

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
