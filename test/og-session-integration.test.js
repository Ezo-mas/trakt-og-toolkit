import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { ogSessionKey } from '../src/core/og-session.js';

const OG_CLIENT = 'WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI';
const OG_KEY = ogSessionKey(OG_CLIENT);
const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');

test('upgrading clears a legacy client ID saved in fallback storage', (t) => {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  window.localStorage.setItem('ogt:trakt.clientId', '"legacy-client"');
  window.localStorage.setItem('ogt:watch.customLinks', '[]');
  window.document.write('<html><head></head><body></body></html>');
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  assert.equal(window.localStorage.getItem('ogt:trakt.clientId'), null);
  assert.equal(window.localStorage.getItem('ogt:watch.customLinks'), '[]');
});

test('built bundle makes og-session calls without storing or printing the token', async (t) => {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  const menus = new Map();
  const vault = new Map([
    ['trakt.oauth.tokens', { access_token: 'LEGACY_ACCESS' }],
    ['trakt.oauth.redirectUri', 'http://localhost/callback'],
    ['trakt.clientId', 'legacy-client'],
  ]);
  const requests = [];
  let status = 200;
  window.localStorage.setItem(OG_KEY, JSON.stringify({
    access_token: 'OG_SECRET_ACCESS', refresh_token: 'OG_SECRET_REFRESH', token_type: 'Bearer',
    profile: { ids: { trakt: 7 }, username: 'og-tester' },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }));
  window.GM_getValue = (key, fallback) => vault.get(key) ?? fallback;
  window.GM_setValue = (key, value) => vault.set(key, value);
  window.GM_deleteValue = (key) => vault.delete(key);
  window.GM_registerMenuCommand = (name, callback) => menus.set(name, callback);
  window.GM_xmlhttpRequest = (request) => {
    requests.push(request);
    assert.ok(request.url.startsWith('https://api.trakt.tv/'), `unexpected request to ${request.url}`);
    request.onload({
      status, responseHeaders: '', responseText: JSON.stringify({ username: 'og-tester' }),
    });
    return { abort: () => request.onabort() };
  };
  window.document.write('<html><head></head><body></body></html>');
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  await menus.get('Test API connection')();
  assert.match(window.document.body.textContent, /Trakt API OK/);
  assert.doesNotMatch(window.document.body.textContent, /OG_SECRET_/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.trakt.tv/users/me');
  assert.equal(requests[0].headers.Authorization, 'Bearer OG_SECRET_ACCESS');
  assert.equal(requests[0].headers['trakt-api-key'], OG_CLIENT);
  assert.equal(vault.has('trakt.oauth.tokens'), false);
  assert.equal(vault.has('trakt.clientId'), false);
  assert.match(window.localStorage.getItem(OG_KEY), /OG_SECRET_ACCESS/);

  assert.equal(vault.has('trakt.oauth.redirectUri'), false);
  assert.equal(menus.has('Sign out'), false);

  status = 403;
  await menus.get('Test API connection')();
  assert.match(window.document.body.textContent, /Trakt API failed — HTTP 403/);

  const changes = [];
  window.document.addEventListener('ogt:authchange', () => changes.push(true));
  const original = window.localStorage.getItem(OG_KEY);
  const renewed = JSON.stringify({ ...JSON.parse(original), access_token: 'OG_SECRET_RENEWED' });
  window.localStorage.setItem(OG_KEY, renewed);
  window.dispatchEvent(new window.StorageEvent('storage', {
    key: OG_KEY, oldValue: original, newValue: renewed, storageArea: window.localStorage,
  }));
  assert.equal(changes.length, 0, 'a token renewal keeps the existing session');

  const replacement = JSON.stringify({ ...JSON.parse(renewed), profile: { sub: 'another-account' } });
  window.localStorage.setItem(OG_KEY, replacement);
  window.dispatchEvent(new window.StorageEvent('storage', {
    key: OG_KEY, oldValue: renewed, newValue: replacement, storageArea: window.localStorage,
  }));
  await Promise.resolve();
  assert.equal(changes.length, 1, 'the built script observes another tab switching accounts');
  window.localStorage.clear();
  window.dispatchEvent(new window.StorageEvent('storage', { key: null, storageArea: window.localStorage }));
  await Promise.resolve();
  assert.equal(changes.length, 2, 'clearing localStorage announces sign-out');
  await menus.get('Test API connection')();
  assert.match(window.document.body.textContent, /Sign in to og\.trakt\.tv first/);
  assert.equal(requests.length, 2);
  assert.equal(vault.has('trakt.oauth.tokens'), false);
});
