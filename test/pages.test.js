import test from 'node:test';
import assert from 'node:assert/strict';
import { IncompletePagesError, PAGE_SIZE, readPages } from '../src/core/pages.js';

test('stopAtLimit stops at the first page count over the limit', async () => {
  const pages = [];
  const read = async (page) => {
    pages.push(page);
    return { data: [page], pages: 9 };
  };
  assert.deepEqual(await readPages(read, { maxPages: 3, stopAtLimit: true }), { rows: [], limited: true });
  assert.deepEqual(pages, [1]);
  assert.deepEqual(await readPages(read, { maxPages: 3 }), { rows: [1, 2, 3], limited: true });
});

test('an empty page fails when Trakt counts several pages, and ends a one-page list', async () => {
  const gap = async (page) => ({ data: page === 1 ? Array(PAGE_SIZE).fill(1) : [], pages: 2 });
  await assert.rejects(readPages(gap, { maxPages: 5 }), IncompletePagesError);
  assert.deepEqual(await readPages(async () => ({ data: [], pages: 1 }), { maxPages: 5 }), { rows: [], limited: false });
});

test('a null response is an empty page and a malformed one fails', async () => {
  assert.deepEqual(await readPages(async () => null, { maxPages: 5 }), { rows: [], limited: false });
  await assert.rejects(readPages(async () => ({ data: {}, pages: null }), { maxPages: 5 }), IncompletePagesError);
});
