import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { lastMonth, shiftMonth } from '../src/features/month-review/data.js';
const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = () => new Promise((resolve) => setTimeout(resolve, 80));
function boot(t, { signedIn = true, zero = false, failed = false, dismissed = false, earliest = null, firstPages = 1 } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/dashboard' });
  t.after(() => window.close());
  const span = lastMonth(); const store = new Map(); const calls = [];
  const first = earliest || span;
  if (signedIn) {
    store.set('trakt.clientId', 'client');
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  }
  if (dismissed) store.set('review.dismissed.tester', span.key);
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = (request) => {
    calls.push(request);
    const url = new URL(request.url);
    let data = [];
    let pages = 1;
    if (url.pathname === '/users/me') data = { username: 'tester', ids: { slug: 'tester' } };
    if (url.pathname === '/sync/history' && !zero && !url.searchParams.has('start_at')) {
      pages = firstPages;
      if (Number(url.searchParams.get('page')) === firstPages) data = [{ watched_at: first.start,
        movie: { title: 'First movie', runtime: 120, images: { fanart: ['media.trakt.tv/fanart.jpg'] } } }];
    } else if (url.pathname === '/sync/history' && !zero) {
      data = [{ watched_at: url.searchParams.get('start_at'),
        movie: { title: 'First movie', runtime: 120, images: { fanart: ['media.trakt.tv/fanart.jpg'] } } }];
    }
    if (url.pathname === '/sync/ratings') data = [{ rated_at: span.start }];
    if (url.pathname === '/users/me/comments') data = [{ comment: { created_at: span.start } }];
    queueMicrotask(() => request.onload({ status: failed ? 403 : 200, responseText: JSON.stringify(data), responseHeaders: `X-Pagination-Page-Count: ${pages}` }));
    return { abort() {} };
  };
  // Dashboard is session-only: semantic fixture transcribed from RecapRibbon.svelte.
  window.document.write('<html><head></head><body><nav class="ribbon"><a href="https://app.trakt.tv/users/tester/mir/2026/9">September</a></nav><main>Up Next</main></body></html>');
  window.eval(bundle); window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, doc: window.document, calls, store };
}
test('built bundle renders under ribbon, links review, remembers hide and signs out cleanly', async (t) => {
  const b = boot(t); await wait();
  const node = b.doc.querySelector('#ogt-month-review');
  assert.equal(node.previousElementSibling.tagName, 'NAV'); assert.equal(node.hidden, false);
  assert.equal(node.querySelectorAll('.ogt-review__tile').length, 4);
  assert.equal(node.querySelector('.ogt-review__hide').parentElement.className, 'ogt-review__top',
    'Hide stays in the heading row at the top right');
  assert.equal(node.querySelectorAll('.ogt-review__arrow').length, 2);
  assert.match(node.textContent, /First movie/); assert.match(node.querySelector('a').href, /users\/tester\/mir\/\d{4}\/\d+/);
  assert.equal(node.querySelector('img').src, 'https://media.trakt.tv/fanart.jpg');
  const ratings = b.calls.filter((r) => new URL(r.url).pathname === '/sync/ratings');
  assert.equal(ratings.length, 1); assert.equal(new URL(ratings[0].url).search, '', 'ratings load in one unpaginated request');
  node.querySelector('img').dispatchEvent(new b.window.Event('error'));
  assert.equal(node.querySelector('img'), null, 'a failed fanart leaves no broken image');
  node.querySelector('.ogt-review__hide').click(); assert.equal(node.hidden, true);
  assert.equal(b.store.get('review.dismissed.tester'), lastMonth().key);
  b.store.delete('trakt.oauth.tokens'); b.doc.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.equal(b.doc.querySelector('#ogt-month-review'), null);
});
test('signed out, dismissed, zero plays and failures are quiet', async (t) => {
  for (const options of [{ signedIn: false }, { dismissed: true }, { zero: true }, { failed: true }]) {
    const b = boot(t, options); await wait();
    const node = b.doc.querySelector('#ogt-month-review');
    if (options.failed) assert.match(node.textContent, /Could not load/);
    else assert.ok(!node || node.hidden);
    if (options.signedIn === false) assert.equal(b.calls.length, 0);
    if (options.dismissed) assert.equal(b.calls.length, 1);
  }
});
test('returning to the dashboard reuses the account/month cache', async (t) => {
  const b = boot(t); await wait();
  assert.equal(b.calls.filter((r) => new URL(r.url).pathname === '/sync/history').length, 1);
  b.window.history.pushState({}, '', '/search');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(b.doc.querySelector('#ogt-month-review'), null);
  b.window.history.pushState({}, '', '/dashboard');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(b.doc.querySelector('#ogt-month-review').hidden, false);
  assert.equal(b.calls.filter((r) => new URL(r.url).pathname === '/sync/history').length, 1);
});
test('arrows browse earlier months, reuse cached months, and stop at the first history month', async (t) => {
  const previous = shiftMonth(lastMonth(), -1);
  const earliest = shiftMonth(lastMonth(), -2);
  const b = boot(t, { earliest, firstPages: 2 }); await wait();
  const node = b.doc.querySelector('#ogt-month-review');
  const arrow = (label) => node.querySelector(`[aria-label="${label} month"]`);
  const title = () => node.querySelector('h2').textContent;
  const monthsRequested = () => b.calls.filter((r) => {
    const url = new URL(r.url);
    return url.pathname === '/sync/history' && url.searchParams.has('start_at');
  }).map((r) => new URL(r.url).searchParams.get('start_at'));
  assert.equal(arrow('Next').disabled, true, 'no next past last month');
  assert.equal(arrow('Previous').disabled, false);
  arrow('Previous').click(); await wait(); await wait();
  assert.match(title(), new RegExp(previous.label, 'i'));
  assert.equal(b.calls.filter((r) => new URL(r.url).pathname === '/users/me').length, 1, 'the account is reused');
  arrow('Previous').click(); await wait(); await wait();
  assert.match(title(), new RegExp(earliest.label, 'i'));
  assert.equal(arrow('Previous').disabled, true, 'no previous before the first history month');
  assert.equal(arrow('Next').disabled, false);
  assert.deepEqual(monthsRequested(), [lastMonth().start, previous.start, earliest.start]);
  arrow('Next').click(); await wait(); await wait();
  assert.match(title(), new RegExp(previous.label, 'i'));
  assert.equal(monthsRequested().length, 3, 'returning to a visited month uses its cache');
  arrow('Next').click(); await wait(); await wait();
  assert.match(title(), new RegExp(lastMonth().label, 'i'));
  assert.equal(arrow('Next').disabled, true);
});
test('Hide on an earlier month still dismisses the card until next month', async (t) => {
  const b = boot(t, { earliest: shiftMonth(lastMonth(), -3), firstPages: 2 }); await wait();
  const node = b.doc.querySelector('#ogt-month-review');
  node.querySelector('[aria-label="Previous month"]').click(); await wait(); await wait();
  assert.match(node.querySelector('h2').textContent, new RegExp(shiftMonth(lastMonth(), -1).label, 'i'));
  node.querySelector('.ogt-review__hide').click();
  assert.equal(node.hidden, true);
  assert.equal(b.store.get('review.dismissed.tester'), lastMonth().key, 'the dismissal is for the card, not the month on screen');
});
