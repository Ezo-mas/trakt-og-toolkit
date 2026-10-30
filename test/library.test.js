import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createLibraryApi } from '../src/features/library/api.js';
import { parseRoute } from '../src/core/router.js';
import { readFileSync } from 'node:fs';
import { MOVIE_HTML } from './fixtures.js';
import { library } from '../src/features/library/index.js';

const now = () => Date.parse('2026-10-30T12:00:00Z');
const episode = (id, first_aired) => ({ ids: { trakt: id }, first_aired });
test('movie addition resolves numeric IDs and uses authenticated collection endpoint with current date', async () => {
  const calls = [];
  const api = createLibraryApi({ now, signedIn: () => true,
    get: async path => { assert.equal(path, '/movies/the-dark-2005'); return { ids: { trakt: 12 } }; },
    auth: async (...args) => { calls.push(args); return { added: { movies: 1 } }; } });
  await api.add(parseRoute('/movies/the-dark-2005'));
  assert.deepEqual(calls, [['POST', '/sync/collection', { movies: [{ ids: { trakt: 12 }, collected_at: '2026-10-30T12:00:00.000Z' }] }]]);
});
test('whole show adds only aired episodes, skips specials and confirms actual count', async () => {
  const reads = [], writes = [];
  const api = createLibraryApi({ now, signedIn: () => true, get: async (path, options) => {
    reads.push([path, options]);
    return [{ number: 0, episodes: [episode(9, '2020-01-01')] }, { number: 1,
      episodes: [episode(1, '2020-01-01'), episode(2, '2027-01-01'), episode(3, null), episode(1, '2020-01-01')] }];
  }, auth: async (...args) => { writes.push(args); return { added: { episodes: 1 } }; } });
  await api.add(parseRoute('/shows/test'), { confirm: text => { assert.match(text, /Add 1 aired episode to/); return true; } });
  assert.deepEqual(reads, [['/shows/test/seasons?extended=full,episodes', { ttl: 0 }]]);
  assert.equal(writes[0][2].episodes.length, 1);
  assert.equal(writes[0][2].episodes[0].ids.trakt, 1);
});
test('season zero and individual episode use their exact routes', async () => {
  for (const path of ['/shows/test/seasons/0', '/shows/test/seasons/1/episodes/2']) {
    const reads = [];
    const api = createLibraryApi({ now, signedIn: () => true, get: async url => {
      reads.push(url);
      const row = episode(8, '2020-01-01');
      return path.endsWith('/2') ? row : [row];
    }, auth: async () => ({ added: { episodes: 1 } }) });
    await api.add(parseRoute(path));
    assert.equal(reads[0], `${path}?extended=full`);
  }
});
test('signed out, cancelled, or navigated away additions never write', async () => {
  let writes = 0;
  const options = { now, get: async () => [episode(1, '2020-01-01')], auth: async () => { writes++; } };
  await assert.rejects(createLibraryApi({ ...options, signedIn: () => false }).add(parseRoute('/movies/test')), /Sign in/);
  const api = createLibraryApi({ ...options, signedIn: () => true });
  await api.add(parseRoute('/shows/test/seasons/1'), { confirm: () => false });
  await api.add(parseRoute('/shows/test/seasons/1'), { active: () => false });
  assert.equal(writes, 0);
});
test('empty or partially unsuccessful API results are not presented as success', async () => {
  for (const result of [{}, { added: { movies: 0 } }, { added: { movies: 1 }, not_found: { movies: [{}] } }]) {
    const api = createLibraryApi({ now, signedIn: () => true,
      get: async () => ({ ids: { trakt: 1 } }), auth: async () => result });
    await assert.rejects(api.add(parseRoute('/movies/test')));
  }
});

test('built script mounts button, guides sign-in, saves once, and removes it after navigation', async t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/the-dark-2005' });
  t.after(() => window.close());
  const store = new Map(), writes = [];
  window.GM_getValue = (key, fallback) => store.get(key) ?? fallback;
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = key => store.delete(key);
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = r => {
    if (r.method === 'POST') writes.push(r);
    const body = r.method === 'POST' ? { added: { movies: 1 } } :
      new URL(r.url).pathname.startsWith('/sync/playback') ? [] : { ids: { trakt: 12 } };
    queueMicrotask(() => r.onload({ status: 200, responseText: JSON.stringify(body), responseHeaders: '' }));
    return { abort() {} };
  };
  const wait = () => new Promise(resolve => setTimeout(resolve, 250));
  window.document.write(`<!doctype html><html><head></head><body>${MOVIE_HTML}</body></html>`);
  window.eval(readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await wait();
  const button = window.document.querySelector('#ogt-library button');
  assert.ok(button);
  button.click();
  assert.match(window.document.querySelector('#ogt-library').textContent, /Sign in/);
  assert.equal(writes.length, 0);
  store.set('trakt.clientId', 'client');
  store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  window.document.dispatchEvent(new window.Event('ogt:authchange'));
  button.click(); button.click();
  await wait();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, 'https://api.trakt.tv/sync/collection');
  assert.equal(window.document.getElementById('ogt-library').hidden, true);
  assert.match(window.document.querySelector('.ogt-toast').textContent, /Added to your toolkit/);
  // OG eventually learns about the addition, then the user removes it natively.
  const nativeCollection = window.document.createElement('div');
  nativeCollection.className = 'summary-action selected';
  nativeCollection.innerHTML = '<span class="title">In library</span>';
  window.document.querySelector('.actions').append(nativeCollection);
  await wait();
  assert.equal(window.document.getElementById('ogt-library').hidden, true);
  nativeCollection.remove();
  await wait();
  assert.equal(window.document.getElementById('ogt-library').hidden, false);
  assert.equal(writes.length, 1, 'removing via OG does not trigger a toolkit write');
  window.history.pushState({}, '', '/');
  await wait();
  assert.equal(window.document.getElementById('ogt-library'), null);
});

test('library action has independent classes and follows native collection changes without leaving a gap', async t => {
  const window = new Window();
  const saved = {};
  for (const key of ['document', 'Node', 'MutationObserver']) { saved[key] = globalThis[key]; globalThis[key] = window[key]; }
  t.after(() => { for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  } window.close(); });
  window.document.write(MOVIE_HTML);
  const actions = window.document.querySelector('.actions');
  actions.innerHTML = `<div class="action-buttons"><div class="stacked"><div class="summary-action native-live">
    <button class="main native-live"><span class="icon native-live"></span><span class="text native-live"><span class="title native-live">Add to history</span></span></button>
  </div></div><div class="stacked" id="collection"><div class="summary-action selected native-live"><button class="main native-live"><span class="title native-live">In library</span></button></div></div></div>`;
  const handle = library.mount(parseRoute('/movies/test'));
  assert.equal(handle.node.hidden, true);
  assert.equal(handle.node.classList.contains('native-live'), false);
  assert.equal(handle.node.querySelector('button').classList.contains('native-live'), false);
  assert.ok(handle.node.querySelector('svg'));
  assert.equal(handle.node.previousElementSibling.className, 'stacked');
  window.document.querySelector('#collection').remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(handle.node.hidden, false);
  const native = window.document.createElement('div');
  native.className = 'summary-action';
  native.innerHTML = '<span class="title">95% in library</span>';
  actions.querySelector('.action-buttons').append(native);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(handle.node.hidden, true);
  handle.destroy();
  assert.equal(window.document.getElementById('ogt-library'), null);
});
