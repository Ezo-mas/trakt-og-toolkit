import test from 'node:test';
import assert from 'node:assert/strict';
import { lastMonth, summarize, freshCache, fanart } from '../src/features/month-review/data.js';
import { paginate } from '../src/features/month-review/api.js';

test('local calendar boundaries cross January and daylight saving correctly', () => {
  for (const now of [new Date(2026, 0, 15), new Date(2026, 3, 2), new Date(2024, 2, 1)]) {
    const span = lastMonth(now);
    const start = new Date(span.start), end = new Date(span.end);
    assert.equal(start.getDate(), 1); assert.equal(start.getHours(), 0);
    assert.equal(end.getMonth(), now.getMonth()); assert.equal(end.getHours(), 0);
  }
  assert.equal(lastMonth(new Date(2026, 0, 1)).key, '2025-12');
  assert.equal(lastMonth(new Date(2024, 2, 1)).key, '2024-02');
});
test('counts plays including rewatches, runtimes, nested comments, and exclusive end', () => {
  const span = lastMonth(new Date(2026, 0, 15));
  const rows = [
    { watched_at: span.start, movie: { runtime: 120 } },
    { watched_at: '2025-12-15T12:00:00Z', episode: { runtime: 60 } },
    { watched_at: span.end, movie: { runtime: 999 } },
  ];
  const summary = summarize(rows, [{ rated_at: span.start }, { rated_at: span.end }],
    [{ comment: { created_at: span.start } }, { created_at: 'bad' }], span);
  assert.deepEqual([summary.plays, summary.hours, summary.ratings, summary.comments], [2, 3, 1, 1]);
  assert.equal(summary.first, rows[0]);
});
test('pagination respects page count and falls back to short pages without headers', async () => {
  const calls = [];
  const rows = await paginate(async (path, options) => { calls.push(options); return { data: [options.page], pages: 3 }; }, '/sync/history');
  assert.deepEqual(rows, [1, 2, 3]); assert.equal(calls[2].limit, 100);
  let pages = 0;
  assert.equal((await paginate(async () => ({ data: ++pages === 1 ? Array(100).fill(1) : [], pages: null }), '/x')).length, 100);
  assert.equal(pages, 2);
  await assert.rejects(paginate(async () => ({ data: {}, pages: 1 }), '/x'));
});
test('early-month cache refresh is daily; settled months remain cached', () => {
  const now = new Date(2026, 10, 2);
  assert.ok(freshCache({ savedAt: +now - 1000 }, now));
  assert.equal(freshCache({ savedAt: +now - 86400000 }, now), false);
  assert.ok(freshCache({ savedAt: 0 }, new Date(2026, 10, 8)));
});

test('month label is English and fanart uses the full size', () => {
  assert.equal(lastMonth(new Date(2026, 10, 1)).label, 'October');
  assert.equal(fanart({ show: { images: { fanart: ['media.trakt.tv/images/shows/000/004/170/fanarts/medium/a.jpg.webp'] } } }),
    'https://media.trakt.tv/images/shows/000/004/170/fanarts/full/a.jpg.webp');
  assert.equal(fanart({ movie: { images: { fanart: ['https://evil.example/fanarts/medium/a.jpg'] } } }), null);
});
