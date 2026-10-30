import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { SEASON_HTML } from './fixtures.js';
import {
  averageRating,
  axisBottom,
  barPath,
  chartGeometry,
  mapApiEpisodes,
  ratedEpisodes,
  ratingLevel,
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

test('ratingLevel matches og\'s heart colours: truncated tens, clamped to 1-10', () => {
  assert.equal(ratingLevel(83), 8);
  assert.equal(ratingLevel(79.9), 7);
  assert.equal(ratingLevel(100), 10);
  assert.equal(ratingLevel(4), 1);
});

test('barPath is square at the baseline and rounded at the top', () => {
  assert.equal(barPath(100, 20, 24, 150), 'M88,150V24Q88,20 92,20H108Q112,20 112,24V150Z');
  // A bar shorter than the radius doesn't overshoot its baseline.
  assert.match(barPath(100, 148, 24, 150), /^M88,150V150Q88,148 90,148H110Q112,148 112,150V150Z$/);
});

test('chartGeometry centres each episode in its own slot', () => {
  const episodes = [1, 2, 3, 4].map((number) => ({ number, title: `E${number}`, rating: 80, votes: 100 }));
  const { points, slot, plot, width, baseY } = chartGeometry(episodes, episodes, 80, 438);
  assert.equal(slot, (438 - plot.left - plot.right) / 4);
  assert.deepEqual(points.map((point) => point.x), [0.5, 1.5, 2.5, 3.5].map((n) => plot.left + n * slot));
  assert.ok(points.at(-1).x < width - plot.right);
  assert.ok(baseY > points[0].y, 'bars grow up from the baseline');
});
