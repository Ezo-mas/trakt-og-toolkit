import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { PERSON_CREDITS_HTML, personCreditRowHtml } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

function boot(t, { signedIn = true } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/people/bryan-cranston' });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(), calls = [];
  if (signedIn) {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  }
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = k => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    const path = new URL(r.url).pathname;
    const body = r.method === 'POST' ? { added: { [Object.keys(JSON.parse(r.data))[0]]: 1 } }
      : path.startsWith('/shows/') ? { ids: { trakt: 320413 }, title: 'After Hours with James Corden' }
        : { ids: { trakt: 1115926 }, title: 'Jackpot' };
    queueMicrotask(() => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' }));
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${PERSON_CREDITS_HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window, document, calls,
    buttons: () => [...document.querySelectorAll('.ogt-watchlist-credit')],
    writes: () => calls.filter(r => r.method === 'POST'),
    setTip: (id, html) => { document.getElementById(`${id}-tip`).innerHTML = html; },
  };
}

test('built bundle adds a watchlist shortcut beside the lists control on credit rows', async t => {
  const b = boot(t); await wait();
  const buttons = b.buttons();
  assert.equal(buttons.length, 2);
  for (const [button, label] of [[buttons[0], 'Jackpot'], [buttons[1], 'After Hours with James Corden']]) {
    assert.equal(button.previousElementSibling.classList.contains('list-control'), true, label);
    assert.equal(button.getAttribute('aria-label'), 'Add to watchlist');
    assert.ok(button.querySelector('svg'));
    assert.equal(button.hidden, false);
  }
  assert.equal(b.calls.length, 0, 'no API requests per row on mount');

  let bubbled = false;
  b.document.querySelector('article.credit-row').addEventListener('click', () => { bubbled = true; });
  buttons[0].click(); await wait();
  assert.equal(bubbled, false);
  assert.deepEqual(JSON.parse(b.writes()[0].data), { movies: [{ ids: { trakt: 1115926 } }] });
  assert.equal(buttons[0].hidden, true);
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, 'You added Jackpot to your watchlist.');

  buttons[1].click(); await wait();
  assert.deepEqual(JSON.parse(b.writes()[1].data), { shows: [{ ids: { trakt: 320413 } }] });
  assert.equal(buttons[1].hidden, true);
});

test('credit shortcuts follow native watchlist membership, custom lists and later rows', async t => {
  const b = boot(t); await wait();
  b.setTip('credit-movie', '<span class="listed-tip"><a href="/users/test/watchlist">Watchlist</a></span>'); await wait();
  assert.equal(b.buttons()[0].hidden, true, 'already on the watchlist');
  b.setTip('credit-movie', '<span class="listed-tip"><a href="/lists/123">Watchlist</a></span>'); await wait();
  assert.equal(b.buttons()[0].hidden, false, 'a custom list named Watchlist is not native membership');

  b.document.querySelector('section.year').insertAdjacentHTML('afterbegin',
    personCreditRowHtml({ id: 'credit-lazy', href: '/movies/verity-2026', title: 'Verity' }));
  await wait();
  assert.equal(b.buttons().length, 3, 'rows added later get a shortcut');
  assert.equal(b.buttons()[0].previousElementSibling.classList.contains('list-control'), true);

  b.document.getElementById('credit-lazy').remove(); await wait();
  assert.equal(b.buttons().length, 2, 'removed rows lose their shortcut');
});

test('signed-out clicks guide and leaving the person page removes the shortcuts', async t => {
  const b = boot(t, { signedIn: false }); await wait();
  b.buttons()[0].click(); await wait();
  assert.match(b.document.querySelector('.ogt-toast').textContent, /Sign in/);
  assert.equal(b.calls.length, 0);

  b.window.history.pushState({}, '', '/dashboard'); await wait(400);
  assert.equal(b.buttons().length, 0);
  assert.equal(b.document.getElementById('ogt-watchlist-credits'), null);
});
