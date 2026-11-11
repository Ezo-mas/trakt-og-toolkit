import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { createFeatureHost } from '../src/features/host.js';
import { FEATURE_LABELS } from '../src/menu.js';
import { answerDialogs } from './dialogs.js';
import { SHOW_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

test('feature host never mounts a disabled feature and removes it when switched off', () => {
  const window = new Window();
  let enabled = true;
  let matches = 0, mounts = 0;
  const feature = {
    id: 'demo',
    match: () => { matches++; return true; },
    mount() {
      mounts++;
      const node = window.document.createElement('p');
      window.document.body.append(node);
      return { node, destroy() { node.remove(); } };
    },
  };
  const host = createFeatureHost([feature], { isEnabled: () => enabled });
  host({ key: '/' });
  assert.equal(mounts, 1);
  assert.equal(window.document.querySelectorAll('p').length, 1);

  enabled = false;
  host({ key: '/' });
  assert.equal(window.document.querySelectorAll('p').length, 0);
  assert.equal(matches, 1, 'a disabled feature is skipped before matching');

  enabled = true;
  host({ key: '/' });
  assert.equal(mounts, 2);
  assert.equal(window.document.querySelectorAll('p').length, 1);
  window.close();
});

function boot(t, { storage = {}, unregister = false } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/shows/breaking-bad' });
  t.after(() => window.close());
  const data = new Map(Object.entries(storage));
  const menus = new Map();
  window.GM_getValue = (key, fallback) => data.has(key) ? data.get(key) : fallback;
  window.GM_setValue = (key, value) => data.set(key, value);
  window.GM_deleteValue = key => data.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = (name, callback) => {
    menus.set(name, callback);
    return name;
  };
  if (unregister) window.GM_unregisterMenuCommand = (name) => menus.delete(name);
  window.document.write(`<!doctype html><html><head></head><body>${SHOW_HTML}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window,
    document: window.document,
    data,
    menus,
    panel: () => window.document.getElementById('ogt-custom-links'),
    toggle: (label) => (menus.get(`Toggle ${label}`) ?? menus.get(`✅ ${label}`) ?? menus.get(`⬜ ${label}`))(),
  };
}

test('feature host reruns a sync requested from match instead of re-entering', () => {
  const window = new Window();
  let host;
  let mounts = 0;
  let requested = false;
  const feature = {
    id: 'demo',
    match() {
      if (!requested) {
        requested = true;
        // An auth read inside match can dispatch while the host is mid-iteration.
        host({ key: '/' });
      }
      return true;
    },
    mount() {
      mounts++;
      const node = window.document.createElement('p');
      window.document.body.append(node);
      return { node, destroy() { node.remove(); } };
    },
  };
  host = createFeatureHost([feature]);
  host({ key: '/' });
  assert.equal(mounts, 1, 'the nested sync is deferred, not mounted twice');
  assert.equal(window.document.querySelectorAll('p').length, 1);
  window.close();
});

test('auth reset rebuilds only account-scoped features', () => {
  const window = new Window();
  const counts = { personal: 0, shared: 0 };
  const make = (id, authScoped) => ({
    id,
    authScoped,
    match: () => true,
    mount() {
      counts[id]++;
      const node = window.document.createElement('p');
      node.dataset.id = id;
      window.document.body.append(node);
      return { node, destroy() { node.remove(); } };
    },
  });
  const host = createFeatureHost([make('personal', true), make('shared', false)]);
  host({ key: '/' });
  assert.deepEqual(counts, { personal: 1, shared: 1 });

  host.reset();
  host({ key: '/' });
  assert.deepEqual(counts, { personal: 2, shared: 1 }, 'a feature without personal state keeps its instance');
  assert.equal(window.document.querySelectorAll('p').length, 2);
  window.close();
});

test('every feature gets a menu toggle and all are on by default', async t => {
  const b = boot(t);
  await wait();
  assert.ok(b.panel());
  for (const [id, label] of Object.entries(FEATURE_LABELS)) {
    assert.equal(typeof b.menus.get(`Toggle ${label}`), 'function', id);
  }
  assert.equal(b.data.has('features.disabled'), false);
});

test('a menu toggle removes the panel immediately, persists, and restores it', async t => {
  const b = boot(t);
  await wait();
  b.toggle('Custom links');
  await wait();
  assert.equal(Boolean(b.panel()), false);
  assert.deepEqual([...b.data.get('features.disabled')], ['custom-links']);

  b.toggle('Custom links');
  await wait();
  assert.ok(b.panel());
  assert.deepEqual([...b.data.get('features.disabled')], []);
});

test('stored disabled features load off and malformed storage keeps features on', async t => {
  const off = boot(t, { storage: { 'features.disabled': ['custom-links'] } });
  await wait();
  assert.equal(Boolean(off.panel()), false);
  off.toggle('Custom links');
  await wait();
  assert.ok(off.panel());

  const malformed = boot(t, { storage: { 'features.disabled': 'custom-links' } });
  await wait();
  assert.ok(malformed.panel(), 'a non-array value is ignored');
});

test('menu add-link accepts server placeholders and rejects arbitrary templates', async t => {
  const b = boot(t);
  await wait();

  let answer = 'Jellyfin | {jellyfin}/web/#/search?query={title}';
  const dialogs = answerDialogs(b.window, { prompt: () => answer });

  b.menus.get('Add custom link')();
  await wait();
  assert.match(dialogs.prompts[0].message, /Server hosts:/);
  assert.match(dialogs.prompts[0].message, /\{jellyfin\}/);
  assert.deepEqual(JSON.parse(JSON.stringify(b.data.get('watch.customLinks'))), [
    { label: 'Jellyfin', url: '{jellyfin}/web/#/search?query={title}' },
  ]);

  answer = 'Bad | {title}/evil';
  b.menus.get('Add custom link')();
  await wait();
  assert.match(dialogs.errors[0], /server placeholder/);
  assert.equal(b.data.get('watch.customLinks').length, 1, 'an arbitrary placeholder is rejected');
});

test('with GM_unregisterMenuCommand, toggles show their state and relabel in place after a click', async t => {
  const b = boot(t, { unregister: true, storage: { 'features.disabled': ['season-chart'] } });
  await wait();
  const names = () => [...b.menus.keys()];
  assert.ok(b.menus.has('✅ Custom links'));
  assert.ok(b.menus.has('⬜ Season chart'), 'a stored disabled feature starts unticked');
  assert.ok(b.menus.has('⬜ Debug logging'));
  assert.equal(names().some((name) => name.startsWith('Toggle ')), false);
  const before = names();
  assert.deepEqual(before.slice(0, before.indexOf('⬜ Debug logging')), [
    'About', 'Set API client ID', 'Test API connection', 'Sign in', 'Cancel sign-in', 'Sign out',
    'Show signed-in user', 'Add custom link', 'Remove custom link', 'Diagnostics', 'Clear API cache',
  ]);

  b.toggle('Custom links');
  await wait();
  assert.equal(Boolean(b.panel()), false);
  assert.ok(b.menus.has('⬜ Custom links'));
  assert.equal(b.menus.has('✅ Custom links'), false, 'the old label is removed, not duplicated');
  assert.equal(names().length, before.length);
  assert.equal(names().indexOf('⬜ Custom links'), before.indexOf('✅ Custom links'), 'the toggle keeps its place');
  assert.ok(names().indexOf('Clear API cache') < names().indexOf('⬜ Debug logging'), 'toggles stay last');

  b.toggle('Debug logging');
  await wait();
  assert.ok(b.menus.has('✅ Debug logging'));
});
