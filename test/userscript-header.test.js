import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/meta.js';

/**
 * The committed bundle is what users install, so its header is where managers learn about updates. These checks read
 * the built file instead of build.mjs: a forgotten `npm run build` after editing the header then fails here.
 */
const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const header = bundle.split('==/UserScript==')[0];
const field = (name) => header.match(new RegExp(`^// @${name}\\s+(.+?)\\s*$`, 'm'))?.[1];

test('the built header updates from the main-branch bundle', () => {
  const raw = 'https://raw.githubusercontent.com/Ezo-mas/trakt-og-toolkit/main/dist/trakt-og-toolkit.user.js';
  assert.equal(field('updateURL'), raw, '@updateURL must point at the raw dist file on main');
  assert.equal(field('downloadURL'), raw, '@downloadURL must point at the raw dist file on main');
});

test('the built header links the project and its issue tracker', () => {
  assert.equal(field('homepageURL'), 'https://github.com/Ezo-mas/trakt-og-toolkit');
  assert.equal(field('supportURL'), 'https://github.com/Ezo-mas/trakt-og-toolkit/issues');
});

test('the built header keeps @version in sync with src/meta.js', () => {
  assert.equal(field('version'), VERSION);
});
