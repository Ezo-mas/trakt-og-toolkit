import { build, context } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { DIR, VERSION } from './src/meta.js';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

/** Userscript metadata. Keep @match in sync with src/meta.js DIR/DEV_MATCHES. */
const header = `// ==UserScript==
// @name         Trakt OG Toolkit
// @namespace    https://github.com/trakt-og-toolkit
// @version      ${VERSION}
// @description  Watch links, trailers and (soon) ratings helpers for og.trakt.tv.
// @author       Trakt OG Toolkit contributors
// @license      MIT
// @match        https://og.trakt.tv/*
// @match        http://localhost:5173/*
// @match        http://localhost:5174/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.trakt.tv
// @connect      www.youtube-nocookie.com
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
