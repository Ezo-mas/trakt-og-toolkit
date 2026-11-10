import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { get } from 'node:https';
import { Window } from 'happy-dom';
import { LOGIN_PAGES, checkSelectors, unreachableReason } from './og-drift-checks.mjs';
import { checkOgSessionStorage, checkNativeModules } from './og-drift-native.mjs';
import { STORAGE } from '../src/core/store.js';

// Live checks always use og.trakt.tv; never the classic trakt.tv site.
const OG_ORIGIN = 'https://og.trakt.tv';
const pages = [
  { name: 'movie', path: '/movies/the-matrix-1999', panel: '#ogt-custom-links', feature: 'custom-links' },
  { name: 'show', path: '/shows/breaking-bad', panel: '#ogt-custom-links', feature: 'custom-links' },
  { name: 'season', path: '/shows/breaking-bad/seasons/1', panel: '.ogt-season-chart', feature: 'season-chart' },
  { name: 'episode', path: '/shows/breaking-bad/seasons/1/episodes/1' },
  { name: 'person', path: '/people/bryan-cranston', panel: '.ogt-pronounce', feature: 'pronunciation' },
  { name: 'listing', path: '/movies/trending' },
];
const options = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const flag = { '--save': 'save', '--signed-in': 'signedIn' }[args[i]];
  if (!flag || !args[i + 1] || options[flag]) {
    console.error('Usage: node scripts/og-drift.mjs [--save <dir>] [--signed-in <dir>]');
    process.exit(2);
  }
  options[flag] = args[i + 1];
}
const saveDir = options.save;
if (saveDir) await mkdir(saveDir, { recursive: true });
const bundle = await readFile(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fetchPage(url, redirects = 0, accept = 'text/html') {
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', Accept: accept },
      maxHeaderSize: 65536,
      signal: AbortSignal.timeout(30000),
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 10) return reject(new Error('too many redirects'));
        return resolve(fetchPage(new URL(response.headers.location, url).href, redirects + 1, accept));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, url, html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function checkPanel(page, html, url, { disabled = [] } = {}) {
  const window = new Window({ url });
  try {
    window.GM_getValue = (key, fallback) => key === STORAGE.features && disabled.length ? disabled : fallback;
    window.GM_setValue = () => {};
    window.GM_deleteValue = () => {};
    window.GM_addStyle = () => {};
    window.GM_registerMenuCommand = () => {};
    window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<link\b[^>]*>/gi, ''));
    window.eval(bundle);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await wait(2200);
    return Boolean(window.document.querySelector(page.panel));
  } finally {
    window.close();
  }
}

async function fetchAsset(url) {
  const response = await fetchPage(url, 0, '*/*');
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  return response.html;
}

const results = [];
let sampleHtml = null, sampleUrl = null;
for (const [index, page] of pages.entries()) {
  if (index) await wait(500);
  const url = `${OG_ORIGIN}${page.path}`;
  let response;
  let html;
  try {
    response = await fetchPage(url);
    html = response.html;
  } catch (error) {
    results.push({ page: page.name, status: 'unreachable', details: [error.message] });
    continue;
  }
  if (saveDir) await writeFile(`${saveDir}/${page.name}.html`, html);
  const reason = unreachableReason({ status: response.status, url: response.url, html });
  if (reason) {
    results.push({ page: page.name, status: 'unreachable', details: [reason] });
    continue;
  }
  sampleHtml ??= html;
  sampleUrl ??= url;
  const window = new Window({ url });
  window.document.write(html);
  const missing = checkSelectors(window.document, page.name).filter((check) => !check.ok);
  window.close();
  const details = missing.map((check) => `${check.feature}: ${check.selector}`);
  if (page.panel) {
    if (!(await checkPanel(page, html, url))) details.push(`bundle mount: ${page.panel}`);
    else if (page.feature && await checkPanel(page, html, url, { disabled: [page.feature] })) {
      details.push(`feature toggle: ${page.feature} did not hide ${page.panel}`);
    }
  }
  results.push({ page: page.name, status: details.length ? 'drift' : 'ok', details });
}
if (sampleHtml) {
  const nativeDetails = await checkNativeModules({ html: sampleHtml, pageUrl: sampleUrl, read: fetchAsset });
  results.push({ page: 'native', status: nativeDetails.length ? 'drift' : 'ok', details: nativeDetails });
  const sessionDetails = await checkOgSessionStorage({ html: sampleHtml, pageUrl: sampleUrl, read: fetchAsset });
  results.push({ page: 'session', status: sessionDetails.length ? 'drift' : 'ok', details: sessionDetails });
}

// og's session is an httpOnly cookie; this script never handles it. Signed-in pages are checked from HTML
// saved in a signed-in browser instead.
const loginNotes = [];
for (const page of LOGIN_PAGES) {
  if (!options.signedIn) { loginNotes.push(`${page.name}: not checked (needs login; see --signed-in)`); continue; }
  let html;
  try { html = await readFile(`${options.signedIn}/${page.name}.html`, 'utf8'); }
  catch { loginNotes.push(`${page.name}: not checked (no ${page.name}.html in ${options.signedIn})`); continue; }
  const window = new Window({ url: `${OG_ORIGIN}${page.path}` });
  window.document.write(html);
  const missing = checkSelectors(window.document, page.name).filter((check) => !check.ok);
  window.close();
  const details = missing.map((check) => `${check.feature}: ${check.selector}`);
  results.push({ page: page.name, status: details.length ? 'drift' : 'ok', details });
}

console.log('Page     Status       Details');
for (const result of results) {
  console.log(`${result.page.padEnd(8)} ${result.status.padEnd(12)} ${result.details.join('; ') || '-'}`);
}
for (const note of loginNotes) console.log(note);
if (results.some((result) => result.status === 'drift')) process.exitCode = 1;
else if (results.some((result) => result.status === 'unreachable')) process.exitCode = 2;
