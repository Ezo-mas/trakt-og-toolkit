/** Markup used by the toolkit on each kind of page. */
export const SELECTORS = [
  { feature: 'hydration gate', pages: ['movie', 'show', 'season', 'episode', 'person'], selector: 'inline script containing node_ids: [', kind: 'hydration' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-frame #overview .top' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-title h1' },
  { feature: 'custom links', pages: ['movie', 'show'], selector: '.summary-title .year' },
  { feature: 'custom links (ids)', pages: ['movie', 'show'], selector: 'a[href*="themoviedb.org/"]' },
  { feature: 'custom links (ids)', pages: ['movie', 'show'], selector: 'a[href*="imdb.com/title/"]' },
  { feature: 'custom links (sidebar)', pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar .summary-poster' },
  { feature: 'custom links (sidebar)', pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar ul.external-links' },
  { feature: 'custom links (watch now)', pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar .watch-now + dialog .streaming-links' },
  { feature: 'custom links (phone watch now)', pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame .watch-now.phone + dialog .streaming-links' },
  { feature: 'custom links (season counts)', pages: ['show'], selector: 'a[href*="/seasons/"] span.subtitle' },
  { feature: 'custom links (show link)', pages: ['season', 'episode'], selector: '.title-tags a[href^="/shows/"]' },
  { feature: 'custom links (show ids)', pages: ['season', 'episode'], selector: 'a[href*="themoviedb.org/tv/"]' },
  { feature: 'custom links (show ids)', pages: ['season'], selector: 'a[href*="imdb.com/title/"][href*="/episodes"]' },
  { feature: 'season chart', pages: ['season'], selector: 'section.episodes' },
  { feature: 'season chart', pages: ['season'], selector: 'section.episodes article.row' },
  { feature: 'season chart', pages: ['season'], selector: '.titles h3', firstRow: true },
  { feature: 'season chart', pages: ['season'], selector: '.titles .number', firstRow: true },
  { feature: 'season chart', pages: ['season'], selector: '.rating-trigger .value', firstRow: true },
  { feature: 'playback badge', pages: ['movie', 'episode'], selector: '.summary-frame #overview .top' },
  // Feature 31 sits at the end of the details column and measures it against the action stack beside it.
  { feature: 'ratings chart', pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top > .details' },
  { feature: 'ratings chart', pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top > .actions' },
  { feature: 'pronunciation', pages: ['person'], selector: '.summary .summary-title h1', nonEmpty: true },
  // Features 12 and 13 mount here; the picker trigger is also used for native refreshes.
  { feature: 'title actions', pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top .actions' },
  { feature: 'watchlist list control', pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top .actions .list-control.summary' },
  { feature: 'watchlist picker trigger', pages: ['movie', 'show', 'season', 'episode'], selector: '.list-control.summary button[aria-controls][aria-keyshortcuts~="ArrowDown"]' },
  { feature: 'watchlist card list controls', pages: ['listing'], selector: '.quick-icons .list-control.card, .quick-icons button.action.list' },
  { feature: 'watchlist credit toolbar', pages: ['person'], selector: '#credits .toolbar .controls' },
  { feature: 'watchlist credit rows', pages: ['person'], selector: 'article.credit-row a.poster[href^="/movies/"], article.credit-row a.poster[href^="/shows/"]' },
  { feature: 'watchlist credit list controls', pages: ['person'], selector: 'article.credit-row .quick-icons .list-control.card, article.credit-row .quick-icons button.action.list' },
  // Feature 33 mounts in the list's own title bar; og filters the same page with `?display=`.
  { feature: 'watchlist pick', pages: ['watchlist'], selector: 'section.title-row .title-bar .actions' },
  { feature: 'watchlist pick (filter)', pages: ['watchlist'], selector: 'a[href*="/watchlist?display=movie"]' },
  { feature: 'csv export', pages: ['list', 'official'], selector: 'section.title-row .title-bar .actions' },
  // Signed-in pages: og redirects these to sign-in without a session, so they come from `--signed-in <dir>`.
  { feature: 'playback overview', pages: ['progress'], selector: 'section.progress' },
  { feature: 'month review', pages: ['dashboard'], selector: 'nav.ribbon' },
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

/**
 * Pages that need og's session. Open each in a signed-in browser, let it finish loading, save the rendered DOM
 * (`document.documentElement.outerHTML`; og draws `nav.ribbon` client-side) as `<dir>/<name>.html` and pass
 * `--signed-in <dir>`.
 */
export const LOGIN_PAGES = [
  { name: 'progress', path: '/users/<you>/progress' },
  { name: 'dashboard', path: '/dashboard' },
];
