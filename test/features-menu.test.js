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

function boot(t, { storage = {} } = {}) {
  const window = new Window({ url: 'https://og.trakt.tv/shows/breaking-bad' });
  t.after(() => window.close());
  const data = new Map(Object.entries(storage));
  const menus = new Map();
  window.GM_getValue = (key, fallback) => data.has(key) ? data.get(key) : fallback;
  window.GM_setValue = (key, value) => data.set(key, value);
  window.GM_deleteValue = key => data.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = (name, callback) => menus.set(name.replace('Trakt OG Toolkit: ', ''), callback);
  window.document.write(`<!doctype html><html><head></head><body>${SHOW_HTML}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window,
    document: window.document,
    data,
    menus,
    panel: () => window.document.getElementById('ogt-custom-links'),
    toggle: (label) => menus.get(`toggle ${label}`)(),
  };
}

test('every feature gets a menu toggle and all are on by default', async t => {
  const b = boot(t);
  await wait();
  assert.ok(b.panel());
  for (const [id, label] of Object.entries(FEATURE_LABELS)) {
    assert.equal(typeof b.menus.get(`toggle ${label}`), 'function', id);
  }
  assert.equal(b.data.has('features.disabled'), false);
});

test('a menu toggle removes the panel immediately, persists, and restores it', async t => {
  const b = boot(t);
  await wait();
  b.toggle('Custom links');
  await wait();
  assert.equal(b.panel(), null);
  assert.deepEqual([...b.data.get('features.disabled')], ['custom-links']);

  b.toggle('Custom links');
  await wait();
  assert.ok(b.panel());
  assert.deepEqual([...b.data.get('features.disabled')], []);
});

test('stored disabled features load off and malformed storage keeps features on', async t => {
  const off = boot(t, { storage: { 'features.disabled': ['custom-links'] } });
  await wait();
  assert.equal(off.panel(), null);
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

  b.menus.get('add custom link')();
  await wait();
  assert.match(dialogs.prompts[0].message, /Server hosts:/);
  assert.match(dialogs.prompts[0].message, /\{jellyfin\}/);
  assert.deepEqual(JSON.parse(JSON.stringify(b.data.get('watch.customLinks'))), [
    { label: 'Jellyfin', url: '{jellyfin}/web/#/search?query={title}' },
  ]);

  answer = 'Bad | {title}/evil';
  b.menus.get('add custom link')();
  await wait();
  assert.match(dialogs.errors[0], /server placeholder/);
  assert.equal(b.data.get('watch.customLinks').length, 1, 'an arbitrary placeholder is rejected');
});
