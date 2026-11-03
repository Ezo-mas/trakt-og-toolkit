import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collaborationLists,
  likedLists,
  listHref,
  normalizeList,
  vipBadge,
  posterUrl,
  listPills,
  listProgressHref,
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
    owner: { slug: 'justin', name: 'Justin', avatar: null, vip: null },
    itemCount: 12,
    commentCount: null,
    allowComments: false,
    likes: 4,
    privacy: 'public',
    kind: 'personal',
    posters: ['https://media.trakt.tv/images/lists/000/009/001/posters/medium/abc.jpg.webp'],
  });
});

test('normalizeList falls back to the username and rejects unusable entries', () => {
  const noName = normalizeList(list({ user: { username: 'justin', ids: { slug: 'justin' } } }));
  assert.deepEqual(noName.owner, { slug: 'justin', name: 'justin', avatar: null, vip: null });

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
  assert.deepEqual(row.posters, []);
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
  assert.equal(listHref({ slug: 'staff-picks', kind: 'official', owner: { slug: 'trakt' } }), '/lists/official/staff-picks');
});

test('list row pills follow OG list privacy and official-list semantics', () => {
  assert.deepEqual(listPills(normalizeList(list({ privacy: 'private' }))), ['Private']);
  assert.deepEqual(listPills(normalizeList(list({ privacy: 'link' }))), ['Link']);
  assert.deepEqual(listPills(normalizeList(list({ privacy: 'friends' }))), ['Following']);
  assert.deepEqual(listPills(normalizeList(list({ type: 'official', privacy: 'public' }))), ['Official List']);
  assert.deepEqual(listPills(normalizeList(list({ privacy: 'public' }))), []);
});

test('progress links are viewer-scoped and absent for official lists or signed-out viewers', () => {
  const entry = normalizeList(list());
  assert.equal(listProgressHref(entry, 'viewer'), '/users/viewer/progress?list=9001');
  assert.equal(listProgressHref(normalizeList(list({ type: 'official' })), 'viewer'), null);
  assert.equal(listProgressHref(entry, null), null);
});

test('vipBadge follows og: staff outrank VIP, which may carry an OG or EP tag', () => {
  assert.deepEqual(vipBadge({ director: true, vip: true }), { label: 'Director', tag: null });
  assert.deepEqual(vipBadge({ vip: true, vip_og: true, vip_ep: true }), { label: 'VIP', tag: 'OG' });
  assert.deepEqual(vipBadge({ vip: true, vip_ep: true }), { label: 'VIP', tag: 'EP' });
  assert.deepEqual(vipBadge({ vip: true }), { label: 'VIP', tag: null });
  assert.equal(vipBadge({ vip: false }), null);
  assert.equal(vipBadge(null), null);
});
