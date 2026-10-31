/**
 * Route parsing for og.trakt.tv.
 *
 * SvelteKit paths we care about:
 *   /shows/:id                     -> title
 *   /shows/:id/stats               -> stats
 *   /shows/:id/seasons              -> seasons
 *   /shows/:id/seasons/all          -> all-episodes
 *   /shows/:id/seasons/:season      -> season
 *   /shows/:id/seasons/:s/episodes/:e -> episode
 *   /movies/:id[/...]              -> same names where they exist
 *
 * `:id` is either a Trakt id (1388) or a slug (breaking-bad); both are passed
 * through unchanged because the Trakt API accepts either.
 */
import { debounce } from './dom.js';

/** First path segments that are chart pages, not titles. */
const CHART_NAMES = new Set([
  'trending',
  'popular',
  'anticipated',
  'recommendations',
  'recommended',
  'favorited',
  'watched',
  'library',
  'collected',
  'played',
  'boxoffice',
]);

const TITLE_PATH = /^\/(shows|movies)\/([^/]+)(?:\/(.*))?$/;

export function parseRoute(pathname = location.pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const progress = path.match(/^\/users\/([^/]+)\/progress(?:\/.*)?$/);
  if (progress) return { name: 'progress', kind: null, id: progress[1], path, key: path };
  const person = path.match(/^\/people\/([^/]+)$/);
  if (person) return { name: 'person', kind: 'person', id: person[1], path, key: path };
  const match = path.match(TITLE_PATH);

  if (!match) {
    return { name: 'other', kind: null, id: null, path, key: path };
  }

  const [, plural, id, rest = ''] = match;
  const kind = plural === 'shows' ? 'show' : 'movie';

  if (CHART_NAMES.has(id)) {
    return { name: 'chart', kind, id: null, path, key: path };
  }

  const segments = rest.split('/').filter(Boolean);
  const [first, second, third, fourth] = segments;

  let name = first || 'title';
  let season = null;
  let episode = null;

  if (first === 'seasons') {
    if (second !== undefined && /^\d+$/.test(second)) {
      season = Number(second);
      name = 'season';
      if (third === 'episodes' && fourth !== undefined && /^\d+$/.test(fourth)) {
        episode = Number(fourth);
        name = 'episode';
      }
    } else {
      // og's "All Episodes" list; no feature targets it.
      name = second === 'all' ? 'all-episodes' : 'seasons';
    }
  }

  return { name, kind, id, rest, season, episode, path, key: path };
}

/**
 * Watch SvelteKit's client-side navigation.
 *
 * SvelteKit calls history.pushState/replaceState, so patching those plus popstate
 * covers it. A debounced observer is the safety net for anything else (and for
 * re-renders that replace the DOM under us).
 */
export function createRouter({ onRoute, onSettle }) {
  let lastKey = null;

  const settle = debounce(() => {
    const route = parseRoute();
    if (route.key !== lastKey) {
      lastKey = route.key;
      onRoute(route);
    }
    onSettle?.(route);
  }, 150);

  const push = history.pushState;
  const replace = history.replaceState;

  history.pushState = function patchedPush(...args) {
    const result = push.apply(this, args);
    settle();
    return result;
  };
  history.replaceState = function patchedReplace(...args) {
    const result = replace.apply(this, args);
    settle();
    return result;
  };

  const onPop = () => settle();
  const onHash = () => settle();
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onHash);

  const observer = new MutationObserver(() => settle());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // First run: SvelteKit hydrates after document-start, so also run on ready.
  const ready = () => {
    const route = parseRoute();
    lastKey = route.key;
    onRoute(route);
    onSettle?.(route);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }

  return function stop() {
    history.pushState = push;
    history.replaceState = replace;
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onHash);
    observer.disconnect();
    settle.cancel();
  };
}
