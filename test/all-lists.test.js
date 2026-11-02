import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collaborationLists,
  itemCountLabel,
  likedLists,
  listHref,
  normalizeList,
  posterUrl,
} from '../src/features/all-lists/data.js';

const list = (overrides = {}) => ({
  name: 'Sci-Fi Together',
  description: ' Shared picks. ',
  privacy: 'public',
  type: 'personal',
  item_count: 12,
  likes: 4,
  ids: { trakt: 9001, slug: 'sci-fi-together' },
  user: { username: 'justin', name: 'Justin', ids: { slug: 'justin' } },
  images: { posters: ['https://media.trakt.tv/images/lists/000/009/001/posters/medium/abc.jpg.webp'] },
  ...overrides,
});

test('normalizeList keeps the fields the panel uses', () => {
  assert.deepEqual(normalizeList(list()), {
    id: 9001,
    slug: 'sci-fi-together',
    name: 'Sci-Fi Together',
    description: 'Shared picks.',
    owner: { slug: 'justin', name: 'Justin' },
    itemCount: 12,
    likes: 4,
    poster: 'https://media.trakt.tv/images/lists/000/009/001/posters/medium/abc.jpg.webp',
  });
});

test('normalizeList falls back to the username and rejects unusable entries', () => {
  const noName = normalizeList(list({ user: { username: 'justin', ids: { slug: 'justin' } } }));
  assert.deepEqual(noName.owner, { slug: 'justin', name: 'justin' });

  for (const bad of [
    null,
    [],
    'list',
    list({ ids: {} }),
    list({ ids: { trakt: 9001 } }),
    list({ user: null }),
    list({ name: '  ' }),
    list({ ids: { trakt: 0, slug: 'zero' } }),
  ]) {
    assert.equal(normalizeList(bad), null, JSON.stringify(bad));
  }
});

test('normalizeList leaves bad counts and images out', () => {
  const row = normalizeList(list({ item_count: -1, likes: 1.5, images: { posters: ['http://media.trakt.tv/a.jpg', 'https://evil.test/b.jpg'] } }));
  assert.equal(row.itemCount, null);
  assert.equal(row.likes, null);
  assert.equal(row.poster, null);
});

test('posterUrl accepts only HTTPS media.trakt.tv images', () => {
  assert.equal(posterUrl('media.trakt.tv/lists/a.jpg.webp'), 'https://media.trakt.tv/lists/a.jpg.webp');
  assert.equal(posterUrl('https://media.trakt.tv/lists/a.jpg.webp'), 'https://media.trakt.tv/lists/a.jpg.webp');
  assert.equal(posterUrl('http://media.trakt.tv/lists/a.jpg.webp'), null);
  assert.equal(posterUrl('https://cdn.trakt.tv/lists/a.jpg.webp'), null);
  assert.equal(posterUrl('javascript:alert(1)'), null);
  assert.equal(posterUrl(null), null);
});

test('the two indexes normalize to the same row shape, in API order', () => {
  const rows = collaborationLists([list(), { nope: true }, list({ ids: { trakt: 9003, slug: 'third' } })]);
  assert.deepEqual(rows.map((row) => row.slug), ['sci-fi-together', 'third']);

  const liked = likedLists([
    { liked_at: '2026-10-30T12:00:00.000Z', list: list({ ids: { trakt: 9002, slug: 'liked-first' } }) },
    null,
    { liked_at: '2026-10-29T12:00:00.000Z', list: list({ ids: { trakt: 9004, slug: 'liked-second' } }) },
  ]);
  assert.deepEqual(liked.map((row) => row.slug), ['liked-first', 'liked-second']);
  assert.deepEqual(collaborationLists(null), []);
  assert.deepEqual(likedLists({ list: [] }), []);
});

test('listHref encodes slugs as path segments', () => {
  assert.equal(
    listHref({ slug: 'what/if', owner: { slug: 'justin smith' } }),
    '/users/justin%20smith/lists/what%2Fif',
  );
});

test('itemCountLabel handles one, many and unknown counts', () => {
  assert.equal(itemCountLabel(1), '1 item');
  assert.equal(itemCountLabel(12), '12 items');
  assert.equal(itemCountLabel(0), '0 items');
  assert.equal(itemCountLabel(null), null);
  assert.equal(itemCountLabel(-1), null);
});
