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

test('sign-in accepts registered redirect values and pre-fills the README default', async (t) => {
  for (const value of [undefined, 'http://localhost:5173/callback', ' custom-app:callback ', '   ', null]) {
    await t.test(`redirect input ${String(value)}`, async (t) => {
      const window = new Window({ url: 'https://og.trakt.tv/' });
      t.after(() => window.close());
      const data = new Map([['trakt.clientId', 'client']]);
      const menus = new Map();
      const requests = [];
      window.GM_getValue = (k, fallback) => data.get(k) ?? fallback;
      window.GM_setValue = (k, v) => data.set(k, v);
      window.GM_deleteValue = (k) => data.delete(k);
      window.GM_registerMenuCommand = (name, callback) => menus.set(name, callback);
      window.prompt = (message, initial) => {
        assert.match(message, /redirect URI/);
        assert.equal(initial, 'http://localhost:5173/callback');
        return value === undefined ? initial : value;
      };
      window.GM_xmlhttpRequest = (r) => {
        requests.push(r);
        r.onload({ status: 404, responseText: '{}', responseHeaders: '' });
      };
      window.document.write('<html><head></head><body></body></html>');
      window.eval(readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8'));
      window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
      await menus.get('Trakt OG Toolkit: sign in')();
      const accepted = value !== null && (value === undefined || value.trim().length > 0);
      assert.equal(requests.length, accepted ? 1 : 0);
      assert.equal(data.get('trakt.oauth.redirectUri'), accepted ? (value ?? 'http://localhost:5173/callback').trim() : undefined);
    });
  }
});

test('sign-in shows the device code in a toast and keeps it there while pending', async (t) => {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  const data = new Map([['trakt.clientId', 'client'], ['trakt.oauth.redirectUri', 'http://localhost:5173/callback']]);
  const menus = new Map();
  const shownWhilePending = [];
  let polls = 0;
  window.GM_getValue = (k, fallback) => data.get(k) ?? fallback;
  window.GM_setValue = (k, v) => data.set(k, v);
  window.GM_deleteValue = (k) => data.delete(k);
  window.GM_registerMenuCommand = (name, callback) => menus.set(name.replace('Trakt OG Toolkit: ', ''), callback);
  window.prompt = (message, initial) => {
    assert.match(message, /redirect URI/, 'only the redirect URI may use a native prompt');
    return initial;
  };
  window.GM_xmlhttpRequest = (r) => {
    if (r.url.endsWith('/device/code')) {
      r.onload({ status: 200, responseHeaders: '', responseText: JSON.stringify({
        device_code: 'dev', user_code: 'ABCD1234', verification_url: 'https://auth.trakt.tv/activate', interval: 0.05, expires_in: 30 }) });
      return;
    }
    polls += 1;
    if (polls > 1) shownWhilePending.push(window.document.body.textContent);
    r.onload(polls < 3
      ? { status: 400, responseHeaders: '', responseText: '' }
      : { status: 200, responseHeaders: '', responseText: JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }) });
  };
  window.document.write('<html><head></head><body></body></html>');
  window.eval(readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await menus.get('sign in')();
  assert.equal(polls, 3);
  for (const text of shownWhilePending) assert.match(text, /Enter ABCD1234 at https:\/\/auth\.trakt\.tv\/activate/);
  assert.match(window.document.body.textContent, /Signed in to Trakt\./);
});

test('sign-in copies the device code, opens the activation page and says so', async (t) => {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  const data = new Map([['trakt.clientId', 'client'], ['trakt.oauth.redirectUri', 'http://localhost:5173/callback']]);
  const menus = new Map();
  const copied = [];
  let toastAtFirstPoll = '';
  window.GM_getValue = (k, fallback) => data.get(k) ?? fallback;
  window.GM_setValue = (k, v) => data.set(k, v);
  window.GM_deleteValue = (k) => data.delete(k);
  window.GM_setClipboard = (text, type) => copied.push([text, type]);
  const opened = [];
  window.GM_openInTab = (url, options) => opened.push([url, options.active]);
  window.GM_registerMenuCommand = (name, callback) => menus.set(name.replace('Trakt OG Toolkit: ', ''), callback);
  window.prompt = (message, initial) => initial;
  window.GM_xmlhttpRequest = (r) => {
    if (r.url.endsWith('/device/code')) {
      r.onload({ status: 200, responseHeaders: '', responseText: JSON.stringify({
        device_code: 'dev', user_code: 'ABCD1234', verification_url: 'https://auth.trakt.tv/activate', interval: 0.05, expires_in: 30 }) });
      return;
    }
    toastAtFirstPoll = window.document.body.textContent;
    r.onload({ status: 418, responseHeaders: '', responseText: '' });
  };
  window.document.write('<html><head></head><body></body></html>');
  window.eval(readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await menus.get('sign in')();
  assert.deepEqual(copied, [['ABCD1234', 'text']]);
  assert.deepEqual(opened, [['https://auth.trakt.tv/activate', true]]);
  assert.match(toastAtFirstPoll, /Code ABCD1234 copied; paste it at https:\/\/auth\.trakt\.tv\/activate \(opened in a new tab\)/);
});
