import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIR, REPO, VERSION } from '../src/meta.js';

/**
 * The committed bundle is what users install, so its header is where managers learn about updates. These checks read
 * the built files instead of build.mjs: a forgotten `npm run build` after editing the header then fails here.
 */
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const bundle = read(`dist/${DIR}.user.js`);
const meta = read(`dist/${DIR}.meta.js`);
const header = bundle.split('==/UserScript==')[0];
const field = (name) => header.match(new RegExp(`^// @${name}\\s+(.+?)\\s*$`, 'm'))?.[1];
const raw = `https://raw.githubusercontent.com/${REPO}/main/dist/${DIR}`;

test('the built header checks the header-only file and downloads the main-branch bundle', () => {
  assert.equal(field('updateURL'), `${raw}.meta.js`, '@updateURL must point at the raw .meta.js on main');
  assert.equal(field('downloadURL'), `${raw}.user.js`, '@downloadURL must point at the raw .user.js on main');
});

test('the .meta.js file is exactly the bundle header', () => {
  assert.ok(bundle.startsWith(meta), 'dist .meta.js must match the .user.js header; run npm run build');
  assert.ok(meta.trimEnd().endsWith('// ==/UserScript=='));
});

test('the built header links the project and its issue tracker', () => {
  assert.equal(field('homepageURL'), `https://github.com/${REPO}`);
  assert.equal(field('supportURL'), `https://github.com/${REPO}/issues`);
});

test('the built header keeps @version in sync with src/meta.js and package.json', () => {
  assert.equal(field('version'), VERSION);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, VERSION, 'package.json must not drift from src/meta.js');
});
