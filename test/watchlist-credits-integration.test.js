import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { answerDialogs } from './dialogs.js';
import { PERSON_CREDITS_HTML, personCreditRowHtml } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

function boot(t, { signedIn = true } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/people/bryan-cranston' });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map(), calls = [];
  let allow = true, postResult = null;
  if (signedIn) {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  }
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = k => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  const dialogs = answerDialogs(window, { confirm: () => allow });
  const confirmations = dialogs.confirms;
  window.GM_xmlhttpRequest = r => {
    calls.push(r);
    const path = new URL(r.url).pathname;
    let body;
    if (r.method === 'POST') {
      const sent = JSON.parse(r.data);
      body = postResult ? postResult(sent, path) : { [path.endsWith('/remove') ? 'deleted' : 'added']: { movies: sent.movies?.length ?? 0, shows: sent.shows?.length ?? 0 } };
    } else if (path.startsWith('/shows/')) body = { ids: { trakt: 320413 }, title: 'After Hours with James Corden' };
    else body = { ids: { trakt: 1115926 }, title: 'Jackpot' };
    queueMicrotask(() => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' }));
    return { abort() {} };
  };
  document.write(`<!doctype html><html><head></head><body>${PERSON_CREDITS_HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window, document, calls, confirmations,
    buttons: () => [...document.querySelectorAll('.ogt-watchlist-credit')],
    writes: () => calls.filter(r => r.method === 'POST'),
    setTip: (id, html) => { document.getElementById(`${id}-tip`).innerHTML = html; },
    setPostResult: result => { postResult = result; },
    deny: () => { allow = false; },
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

  assert.equal(b.document.querySelector('.ogt-watchlist-bulk').textContent, 'Watchlist all (3)');
  b.document.getElementById('credit-lazy').remove(); await wait();
  assert.equal(b.buttons().length, 2, 'removed rows lose their shortcut');
  assert.equal(b.document.querySelector('.ogt-watchlist-bulk').textContent, 'Watchlist all (2)');
});

test('built bundle adds every visible credit from one Watchlist all action', async t => {
  const b = boot(t); await wait();
  const bulk = b.document.querySelector('.ogt-watchlist-bulk');
  assert.ok(bulk);
  assert.equal(bulk.closest('.controls'), b.document.querySelector('#credits .toolbar .controls'));
  assert.equal(bulk.textContent, 'Watchlist all (2)');
  assert.equal(b.calls.length, 0, 'no API requests per row on mount');

  bulk.click(); await wait();
  assert.match(b.confirmations[0], /Add 2 titles to your watchlist\?/);
  assert.equal(b.writes().length, 1);
  assert.deepEqual(JSON.parse(b.writes()[0].data), { movies: [{ ids: { slug: 'jackpot-1115926' } }],
    shows: [{ ids: { slug: 'after-hours-with-james-corden' } }] });
  assert.ok(b.buttons().every(button => button.hidden));
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, 'Watchlist: 2 added, 0 already there, 0 not found.');
  assert.equal(bulk.textContent, 'Watchlist all');
  assert.equal(bulk.disabled, true);
});

test('Watchlist all skips native and individually added titles', async t => {
  const b = boot(t); await wait();
  b.setTip('credit-movie', '<span class="listed-tip"><a href="/users/test/watchlist">Watchlist</a></span>'); await wait();
  const bulk = b.document.querySelector('.ogt-watchlist-bulk');
  assert.equal(bulk.textContent, 'Watchlist all (1)');
  b.buttons()[1].click(); await wait();
  assert.equal(b.buttons()[1].hidden, true);
  assert.equal(b.writes().length, 1, 'the individual add wrote once');
  assert.equal(bulk.textContent, 'Watchlist all');
  assert.equal(bulk.disabled, true);
});

test('Watchlist all reports existing and not-found counts and leaves failed rows available', async t => {
  const b = boot(t); await wait();
  b.setPostResult(sent => ({ added: { movies: sent.movies?.length ?? 0 }, existing: { shows: 0 },
    not_found: { shows: (sent.shows ?? []).map(item => ({ ids: { slug: item.ids.slug } })) } }));
  const bulk = b.document.querySelector('.ogt-watchlist-bulk');
  bulk.click(); await wait();
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__message').textContent, 'Watchlist: 1 added, 0 already there, 1 not found.');
  assert.equal(b.buttons()[0].hidden, true, 'the added movie loses its shortcut');
  assert.equal(b.buttons()[1].hidden, false, 'the not-found show keeps its shortcut');
  assert.equal(bulk.textContent, 'Watchlist all (1)');
  assert.equal(bulk.disabled, false);
});

test('cancelled Watchlist all sends nothing and leaving removes the bulk action', async t => {
  const b = boot(t); await wait();
  b.deny();
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  assert.equal(b.confirmations.length, 1);
  assert.equal(b.writes().length, 0);
  assert.ok(b.buttons().every(button => !button.hidden));

  b.window.history.pushState({}, '', '/dashboard'); await wait(400);
  assert.equal(b.document.querySelector('.ogt-watchlist-bulk'), null);
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


test('bulk Undo removes only confirmed new titles and restores shortcuts', async t => {
  const b = boot(t); await wait();
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  b.document.querySelector('.ogt-watchlist-toast__undo').click(); await wait();
  assert.equal(b.writes().length, 2);
  assert.equal(new URL(b.writes()[1].url).pathname, '/sync/watchlist/remove');
  assert.deepEqual(JSON.parse(b.writes()[1].data), JSON.parse(b.writes()[0].data));
  assert.ok(b.buttons().every(button => !button.hidden));
  assert.equal(b.document.querySelector('.ogt-watchlist-bulk').textContent, 'Watchlist all (2)');
});

test('mixed new and existing bulk additions never offer destructive Undo', async t => {
  const b = boot(t); await wait();
  b.setPostResult(() => ({ added: { movies: 1 }, existing: { shows: 1 } }));
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  assert.ok(b.buttons().every(button => button.hidden));
  assert.equal(b.document.querySelector('.ogt-watchlist-toast__undo'), null);
});

test('bulk confirm locks row actions and leaving before confirming sends nothing', async t => {
  const b = boot(t); await wait();
  b.document.querySelector('.ogt-watchlist-bulk').click();
  assert.ok(b.buttons().every(button => button.disabled));
  b.buttons()[0].click();
  b.window.history.pushState({}, '', '/dashboard');
  await wait(400);
  assert.equal(b.calls.length, 0);
});

test('bulk progress survives a later batch failure', async t => {
  const b = boot(t); await wait();
  b.document.querySelector('section.year').insertAdjacentHTML('beforeend',
    Array.from({ length: 100 }, (_, i) => personCreditRowHtml({ id: `extra-${i}`, href: `/movies/extra-${i}` })).join(''));
  await wait();
  let batches = 0;
  b.setPostResult(sent => ++batches === 1 ? { added: { movies: sent.movies?.length ?? 0, shows: sent.shows?.length ?? 0 } } : {});
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  assert.equal(b.writes().length, 2);
  assert.equal(b.buttons().filter(button => button.hidden).length, 100);
  assert.equal(b.document.querySelector('.ogt-watchlist-bulk').textContent, 'Watchlist all (2)');
  assert.match(b.document.querySelector('.ogt-toast').textContent, /100 added.*Remaining titles could not be confirmed/);
});


test('bulk skips hidden credit rows and follows toolbar replacements', async t => {
  const b = boot(t); await wait();
  b.document.getElementById('credit-movie').hidden = true;
  b.document.querySelector('#credits .toolbar .controls').outerHTML = '<div class="controls"></div>';
  await wait();
  const bulk = b.document.querySelector('.ogt-watchlist-bulk');
  assert.equal(bulk.textContent, 'Watchlist all (1)');
  bulk.click(); await wait();
  assert.deepEqual(JSON.parse(b.writes()[0].data), { shows: [{ ids: { slug: 'after-hours-with-james-corden' } }] });
});

test('bulk Undo leaves not-found titles untouched', async t => {
  const b = boot(t); await wait();
  b.setPostResult((sent, path) => path.endsWith('/remove') ? { deleted: { movies: 1 } } :
    { added: { movies: 1 }, not_found: { shows: sent.shows } });
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  b.document.querySelector('.ogt-watchlist-toast__undo').click(); await wait();
  assert.deepEqual(JSON.parse(b.writes()[1].data), { movies: [{ ids: { slug: 'jackpot-1115926' } }] });
  assert.ok(b.buttons().every(button => !button.hidden));
});


test('bulk Undo retries only remaining removal batches after a failure', async t => {
  const b = boot(t); await wait();
  b.document.querySelector('section.year').insertAdjacentHTML('beforeend',
    Array.from({ length: 100 }, (_, i) => personCreditRowHtml({ id: `undo-${i}`, href: `/movies/undo-${i}` })).join(''));
  await wait();
  let removals = 0;
  b.setPostResult((sent, path) => path.endsWith('/remove') && ++removals === 2 ? {} :
    { [path.endsWith('/remove') ? 'deleted' : 'added']: { movies: sent.movies?.length ?? 0, shows: sent.shows?.length ?? 0 } });
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait();
  const undo = b.document.querySelector('.ogt-watchlist-toast__undo');
  undo.click(); await wait();
  assert.equal(removals, 2);
  assert.equal(b.buttons().filter(button => button.hidden).length, 2);
  assert.equal(undo.disabled, false);
  undo.click(); await wait();
  assert.equal(removals, 3);
  assert.ok(b.buttons().every(button => !button.hidden));
  const last = JSON.parse(b.writes().at(-1).data);
  assert.equal(last.movies.length, 2, 'retry skips the 100 confirmed removals');
});


test('bulk add and Undo reload native credit controls without opening or clicking their pickers', async t => {
  const b = boot(t); await wait();
  b.document.body.insertAdjacentHTML('afterbegin', '<header class="top-nav"><div class="profile"></div></header>');
  b.document.querySelector('section.year').insertAdjacentHTML('beforeend',
    Array.from({ length: 5 }, (_, i) => personCreditRowHtml({ id: `native-${i}`, href: `/movies/native-${i}` })).join(''));
  await wait();
  let reads = 0, clicks = 0, popups = 0, loading = 0, peak = 0;
  for (const control of b.document.querySelectorAll('article.credit-row .list-control')) {
    const trigger = control.querySelector('button');
    trigger.addEventListener('click', () => clicks++);
    trigger.addEventListener('keydown', event => {
      assert.equal(event.key, 'ArrowDown');
      reads++;
      peak = Math.max(peak, ++loading);
      trigger.disabled = true;
      setTimeout(() => {
        const watchlisted = !b.writes().at(-1).url.endsWith('/remove');
        b.document.getElementById(trigger.getAttribute('aria-describedby')).innerHTML = watchlisted
          ? '<span class="listed-tip"><a href="/users/test/watchlist">Watchlist</a></span>' : 'Add to list';
        const picker = b.document.getElementById(trigger.getAttribute('aria-controls'));
        const before = new b.window.Event('beforetoggle', { cancelable: true });
        Object.defineProperty(before, 'newState', { value: 'open' });
        picker.dispatchEvent(before);
        if (!before.defaultPrevented) popups++;
        trigger.disabled = false;
        loading--;
      }, 5);
    });
  }
  b.document.querySelector('.ogt-watchlist-bulk').click(); await wait(160);
  assert.equal(reads, 7);
  assert.ok(peak <= 4, 'native loads are bounded');
  assert.equal(b.document.querySelectorAll('.listed-tip a').length, 7);
  b.document.querySelector('.ogt-watchlist-toast__undo').click(); await wait(160);
  assert.equal(reads, 14);
  assert.equal(b.document.querySelectorAll('.listed-tip a').length, 0);
  assert.ok(b.buttons().every(button => !button.hidden));
  assert.equal(clicks, 0, 'native quick-add clicks are never sent');
  assert.equal(popups, 0, 'native picker stays closed');
});
