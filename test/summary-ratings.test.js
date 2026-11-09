import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { MOVIE_HTML, SHOW_HTML } from './fixtures.js';
import { parseRoute } from '../src/core/router.js';
import {
  MIN_VOTES,
  averagePosition,
  barHeights,
  layoutFor,
  mostGiven,
  parseRatings,
  ratingsPath,
  shortCount,
  statTiles,
  statsHref,
  statsPath,
} from '../src/features/summary-ratings/data.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Live API responses, 2026-11-09 (api.trakt.tv, public client ID). */
const SHOW_RATINGS = { rating: 7.45317, votes: 5029, distribution: { 1: 44, 2: 34, 3: 43, 4: 77, 5: 265, 6: 582, 7: 1513, 8: 1345, 9: 495, 10: 631 } };
const SEASON_RATINGS = {
  trakt: { rating: 5.70573, votes: 2596, distribution: { 1: 3, 2: 4, 3: 3, 4: 9, 5: 1756, 6: 93, 7: 494, 8: 166, 9: 48, 10: 20 } },
  tmdb: { rating: null, votes: null, link: 'https://www.themoviedb.org/tv/90228/season/1' },
};
const FEW_VOTES = { trakt: { rating: 7, votes: 2, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 0, 8: 1, 9: 0, 10: 0 } } };
const SHOW_STATS = { watchers: 91913, plays: 500348, votes: 5029 };

test('ratings and stats paths cover movies, shows, seasons and episodes only', () => {
  const cases = [
    ['/movies/the-matrix-1999', '/movies/the-matrix-1999/ratings', '/movies/the-matrix-1999/stats'],
    ['/shows/dune-prophecy', '/shows/dune-prophecy/ratings', '/shows/dune-prophecy/stats'],
    ['/shows/dune-prophecy/seasons/1', '/shows/dune-prophecy/seasons/1/ratings', '/shows/dune-prophecy/seasons/1/stats'],
    ['/shows/dune-prophecy/seasons/1/episodes/3', '/shows/dune-prophecy/seasons/1/episodes/3/ratings',
      '/shows/dune-prophecy/seasons/1/episodes/3/stats'],
  ];
  for (const [path, ratings, stats] of cases) {
    const route = parseRoute(path);
    assert.equal(ratingsPath(route), ratings);
    assert.equal(statsPath(route), stats);
    assert.equal(statsHref(route), `${path}/stats`);
  }
  for (const path of ['/shows/dune-prophecy/seasons', '/movies/the-matrix-1999/stats', '/people/bryan-cranston', '/']) {
    assert.equal(ratingsPath(parseRoute(path)), null, path);
  }
});

test('parseRatings reads both response shapes and drops titles with too few votes', () => {
  assert.deepEqual(parseRatings(SHOW_RATINGS), {
    rating: 7.45317, votes: 5029, counts: [44, 34, 43, 77, 265, 582, 1513, 1345, 495, 631],
  });
  assert.equal(parseRatings(SEASON_RATINGS).votes, 2596, 'season ratings are wrapped in `trakt`');
  assert.equal(parseRatings(FEW_VOTES), null, `under ${MIN_VOTES} votes`);
  assert.equal(parseRatings(null), null);
  assert.equal(parseRatings({ rating: 8, votes: 50 }), null, 'no distribution');
  assert.equal(parseRatings({ votes: 20, distribution: { 10: 20 } }).rating, 10, 'average falls back to the distribution');
});

test('chart helpers: most given, bar heights, average position and short counts', () => {
  assert.equal(mostGiven([1, 5, 5, 0, 0, 0, 0, 0, 0, 0]), 3, 'a tie goes to the higher score');
  const heights = barHeights([0, 1, 1000, 0, 0, 0, 0, 0, 0, 500]);
  assert.equal(heights[0], 0);
  assert.equal(heights[1], 0.04, 'a single vote stays visible');
  assert.equal(heights[2], 1);
  assert.equal(heights[9], 0.5);
  assert.equal(averagePosition(1), 0.05);
  assert.equal(averagePosition(10), 0.95);
  assert.equal(averagePosition(7.5), 0.7);
  assert.equal(shortCount(1512), '1,512');
  assert.equal(shortCount(25111), '25.1K');
});

test('stat tiles match og\'s stats page for the same distribution', () => {
  const tiles = statTiles(parseRatings(SHOW_RATINGS), SHOW_STATS.watchers);
  assert.deepEqual(tiles.map(({ name, value, suffix, note }) => [name, value, suffix ?? null, note]), [
    ['Rating', '74%', null, 'Good'],
    ['Votes', '5,029', null, '5.5% of watchers'],
    ['Most given', '7', 'Good', '30% of 5,029 votes'],
    ['Liked it', '79%', null, 'gave it 7 or higher'],
  ]);
  assert.equal(statTiles(parseRatings(SHOW_RATINGS))[1].note, '', 'no watcher share without stats');
});

test('layout shows chart and tiles, the chart alone, or nothing, by the space beside the actions', () => {
  assert.equal(layoutFor({ contentBottom: 300, columnBottom: 600 }), 'full');
  assert.equal(layoutFor({ contentBottom: 300, columnBottom: 300 + 124 + 75 }), 'chart');
  assert.equal(layoutFor({ contentBottom: 300, columnBottom: 300 + 124 }), 'chart');
  assert.equal(layoutFor({ contentBottom: 300, columnBottom: 300 + 123 }), null);
  assert.equal(layoutFor({ contentBottom: NaN, columnBottom: 600 }), null);
});

/**
 * Boot the built bundle with GM shims and a fake layout: og's details content ends at `space.details` and the
 * action stack's content at `space.actions` (page px). happy-dom has no layout, so rects are stubbed per column.
 */
function boot({ url, html, storage = {}, responses = {}, space = { details: 300, actions: 600 } }) {
  const window = new Window({ url });
  const { document } = window;
  const store = new Map(Object.entries(storage));
  const requests = [];
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
  window.GM_xmlhttpRequest = (options) => {
    const path = new URL(options.url).pathname;
    requests.push(path);
    const body = responses[path];
    setTimeout(() => options.onload(body === undefined
      ? { status: 404, responseHeaders: '', responseText: '' }
      : { status: 200, responseHeaders: '', responseText: JSON.stringify(body) }), 0);
    return { abort() {} };
  };

  const rect = (top, bottom) => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top });
  window.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const parent = this.parentElement;
    if (this.id === 'ogt-summary-ratings') return rect(space.details, space.details + 124);
    // A column's own top: an empty details column (the movie fixture) then ends where its content would.
    if (this.matches?.('#overview .top > .details')) return rect(space.details, space.details);
    if (this.matches?.('#overview .top > .actions')) return rect(100, 100);
    if (parent?.matches?.('#overview .top > .details')) return rect(100, space.details);
    if (parent?.matches?.('#overview .top > .actions')) return rect(100, space.actions);
    return rect(0, 0);
  };

  document.write(`<!doctype html><html><head><title>Test - Trakt OG Redux</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, requests, space };
}

const CLIENT = { 'trakt.clientId': 'client', 'watch.customLinks': [] };
const chartOf = (document) => document.getElementById('ogt-summary-ratings');

test('the chart and tiles fill a tall gap and link to og\'s stats page', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: CLIENT,
    responses: { '/shows/breaking-bad/ratings': SHOW_RATINGS, '/shows/breaking-bad/stats': SHOW_STATS },
  });
  t.after(() => b.window.close());
  await wait(80);

  const node = chartOf(b.document);
  assert.ok(node, 'mounted in og\'s details column');
  assert.equal(node.parentElement.className, 'details');
  assert.equal(node.hidden, false);
  assert.equal(node.dataset.layout, 'full');
  const head = node.querySelector('.ogt-sr-head');
  assert.equal(head.getAttribute('href'), '/shows/breaking-bad/stats');
  assert.match(head.getAttribute('aria-label'), /7\.45 average from 5,029 votes/);
  assert.deepEqual([...node.querySelectorAll('.ogt-sr-count')].map((count) => count.textContent),
    ['44', '34', '43', '77', '265', '582', '1,513', '1,345', '495', '631']);
  assert.equal(node.querySelectorAll('.ogt-sr-column--top').length, 1);
  assert.equal(node.querySelector('.ogt-sr-column--top .ogt-visually-hidden').textContent, '7, Good: 1,513 votes');
  assert.equal(node.querySelector('.ogt-sr-tile:nth-child(2) .ogt-sr-tile-note').textContent, '5.5% of watchers');
  assert.deepEqual(b.requests, ['/shows/breaking-bad/ratings', '/shows/breaking-bad/stats']);
});

test('a smaller gap shows the chart alone and makes no stats request; no gap hides it', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/movies/the-dark-2005',
    html: MOVIE_HTML,
    storage: CLIENT,
    responses: { '/movies/the-dark-2005/ratings': SHOW_RATINGS },
    space: { details: 300, actions: 300 + 150 },
  });
  t.after(() => b.window.close());
  await wait(80);
  const node = chartOf(b.document);
  assert.equal(node.hidden, false);
  assert.equal(node.dataset.layout, 'chart');
  assert.deepEqual(b.requests, ['/movies/the-dark-2005/ratings']);

  // og's content grows (e.g. "Read more"): the chart steps aside instead of pushing og's row taller.
  b.space.details = 500;
  b.document.querySelector('#overview .details').prepend(b.document.createElement('p'));
  await wait(30);
  assert.equal(node.hidden, true);

  b.space.details = 300;
  b.document.querySelector('#overview .details > p').remove();
  await wait(30);
  assert.equal(node.hidden, false);
});

test('no client ID, too few votes or a failed request leave the page untouched', async (t) => {
  const none = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML, storage: { 'watch.customLinks': [] } });
  t.after(() => none.window.close());
  const few = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML, storage: CLIENT,
    responses: { '/shows/breaking-bad/ratings': FEW_VOTES },
  });
  t.after(() => few.window.close());
  const failed = boot({ url: 'https://og.trakt.tv/shows/breaking-bad', html: SHOW_HTML, storage: CLIENT });
  t.after(() => failed.window.close());
  await wait(80);

  assert.equal(chartOf(none.document), null);
  assert.deepEqual(none.requests, []);
  assert.equal(chartOf(few.document).hidden, true);
  assert.equal(chartOf(few.document).children.length, 0);
  assert.equal(chartOf(failed.document).hidden, true);
});

test('turning the feature off removes the chart', async (t) => {
  const b = boot({
    url: 'https://og.trakt.tv/shows/breaking-bad',
    html: SHOW_HTML,
    storage: CLIENT,
    responses: { '/shows/breaking-bad/ratings': SHOW_RATINGS, '/shows/breaking-bad/stats': SHOW_STATS },
  });
  t.after(() => b.window.close());
  await wait(80);
  assert.ok(chartOf(b.document));
  b.store.set('features.disabled', ['summary-ratings']);
  b.document.dispatchEvent(new b.window.CustomEvent('ogt:featurechange', { detail: { id: 'summary-ratings', enabled: false } }));
  await wait(30);
  assert.equal(chartOf(b.document), null);
});
