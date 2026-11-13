export { SELECTORS, checkSelectors } from '../src/core/drift-checks.js';

/** Identify responses that cannot be used to judge og's markup. */
export function unreachableReason({ status, url, html }) {
  if (new URL(url).pathname.replace(/\/$/, '') === '/signin') return 'redirected to sign-in';
  if (status !== 200) return `HTTP ${status}`;
  if (/\b(?:cf-challenge|cf_chl_|just a moment\.\.\.)/i.test(html)) return 'Cloudflare challenge';
  return null;
}

/**
 * Pages that need og's session. Open each in a signed-in browser, let it finish loading, save the rendered DOM
 * (`document.documentElement.outerHTML`; og draws `nav.ribbon` client-side) as `<dir>/<name>.html` and pass
 * `--signed-in <dir>`.
 */
export const LOGIN_PAGES = [
  { name: 'progress', path: '/users/<you>/progress' },
  { name: 'dashboard', path: '/dashboard' },
];
