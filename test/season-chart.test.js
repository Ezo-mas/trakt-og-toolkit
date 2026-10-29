import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { SEASON_HTML } from './fixtures.js';
import {
  averageRating,
  axisBottom,
  mapApiEpisodes,
  ratedEpisodes,
  readSeasonEpisodes,
} from '../src/features/season-chart/data.js';

function seasonDocument() {
  const window = new Window();
  window.document.body.innerHTML = SEASON_HTML;
  return { window, document: window.document };
}

test('DOM rows are returned in episode order even when og re-sorts them', (t) => {
  const { window, document } = seasonDocument();
  t.after(() => window.close());

  const episodes = readSeasonEpisodes(document);
  assert.deepEqual(episodes.map(({ number }) => number), [1, 2, 3, 4]);
  assert.equal(episodes[0].title, 'Pilot');
  assert.equal(episodes[0].rating, 83);
  assert.equal(episodes[0].href, '/shows/breaking-bad/seasons/1/episodes/1');
});

test('API ratings map to percentages and keep episode links', () => {
  const episodes = mapApiEpisodes(
    [
      { number: 2, title: 'Second', rating: 8.1, votes: 9876 },
      { number: 1, title: 'First', rating: 8.3, votes: 12345 },
    ],
    { showId: 'breaking-bad', season: 1 },
  );

  assert.deepEqual(episodes.map(({ number, rating }) => [number, rating]), [[1, 83], [2, 81]]);
  assert.equal(episodes[1].href, '/shows/breaking-bad/seasons/1/episodes/2');
  assert.equal(episodes[1].votes, 9876);
});

test('unrated episodes are omitted and low-vote ratings remain plotted but are excluded from averages', () => {
  const episodes = mapApiEpisodes(
    [
      { number: 1, rating: 0, votes: 0 },
      { number: 2, rating: 10, votes: 9 },
      { number: 3, rating: 8, votes: 20 },
      { number: 4, votes: 0 },
    ],
    { showId: 'breaking-bad', season: 1 },
  );

  assert.deepEqual(ratedEpisodes(episodes).map(({ number }) => number), [2, 3]);
  assert.equal(averageRating(episodes), 80);
});

test('average is vote-weighted when votes are known and plain when they are unknown', () => {
  assert.equal(
    averageRating([
      { number: 1, rating: 80, votes: 10 },
      { number: 2, rating: 90, votes: 30 },
    ]),
    87.5,
  );
  assert.equal(
    averageRating([
      { number: 1, rating: 80, votes: null },
      { number: 2, rating: 90, votes: null },
    ]),
    85,
  );
});

test('axis bottom is 50% or the lowest rating rounded down to ten', () => {
  assert.equal(axisBottom([{ number: 1, rating: 83 }]), 50);
  assert.equal(axisBottom([{ number: 1, rating: 49 }]), 40);
  assert.equal(axisBottom([{ number: 1, rating: 8 }]), 0);
});
