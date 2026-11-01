import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { createNativeWatchlistRefresh } from '../src/features/watchlist/native-refresh.js';
import { WATCHLIST_HTML, watchlistCardHtml } from './fixtures.js';

function setup(t) {
  const window = new Window({ url: 'https://og.trakt.tv/movies/test' });
  window.document.write('<header class="top-nav"><div class="profile"></div></header>' + WATCHLIST_HTML);
  const refresh = createNativeWatchlistRefresh();
  t.after(() => { refresh.destroy(); window.close(); });
  const control = window.document.querySelector('.list-control');
  const trigger = control.querySelector('button');
  const picker = window.document.getElementById(trigger.getAttribute('aria-controls'));
  const route = { kind: 'movie', name: 'title' };
  const open = () => {
    const event = new window.Event('beforetoggle', { cancelable: true });
    Object.defineProperty(event, 'newState', { value: 'open' });
    picker.dispatchEvent(event);
    return event;
  };
  return { window, refresh, control, trigger, picker, route, open };
}

test('native refresh forces read-only ArrowDown and cancels the picker before it appears', async t => {
  const b = setup(t); let reads = 0, clicks = 0;
  b.trigger.addEventListener('click', () => { clicks++; });
  b.trigger.addEventListener('keydown', event => {
    assert.equal(event.key, 'ArrowDown'); reads++;
    assert.equal(b.open().defaultPrevented, true);
  });
  assert.equal(await b.refresh.refresh(b.control, b.route), true);
  assert.equal(reads, 1);
  assert.equal(clicks, 0, 'the quick-add click path is never used');
  assert.equal(b.open().defaultPrevented, false, 'normal picker use resumes after refreshing');
});

test('native refresh skips signed-out, busy, open, missing and unsupported controls', async t => {
  const b = setup(t); let reads = 0;
  b.trigger.addEventListener('keydown', () => { reads++; });
  for (const route of [{ kind: 'show', name: 'season' }, { kind: 'show', name: 'episode' }]) {
    assert.equal(await b.refresh.refresh(b.control, route), false);
  }
  for (const [name, value] of [['aria-busy', 'true'], ['aria-expanded', 'true']]) {
    b.trigger.setAttribute(name, value);
    assert.equal(await b.refresh.refresh(b.control, b.route), false);
    b.trigger.removeAttribute(name);
  }
  b.window.document.querySelector('.profile').remove();
  assert.equal(await b.refresh.refresh(b.control, b.route), false);
  assert.equal(await b.refresh.refresh(null, b.route), false);
  assert.equal(reads, 0);
});

test('failed native loading and destroyed refreshes settle without changing saved state', async t => {
  const b = setup(t);
  b.trigger.addEventListener('keydown', () => { b.trigger.disabled = true; });
  const result = b.refresh.refresh(b.control, b.route);
  await new Promise(resolve => setTimeout(resolve, 0));
  b.trigger.disabled = false;
  assert.equal(await result, false);
  const next = b.refresh.refresh(b.control, b.route);
  b.refresh.destroy();
  assert.equal(await next, false);
  assert.equal(b.open().defaultPrevented, false, 'teardown restores native behavior');
});

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = () => new Promise(resolve => setTimeout(resolve, 100));
// Source-derived MediaList model: ArrowDown -> open(true) -> loadPickerLists -> syncPickerOverlay -> togglePopover.
// This models OG's event contract, not a live signed-in Svelte session.
test('built bundle refreshes native title/card membership after one toolkit POST without a reload or native write', async t => {
  for (const variant of ['title', 'card', 'different-account', 'native-failure', 'failed-post']) await t.test(variant, async t => {
    const window = new Window({ url: 'https://og.trakt.tv/movies/test' });
    t.after(() => window.close());
    const { document } = window;
    const store = new Map([
      ['trakt.clientId', 'client'], ['trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 }],
    ]);
    let posts = 0, reads = 0, nativeClicks = 0, popups = 0;
    window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
    window.GM_setValue = (key, value) => store.set(key, value);
    window.GM_deleteValue = key => store.delete(key);
    window.GM_registerMenuCommand = () => {};
    window.GM_xmlhttpRequest = r => {
      if (r.method === 'POST') posts++;
      const data = r.method === 'POST' ? variant === 'failed-post' ? {} : { added: { movies: 1 } }
        : new URL(r.url).pathname === '/movies/test' ? { ids: { trakt: 12 } } : [];
      queueMicrotask(() => r.onload({ status: 200, responseText: JSON.stringify(data), responseHeaders: '' }));
      return { abort() {} };
    };
    document.write('<header class="top-nav"><div class="profile"></div></header>' + WATCHLIST_HTML + watchlistCardHtml({ href: '/movies/test' }));
    const nativeControls = [...document.querySelectorAll('.list-control')];
    for (const control of nativeControls) {
      const trigger = control.querySelector('button');
      trigger.addEventListener('click', () => { nativeClicks++; });
      trigger.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown') return;
        reads++;
        trigger.disabled = true;
        queueMicrotask(() => {
          if (variant === 'native-failure') { trigger.disabled = false; return; }
          const watchlisted = variant !== 'different-account';
          for (const c of nativeControls) {
            if (c.classList.contains('summary')) {
              c.querySelector('.text').innerHTML = watchlisted
                ? '<span class="title">Listed On</span><span class="detail">Watchlist + 1 list</span>'
                : '<span class="title">Add to list</span>';
            } else c.querySelector('.tooltip').innerHTML = watchlisted
              ? '<span class="listed-tip"><a href="/users/og-account/watchlist">Watchlist</a></span>' : 'Add to list';
          }
          const picker = document.getElementById(trigger.getAttribute('aria-controls'));
          picker.innerHTML = `<button class="row" aria-pressed="${watchlisted}">Watchlist</button>`;
          const before = new window.Event('beforetoggle', { cancelable: true });
          Object.defineProperty(before, 'newState', { value: 'open' });
          picker.dispatchEvent(before);
          if (!before.defaultPrevented) popups++;
          trigger.disabled = false;
        });
      });
    }
    window.eval(bundle);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await wait();
    const button = variant === 'card' ? document.querySelector('.ogt-watchlist-card') : document.querySelector('#ogt-watchlist button');
    button.click(); await wait();
    assert.equal(posts, 1);
    assert.equal(nativeClicks, 0, 'never use a native quick-add/toggle click');
    assert.equal(popups, 0, 'no native picker flashes open');
    assert.equal(window.location.pathname, '/movies/test');
    if (variant === 'failed-post') {
      assert.equal(reads, 0);
      assert.equal(document.getElementById('ogt-watchlist').hidden, false);
    } else {
      assert.equal(reads, 1);
      const nativeAdded = !['different-account', 'native-failure'].includes(variant);
      assert.equal(document.querySelector('.picker .row[aria-pressed="true"]') !== null, nativeAdded);
      assert.equal(document.querySelector('.list-control.summary .title').textContent, nativeAdded ? 'Listed On' : 'Add to list');
      assert.equal(document.querySelector('.ogt-watchlist-card').hidden, nativeAdded);
      if (variant === 'native-failure') {
        assert.equal(document.getElementById('ogt-watchlist').hidden, true, 'native failure never rolls back the saved addition');
        assert.equal(document.querySelector('.ogt-toast').textContent, 'Added to your watchlist.');
      } else assert.doesNotMatch(document.querySelector('.ogt-toast').textContent, /Reload/);
    }
  });
});
