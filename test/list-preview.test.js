import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readPosterRoute, readListPoster } from '../src/features/list-preview/data.js';

test('reads show and movie ids from Trakt poster paths', () => {
  assert.deepEqual(readPosterRoute('https://media.trakt.tv/images/shows/000/199/343/posters/thumb/028ff64613.jpg.webp'),
    { kind: 'show', id: 199343, href: '/shows/199343' });
  assert.deepEqual(readPosterRoute('//media.trakt.tv/images/movies/000/729/942/posters/thumb/c975306be6.jpg.webp'),
    { kind: 'movie', id: 729942, href: '/movies/729942' });
  assert.equal(readPosterRoute('https://media.trakt.tv/images/movies/000/000/007/posters/full/x.jpg').href, '/movies/7');
});

test('rejects non-title images and malformed ids', () => {
  for (const src of [null, 42, '', 'https://example.com/images/shows/000/199/343/posters/x.jpg',
    'https://media.trakt.tv/images/episodes/000/199/343/posters/x.jpg',
    'https://media.trakt.tv/images/shows/000/199/posters/x.jpg',
    'https://media.trakt.tv/images/shows/000/000/000/posters/x.jpg']) {
    assert.equal(readPosterRoute(src), null, String(src));
  }
});

test('a preview slot takes its title from its own tooltip', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = `
    <article class="list-row"><div class="fan-frame"><a class="fan" href="/users/me/watchlist" aria-hidden="true">
      <span class="slot" aria-describedby="tip-1"><img class="poster"
        src="https://media.trakt.tv/images/shows/000/199/343/posters/thumb/x.jpg"></span>
      <span id="tip-1" class="tooltip"><span class="text"> Three Pines </span></span>
    </a></div></article>`;
  const slot = window.document.querySelector('.slot');
  assert.deepEqual(readListPoster(slot), { kind: 'show', id: 199343, href: '/shows/199343', title: 'Three Pines' });
  slot.removeAttribute('aria-describedby');
  assert.equal(readListPoster(slot).title, 'this title');
});
