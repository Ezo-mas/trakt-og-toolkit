/** Markup used by the toolkit on each kind of page. */
export const SELECTORS = [
  { feature: 'hydration gate', pages: ['movie', 'show', 'season', 'episode', 'person'], selector: 'inline script containing node_ids: [', kind: 'hydration' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-frame #overview .top' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-title h1' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-title .year' },
  { feature: 'custom links (ids)', pages: ['movie', 'show'], selector: 'a[href*="themoviedb.org/"]' },
  { feature: 'custom links (ids)', pages: ['movie', 'show'], selector: 'a[href*="imdb.com/title/"]' },
  { feature: 'custom links (season counts)', pages: ['show'], selector: 'a[href*="/seasons/"] span.subtitle' },
  { feature: 'season chart', pages: ['season'], selector: 'section.episodes' },
  { feature: 'season chart', pages: ['season'], selector: 'section.episodes article.row' },
  { feature: 'season chart', pages: ['season'], selector: '.titles h3', firstRow: true },
  { feature: 'season chart', pages: ['season'], selector: '.titles .number', firstRow: true },
  { feature: 'season chart', pages: ['season'], selector: '.rating-trigger .value', firstRow: true },
  { feature: 'playback badge', pages: ['movie', 'episode'], selector: '.summary-frame #overview .top' },
  { feature: 'pronunciation', pages: ['person'], selector: '.summary .summary-title h1', nonEmpty: true },
];

/** Return each applicable check and whether it matched. */
export function checkSelectors(document, page) {
  return SELECTORS.filter((check) => check.pages.includes(page)).map((check) => {
    let matched;
    if (check.kind === 'hydration') {
      matched = [...document.scripts].some((script) => !script.hasAttribute('src') && /node_ids\s*:\s*\[/.test(script.textContent));
    } else {
      const root = check.firstRow ? document.querySelector('section.episodes article.row') : document;
      const node = root?.querySelector(check.selector);
      matched = Boolean(node && (!check.nonEmpty || node.textContent.trim()));
    }
    return { feature: check.feature, selector: check.selector, ok: matched };
  });
}

/** Identify responses that cannot be used to judge og's markup. */
export function unreachableReason({ status, url, html }) {
  if (new URL(url).pathname.replace(/\/$/, '') === '/signin') return 'redirected to sign-in';
  if (status !== 200) return `HTTP ${status}`;
  if (/\b(?:cf-challenge|cf_chl_|just a moment\.\.\.)/i.test(html)) return 'Cloudflare challenge';
  return null;
}

export const LOGIN_CHECKS = [{ feature: 'month review', selector: 'nav.ribbon', status: 'not checked (needs login)' }];
