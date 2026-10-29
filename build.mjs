import { build, context } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { NAME, DIR, VERSION, HOST, DEV_MATCHES } from './src/meta.js';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

/** Userscript metadata. Name, version and hosts come from src/meta.js. */
const matches = [`https://${HOST}/*`, ...DEV_MATCHES.map((host) => `http://${host}/*`)];
const header = `// ==UserScript==
// @name         ${NAME}
// @namespace    https://github.com/trakt-og-toolkit
// @version      ${VERSION}
// @description  Brings back the useful classic-Trakt extras on og.trakt.tv.
// @author       Ezo-mas
// @license      MIT
${matches.map((match) => `// @match        ${match}`).join('\n')}
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.trakt.tv
// @noframes
// ==/UserScript==
`;

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
