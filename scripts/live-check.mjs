/**
 * Dev check: run the built bundle against a saved copy of a real og page.
 *
 *   curl -sS https://og.trakt.tv/shows/breaking-bad -o /tmp/show.html
 *   node scripts/live-check.mjs /tmp/show.html https://og.trakt.tv/shows/breaking-bad
 *
 * It loads the HTML in happy-dom, injects the userscript and prints what the
 * custom links panel ended up with. Not part of `npm test` because it needs network
 * (or a saved page) and a real client ID for the API-backed parts.
 */
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const file = process.argv[2] || '/tmp/show.html';
const url = process.argv[3] || 'https://og.trakt.tv/shows/breaking-bad';

const html = readFileSync(file, 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '');
const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');

const window = new Window({ url });
const { document } = window;
window.GM_getValue = (key, fallback) =>
  key === 'watch.customLinks' ? [{ label: 'Mine', url: 'https://e.test/{tmdb}/{season}/{episode}' }] : fallback;
window.GM_setValue = () => {};
window.GM_deleteValue = () => {};
window.GM_addStyle = () => {};
window.GM_registerMenuCommand = () => {};

document.write(html);
window.eval(bundle);
document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise((resolve) => setTimeout(resolve, 800));

const panel = document.getElementById('ogt-custom-links');
console.log('URL        ', url);
console.log('panel      ', Boolean(panel));
console.log('after      ', panel?.previousElementSibling?.className ?? '(none)');
for (const chip of document.querySelectorAll('#ogt-custom-links .ogt-chip')) {
  console.log(`chip       ${chip.textContent.trim()} -> ${chip.getAttribute('href')}`);
}
const seasons = document.querySelector('#ogt-custom-links select[aria-label="Season"]');
console.log('seasons    ', seasons ? [...seasons.options].map((o) => o.textContent).join(', ') : '(none)');
const episodes = document.querySelector('#ogt-custom-links select[aria-label="Episode"]');
console.log('episodes   ', episodes ? episodes.options.length : '(none)');

window.close();
