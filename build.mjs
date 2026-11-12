import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { NAME, DIR, REPO, VERSION, HOST, DEV_MATCHES } from './src/meta.js';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

/** Userscript metadata. Name, version and hosts come from src/meta.js. */
const matches = [`https://${HOST}/*`, ...DEV_MATCHES.map((host) => `http://${host}/*`)];
/**
 * Managers poll @updateURL for a newer @version, so it points at a header-only .meta.js; @downloadURL is the full
 * bundle they fetch once an update is found.
 */
const raw = `https://raw.githubusercontent.com/${REPO}/main/dist/${DIR}`;
const header = `// ==UserScript==
// @name         ${NAME}
// @namespace    https://github.com/trakt-og-toolkit
// @version      ${VERSION}
// @description  Brings back the useful classic-Trakt extras on og.trakt.tv.
// @author       Ezo-mas
// @license      MIT
// @homepageURL  https://github.com/${REPO}
// @supportURL   https://github.com/${REPO}/issues
// @updateURL    ${raw}.meta.js
// @downloadURL  ${raw}.user.js
${matches.map((match) => `// @match        ${match}`).join('\n')}
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      api.trakt.tv
// @connect      auth.trakt.tv
// @connect      forvo.com
// @connect      query.wikidata.org
// @noframes
// ==/UserScript==
`;

writeFileSync(`dist/${DIR}.meta.js`, header);

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['firefox115', 'chrome110'],
  outfile: `dist/${DIR}.user.js`,
  banner: { js: header },
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: false,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[build] watching src/');
} else {
  await build(options);
  const out = readFileSync(options.outfile, 'utf8');
  console.log(`[build] ${options.outfile} — ${(out.length / 1024).toFixed(1)} kB`);
}
