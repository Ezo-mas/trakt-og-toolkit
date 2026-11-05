import test from 'node:test';
import assert from 'node:assert/strict';
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

function boot(t) {
  const window = new Window({ url: 'https://og.trakt.tv/users/test/lists' });
  t.after(() => window.close());
  const { document } = window;
  window.GM_getValue = (key, fallback) => fallback;
  window.GM_setValue = () => {};
  window.GM_deleteValue = () => {};
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  document.write(`<!doctype html><html><head></head><body>${HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
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

  const opened = [];
  window.open = (href, target) => { opened.push([href, target]); return null; };
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  slots[0].dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(opened, [['/shows/199343', '_self']]);

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
  assert.equal(document.querySelector('.ogt-list-preview-titles'), null);
  assert.equal(document.getElementById('ogt-list-preview'), null);
  document.querySelector('.slot')?.classList.add('kept');
  assert.equal(document.querySelector('.ogt-list-preview-slot'), null);
});
