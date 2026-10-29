import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { spawnSync } from 'node:child_process';

test('built bundle registers OAuth menus and shows user without exposing tokens', async (t) => {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  const menus = new Map();
  const data = new Map([
    ['trakt.clientId', 'client'],
    ['trakt.oauth.tokens', { client_id: 'client', access_token: 'SECRET_ACCESS', refresh_token: 'SECRET_REFRESH', expires_at: Date.now() + 3600000 }],
  ]);
  window.GM_getValue = (k, fallback) => data.get(k) ?? fallback;
  window.GM_setValue = (k, v) => data.set(k, v);
  window.GM_deleteValue = (k) => data.delete(k);
  window.GM_registerMenuCommand = (name, callback) => menus.set(name.replace('Trakt OG Toolkit: ', ''), callback);
  window.GM_xmlhttpRequest = (r) => {
    assert.ok(r.url.startsWith('https://api.trakt.tv/') || r.url.startsWith('https://auth.trakt.tv/'));
    assert.doesNotMatch(r.url, /SECRET_/);
    r.onload({ status: 200, responseText: r.url.endsWith('/users/me') ? '{"username":"tester"}' : '', responseHeaders: '' });
  };
  window.document.write('<html><head></head><body></body></html>');
  window.eval(readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  for (const name of ['sign in', 'cancel sign-in', 'sign out', 'show signed-in user']) assert.equal(typeof menus.get(name), 'function');
  await menus.get('show signed-in user')();
  assert.match(window.document.body.textContent, /Signed in to Trakt as tester/);
  assert.doesNotMatch(window.document.body.textContent, /SECRET_/);
  await menus.get('sign out')();
  assert.equal(data.has('trakt.oauth.tokens'), false);
  assert.equal(window.localStorage.getItem('ogt:trakt.oauth.tokens'), null);
  assert.equal(window.document.querySelector('[id*=playback]'), null);
});

test('private credentials never fall back to page localStorage', () => {
  const script = `
    import assert from 'node:assert/strict';
    globalThis.localStorage = { getItem() { throw Error('must not read page storage'); }, setItem() { throw Error('must not write page storage'); } };
    const store = await import('./src/core/store.js');
    assert.equal(store.getPrivateValue(store.STORAGE.tokens), null);
    assert.throws(() => store.setPrivateValue(store.STORAGE.tokens, 'secret'), /GM storage/);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
