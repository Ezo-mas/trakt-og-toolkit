import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { SHOW_HTML, SEASON_HTML } from './fixtures.js';
const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));
function boot(t, { signed = true, long = false, defer = false, html = SEASON_HTML } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/shows/breaking-bad/seasons/1' });
  t.after(() => window.close());
  const { document } = window;
  const store = new Map([['trakt.clientId', 'client']]);
  if (signed) store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  const calls = [], pending = [];
  window.GM_getValue = (k, f) => store.get(k) ?? f;
  window.GM_setValue = (k, v) => store.set(k, v);
  window.GM_deleteValue = (k) => store.delete(k);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = (r) => {
    calls.push(r);
    const path = new URL(r.url).pathname;
    let body = [];
    if (path === '/sync/ratings/episodes') body = [1, 2, 4].map((number) => ({ rating: number === 1 ? 2 : 8, show: { ids: { trakt: 1388, slug: 'breaking-bad' } }, episode: { season: 1, number } }));
    else if (path.endsWith('/stats')) body = { watchers: 100, comments: 4 };
    else if (path.endsWith('/seasons/1')) body = Array.from({ length: long ? 31 : 4 }, (_, i) => ({ number: i + 1, title: `Episode ${i + 1}`, rating: 8, votes: 100 }));
    const respond = () => r.onload({ status: 200, responseHeaders: '', responseText: JSON.stringify(body) });
    if (defer && path === '/sync/ratings/episodes') pending.push(respond); else queueMicrotask(respond);
    return { abort() {} };
  };
  document.write(`<html><head></head><body>${html}</body></html>`);
  window.eval(bundle); document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document, calls, store, pending };
}
const chart = (b) => b.document.getElementById('ogt-season-chart');
test('bundle: personal chart gaps, average, on-demand counts, shared navigation cache and account cleanup', async (t) => {
  const b = boot(t); await wait();
  assert.match(chart(b).textContent, /Your average: 6.0 \(3 of 4 episodes rated\)/);
  assert.equal(chart(b).querySelectorAll('.ogt-season-chart__personal-dot').length, 3);
  assert.equal((chart(b).querySelector('.ogt-season-chart__personal').getAttribute('d').match(/M/g) || []).length, 2);
  assert.equal(b.calls.filter((r) => r.url.endsWith('/stats')).length, 0);
  assert.match(chart(b).querySelector('svg').textContent, /20%/);
  chart(b).querySelector('button').click(); await wait();
  assert.equal(b.calls.filter((r) => r.url.endsWith('/stats')).length, 4);
  assert.ok(chart(b).querySelector('.ogt-season-chart__watchers'));
  chart(b).querySelector('button').click();
  assert.equal(chart(b).querySelector('.ogt-season-chart__watchers'), null);
  b.window.history.pushState({}, '', '/shows/breaking-bad');
  b.document.body.innerHTML = SHOW_HTML; await wait(600);
  assert.match(b.document.getElementById('ogt-your-ratings').textContent, /Your average: 6.0/);
  assert.equal(b.document.querySelectorAll('article.poster-card .ogt-your-average').length, 1);
  assert.equal(b.calls.filter((r) => r.url.endsWith('/sync/ratings/episodes')).length, 1);
  b.window.history.pushState({}, '', '/shows/breaking-bad/seasons'); await wait(600);
  assert.match(b.document.getElementById('ogt-your-ratings').textContent, /3 episodes rated/);
  b.store.delete('trakt.oauth.tokens'); b.document.dispatchEvent(new b.window.Event('ogt:authchange')); await wait();
  assert.equal(b.document.querySelector('.ogt-your-average'), null);
});
test('bundle: signed out has community chart without private fetch or personal legend', async (t) => {
  const b = boot(t, { signed: false }); await wait();
  assert.equal(chart(b).querySelectorAll('.ogt-season-chart__personal-dot').length, 0);
  assert.equal(chart(b).querySelector('.ogt-season-chart__legend').hidden, true);
  assert.equal(b.calls.filter((r) => r.url.includes('/sync/ratings')).length, 0);
});
test('bundle: long seasons skip statistics and late private results cannot survive sign-out', async (t) => {
  const b = boot(t, { long: true, defer: true }); await wait();
  chart(b).querySelector('button').click(); await wait();
  assert.match(chart(b).textContent, /skipped for seasons over 30/);
  assert.equal(b.calls.filter((r) => r.url.endsWith('/stats')).length, 0);
  b.store.delete('trakt.oauth.tokens'); b.document.dispatchEvent(new b.window.Event('ogt:authchange'));
  b.pending.forEach((respond) => respond()); await wait();
  assert.equal(chart(b).querySelectorAll('.ogt-season-chart__personal-dot').length, 0);
});

test('bundle mounts on fresh live OG season and show markup', async (t) => {
  const { LIVE_RATINGS_SEASON_HTML, LIVE_RATINGS_SHOW_HTML } = await import('./fixtures.js');
  const b = boot(t, { html: LIVE_RATINGS_SEASON_HTML }); await wait(600);
  assert.ok(chart(b));
  assert.ok(chart(b).querySelector('.ogt-season-chart__personal-dot'));
  b.window.history.pushState({}, '', '/shows/breaking-bad');
  b.document.body.innerHTML = LIVE_RATINGS_SHOW_HTML; await wait(600);
  assert.match(b.document.getElementById('ogt-your-ratings').textContent, /Your average/);
  assert.ok(b.document.querySelector('article.poster-card .ogt-your-average'));
});
