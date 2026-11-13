/**
 * og renders no episodes section for a season without episodes, but its sidebar always says "N Episodes".
 * Without that link the count is unknown, so the season is still checked.
 */
export function seasonHasEpisodes(document) {
  const link = document.querySelector('a[href="#episodes"]');
  const count = link ? Number.parseInt(link.textContent.replace(/[^\d]/g, ''), 10) : Number.NaN;
  return count !== 0;
}

/** Markup used by the toolkit on each kind of page. */
// Sample-only checks describe the CLI’s fixed fixtures, where optional og content is known to exist.
export const SELECTORS = [
  { feature: 'hydration gate', sampleOnly: true, pages: ['movie', 'show', 'season', 'episode', 'person'], selector: 'inline script containing node_ids: [', kind: 'hydration' },
  { feature: 'custom links', ids: ['custom-links'], pages: ['movie', 'show'], selector: '.summary-frame #overview .top' },
  { feature: 'custom links', ids: ['custom-links'], pages: ['movie', 'show'], selector: '.summary-title h1' },
  { feature: 'custom links', ids: ['custom-links'], pages: ['movie', 'show'], selector: '.summary-title .year' },
  { feature: 'custom links (ids)', ids: ['custom-links'], sampleOnly: true, pages: ['movie', 'show'], selector: 'a[href*="themoviedb.org/"]' },
  { feature: 'custom links (ids)', ids: ['custom-links'], sampleOnly: true, pages: ['movie', 'show'], selector: 'a[href*="imdb.com/title/"]' },
  { feature: 'custom links (sidebar)', ids: ['custom-links'], pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar .summary-poster' },
  { feature: 'custom links (sidebar)', ids: ['custom-links'], pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar ul.external-links' },
  { feature: 'custom links (watch now)', ids: ['custom-links'], sampleOnly: true, pages: ['movie', 'show', 'season', 'episode'], selector: 'aside.sidebar .watch-now + dialog .streaming-links' },
  { feature: 'custom links (phone watch now)', ids: ['custom-links'], sampleOnly: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame .watch-now.phone + dialog .streaming-links' },
  { feature: 'custom links (season counts)', ids: ['custom-links'], sampleOnly: true, pages: ['show'], selector: 'a[href*="/seasons/"] span.subtitle' },
  { feature: 'custom links (show link)', ids: ['custom-links'], pages: ['season', 'episode'], selector: '.title-tags a[href^="/shows/"]' },
  { feature: 'custom links (show ids)', ids: ['custom-links'], sampleOnly: true, pages: ['season', 'episode'], selector: 'a[href*="themoviedb.org/tv/"]' },
  { feature: 'custom links (show ids)', ids: ['custom-links'], sampleOnly: true, pages: ['season'], selector: 'a[href*="imdb.com/title/"][href*="/episodes"]' },
  { feature: 'season chart', ids: ['season-chart'], when: seasonHasEpisodes, pages: ['season'], selector: 'section.episodes' },
  { feature: 'season chart', ids: ['season-chart'], sampleOnly: true, pages: ['season'], selector: 'section.episodes article.row' },
  { feature: 'season chart', ids: ['season-chart'], when: 'section.episodes article.row', pages: ['season'], selector: '.titles h3', firstRow: true },
  { feature: 'season chart', ids: ['season-chart'], when: 'section.episodes article.row', pages: ['season'], selector: '.titles .number', firstRow: true },
  { feature: 'season chart', ids: ['season-chart'], sampleOnly: true, when: 'section.episodes article.row', pages: ['season'], selector: '.rating-trigger .value', firstRow: true },
  { feature: 'playback badge', ids: ['playback'], signedIn: true, pages: ['movie', 'episode'], selector: '.summary-frame #overview .top' },
  // Feature 31 sits at the end of the details column and measures it against the action stack beside it.
  { feature: 'ratings chart', ids: ['summary-ratings'], signedIn: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top > .details' },
  { feature: 'ratings chart', ids: ['summary-ratings'], signedIn: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top > .actions' },
  { feature: 'pronunciation', ids: ['pronunciation'], pages: ['person'], selector: '.summary .summary-title h1', nonEmpty: true },
  // Features 12 and 13 mount here; the picker trigger is also used for native refreshes.
  { feature: 'title actions', ids: ['library', 'watchlist'], signedIn: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top .actions' },
  { feature: 'watchlist list control', ids: ['watchlist'], signedIn: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.summary-frame #overview .top .actions .list-control.summary' },
  { feature: 'watchlist picker trigger', ids: ['watchlist'], signedIn: true, pages: ['movie', 'show', 'season', 'episode'], selector: '.list-control.summary button[aria-controls][aria-keyshortcuts~="ArrowDown"]' },
  { feature: 'watchlist card list controls', ids: ['watchlist-cards'], signedIn: true, pages: ['listing'], selector: '.quick-icons .list-control.card, .quick-icons button.action.list' },
  { feature: 'watchlist credit toolbar', ids: ['watchlist-credits'], signedIn: true, when: '#credits article', pages: ['person'], selector: '#credits .toolbar .controls' },
  { feature: 'watchlist credit rows', ids: ['watchlist-credits'], signedIn: true, when: 'article.credit-row', pages: ['person'], selector: 'article.credit-row a.poster[href^="/movies/"], article.credit-row a.poster[href^="/shows/"]' },
  { feature: 'watchlist credit list controls', ids: ['watchlist-credits'], signedIn: true, when: 'article.credit-row', pages: ['person'], selector: 'article.credit-row .quick-icons .list-control.card, article.credit-row .quick-icons button.action.list' },
  // Feature 33 mounts in the list's own title bar; og filters the same page with `?display=`.
  { feature: 'watchlist pick', ids: ['watchlist-pick'], pages: ['watchlist'], selector: 'section.title-row .title-bar .actions' },
  { feature: 'watchlist pick (filter)', ids: ['watchlist-pick'], sampleOnly: true, pages: ['watchlist'], selector: 'a[href*="/watchlist?display=movie"]' },
  { feature: 'csv export', ids: ['csv-export'], pages: ['list', 'official'], selector: 'section.title-row .title-bar .actions' },
  // Signed-in pages: og redirects these to sign-in without a session, so they come from `--signed-in <dir>`.
  { feature: 'playback overview', ids: ['playback'], signedIn: true, pages: ['progress'], selector: 'section.progress' },
  { feature: 'month review', ids: ['month-review'], signedIn: true, pages: ['dashboard'], selector: 'nav.ribbon' },
];

/** Return each applicable check and whether it matched. */
export function checkSelectors(document, page, live) {
  return SELECTORS.filter((check) => check.pages.includes(page) && (!live || (
    !check.sampleOnly && (!check.signedIn || live.signedIn) &&
    (!check.ids || check.ids.some(live.isEnabled)) && (!check.when ||
      (typeof check.when === 'function' ? check.when(document) : document.querySelector(check.when)))
  ))).map((check) => {
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

const PAGE_TYPES = new Set([...SELECTORS.flatMap((check) => check.pages),
  'lists', 'lists-collaborations', 'liked-lists', 'smart-lists', 'seasons']);

export function driftPageType(route) {
  // Popular, trending and other list indexes have no route of their own, but list previews run there.
  if (route.name === 'other' && /^\/lists(?:\/|$)/.test(route.path)) return 'lists';
  const page = { title: route.kind, chart: 'listing', 'official-list': 'official' }[route.name] ?? route.name;
  return PAGE_TYPES.has(page) ? page : null;
}
