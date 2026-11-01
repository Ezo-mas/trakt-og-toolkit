import { LOGIN_CHECKS } from './og-drift-checks.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { get } from 'node:https';
import { Window } from 'happy-dom';
import { checkSelectors, unreachableReason } from './og-drift-checks.mjs';

const pages = [
  { name: 'movie', path: '/movies/the-matrix-1999', panel: '#ogt-custom-links' },
  { name: 'show', path: '/shows/breaking-bad', panel: '#ogt-custom-links' },
  { name: 'season', path: '/shows/breaking-bad/seasons/1', panel: '.ogt-season-chart' },
  { name: 'episode', path: '/shows/breaking-bad/seasons/1/episodes/1' },
  { name: 'person', path: '/people/bryan-cranston', panel: '.ogt-pronounce' },
];
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--save' || !args[1])) {
  console.error('Usage: node scripts/og-drift.mjs [--save <dir>]');
  process.exit(2);
}
const saveDir = args[1];
if (saveDir) await mkdir(saveDir, { recursive: true });
const bundle = await readFile(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fetchPage(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', Accept: 'text/html' },
      maxHeaderSize: 65536,
      signal: AbortSignal.timeout(30000),
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 10) return reject(new Error('too many redirects'));
        return resolve(fetchPage(new URL(response.headers.location, url).href, redirects + 1));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, url, html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function checkPanel(page, html, url) {
  const window = new Window({ url });
  try {
    window.GM_getValue = (key, fallback) => fallback;
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

const results = [];
for (const [index, page] of pages.entries()) {
  if (index) await wait(500);
  const url = `https://og.trakt.tv${page.path}`;
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
  const window = new Window({ url });
  window.document.write(html);
  const missing = checkSelectors(window.document, page.name).filter((check) => !check.ok);
  window.close();
  const details = missing.map((check) => `${check.feature}: ${check.selector}`);
  if (page.panel && !(await checkPanel(page, html, url))) details.push(`bundle mount: ${page.panel}`);
  results.push({ page: page.name, status: details.length ? 'drift' : 'ok', details });
}

console.log('Page     Status       Details');
for (const result of results) {
  console.log(`${result.page.padEnd(8)} ${result.status.padEnd(12)} ${result.details.join('; ') || '-'}`);
}
console.log('playback overview: not checked (needs login)');
if (results.some((result) => result.status === 'drift')) process.exitCode = 1;
else if (results.some((result) => result.status === 'unreachable')) process.exitCode = 2;

for (const check of LOGIN_CHECKS) console.log(`${check.feature} ${check.selector}: ${check.status}`);
