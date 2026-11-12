import test from 'node:test';
import assert from 'node:assert/strict';
import { setOgSession, changeOgSession } from './session.js';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const row = (id, title, src) => `<span class="slot" aria-describedby="${id}">
  <img class="poster" src="${src}"></span>
  <span id="${id}" class="tooltip"><span class="text">${title}</span></span>`;
const HTML = `<main><article class="list-row"><div class="fan-frame">
  <a class="fan" href="/users/test/watchlist" tabindex="-1" aria-hidden="true">
    ${row('tip-1', 'Three Pines', 'https://media.trakt.tv/images/shows/000/199/343/posters/thumb/a.jpg.webp')}
    ${row('tip-2', 'Spider-Man: Beyond the Spider-Verse', 'https://media.trakt.tv/images/movies/000/729/942/posters/thumb/b.jpg.webp')}
  </a></div></article></main>`;

function boot(t, { signedIn = false, ratings = { movies: [], shows: [] } } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/users/test/lists' });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map();
  if (signedIn) setOgSession(window.localStorage);
  const calls = [];
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = (r) => {
    const path = new URL(r.url).pathname;
    calls.push(path);
    const body = path === '/sync/ratings/movies' ? ratings.movies : path === '/sync/ratings/shows' ? ratings.shows : [];
    queueMicrotask(() => r.onload({ status: 200, responseHeaders: '', responseText: JSON.stringify(body) }));
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, store, calls };
}

test('each preview poster opens its title and screen readers get the same links', async (t) => {
  const { window, document } = boot(t);
  await wait();
  const slots = [...document.querySelectorAll('.slot')];
  assert.ok(slots.every((slot) => slot.classList.contains('ogt-list-preview-slot')));
  assert.equal(document.querySelector('.fan').getAttribute('href'), '/users/test/watchlist');
  const links = [...document.querySelectorAll('.ogt-list-preview-titles a')];
  assert.deepEqual(links.map((link) => link.getAttribute('href')), ['/shows/199343', '/movies/729942']);
  assert.deepEqual(links.map((link) => link.textContent), ['Three Pines', 'Spider-Man: Beyond the Spider-Verse']);

  const opened = []; const followed = [];
  window.open = (href, target) => { opened.push([href, target]); return null; };
  links[0].addEventListener('click', (event) => { followed.push(links[0].getAttribute('href')); event.preventDefault(); });
  const listClicks = [];
  document.querySelector('.fan').addEventListener('click', () => listClicks.push('fan'));
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  slots[0].dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(followed, ['/shows/199343'], 'a plain click follows the real title link (og routes it)');
  assert.deepEqual(listClicks, [], 'the fan never sees the click');
  assert.deepEqual(opened, []);

  slots[1].dispatchEvent(new window.MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
  slots[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));
  assert.deepEqual(opened, [['/movies/729942', '_blank'], ['/shows/199343', '_blank']]);

  slots[0].querySelector('img').setAttribute('src', 'https://media.trakt.tv/images/movies/000/000/007/posters/x.jpg');
  await wait();
  assert.equal(document.querySelector('.ogt-list-preview-titles a').getAttribute('href'), '/movies/7');
});

test('rows added later get previews and removed rows clean up', async (t) => {
  const { window, document } = boot(t);
  await wait();
  const article = document.querySelector('.list-row');
  article.insertAdjacentHTML('beforeend', `<div class="fan-frame"><a class="fan" href="/users/test/lists/2">
    ${row('tip-3', 'Breaking Bad', 'https://media.trakt.tv/images/shows/000/001/388/posters/thumb/c.jpg.webp')}
  </a></div>`);
  await wait();
  assert.equal(document.querySelectorAll('.ogt-list-preview-titles').length, 2);
  assert.equal(document.querySelectorAll('.ogt-list-preview-titles a').length, 3);

  article.querySelectorAll('.fan-frame')[1].remove();
  await wait();
  assert.equal(document.querySelectorAll('.ogt-list-preview-titles').length, 1);
});

test('leaving the page removes previews and their listener', async (t) => {
  const { window, document } = boot(t);
  await wait();
  window.history.pushState({}, '', '/dashboard');
  await wait(300);
  assert.equal(Boolean(document.querySelector('.ogt-list-preview-titles')), false);
  assert.equal(Boolean(document.getElementById('ogt-list-preview')), false);
  assert.equal(Boolean(document.querySelector('.ogt-list-preview-slot')), false);
});

test('signed in, your movie and show ratings sit in the poster corners and follow changes', async (t) => {
  const { window, document, calls } = boot(t, { signedIn: true, ratings: {
    shows: [{ rating: 8, show: { ids: { trakt: 199343 } } }],
    movies: [{ rating: 3, movie: { ids: { trakt: 7 } } }, { rating: 11, movie: { ids: { trakt: 729942 } } }],
  } });
  await wait();
  assert.deepEqual(calls.sort(), ['/sync/ratings/movies', '/sync/ratings/shows']);
  const slots = [...document.querySelectorAll('.slot')];
  assert.equal(slots[0].querySelector('.ogt-corner-rating').getAttribute('aria-label'), 'Your rating: 8 of 10');
  assert.equal(slots[0].querySelector('.ogt-corner-rating-text').textContent, '8');
  assert.equal(Boolean(slots[1].querySelector('.ogt-corner-rating')), false, 'out-of-range ratings are ignored');
  assert.equal(slots[0].getAttribute('style'), null, 'og\'s slot keeps its own styles');

  slots[0].querySelector('img').setAttribute('src', 'https://media.trakt.tv/images/movies/000/000/007/posters/x.jpg');
  await wait();
  assert.equal(slots[0].querySelectorAll('.ogt-corner-rating').length, 1);
  assert.equal(slots[0].querySelector('.ogt-corner-rating-text').textContent, '3', 'a new poster gets its own rating');

  changeOgSession(window);
  await wait();
  assert.equal(Boolean(document.querySelector('.ogt-corner-rating')), false, 'signing out removes the corners');
});

test('signed out, no ratings are requested', async (t) => {
  const { document, calls } = boot(t);
  await wait();
  assert.deepEqual(calls, []);
  assert.equal(Boolean(document.querySelector('.ogt-corner-rating')), false);
});
