/** Public lookup needed to identify exactly the item on this page. */
import { parseRoute } from '../../core/router.js';

export function watchlistLookup(route) {
  if (!route?.id) return null;
  const id = encodeURIComponent(route.id);
  if (route.kind === 'movie' && route.name === 'title') return { type: 'movies', path: `/movies/${id}` };
  if (route.kind !== 'show') return null;
  if (route.name === 'title') return { type: 'shows', path: `/shows/${id}` };
  if (!Number.isSafeInteger(route.season) || route.season < 0) return null;
  if (route.name === 'season') return { type: 'seasons', path: `/shows/${id}/seasons`, season: route.season };
  if (route.name === 'episode' && Number.isSafeInteger(route.episode) && route.episode > 0) {
    return { type: 'episodes', path: `/shows/${id}/seasons/${route.season}/episodes/${route.episode}` };
  }
  return null;
}

export function watchlistBody(lookup, data) {
  const item = lookup?.type === 'seasons'
    ? (Array.isArray(data) ? data.find(season => season?.number === lookup.season) : null)
    : data;
  const id = item?.ids?.trakt;
  if (!lookup || !Number.isSafeInteger(id) || id <= 0) throw new Error('Could not identify this title.');
  return { [lookup.type]: [{ ids: { trakt: id } }] };
}

/** Selected also means membership in custom lists. Only the summary's Watchlist detail proves membership. */
export function readWatchlisted(anchor) {
  return [...anchor.querySelectorAll('.summary-action')].some(action =>
    /^listed on$/i.test(action.querySelector('.title')?.textContent.trim() ?? '') &&
    /^watchlist(?:\s*\+|$)/i.test(action.querySelector('.detail')?.textContent.trim() ?? ''));
}

/** Only whole movies/shows get shortcuts; subtitle links must not turn episodes into show actions. */
export function readCardRoute(card) {
  const link = card.querySelector('a.poster[href], a.image-link[href]');
  if (!link) return null;
  try {
    const url = new URL(link.getAttribute('href'), card.ownerDocument.location.href);
    if (url.origin !== card.ownerDocument.location.origin) return null;
    const route = parseRoute(url.pathname);
    return route.name === 'title' && watchlistLookup(route) ? route : null;
  } catch { return null; }
}

/** The rich tooltip is rendered even while closed. A custom list called Watchlist has a /lists/:id URL. */
export function readCardWatchlisted(control) {
  const trigger = control.matches('button') ? control : control.querySelector('button.trigger');
  const ids = trigger?.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  return ids.some(id => [...(control.ownerDocument.getElementById(id)?.querySelectorAll('.listed-tip a[href]') ?? [])]
    .some(link => {
      try {
        const url = new URL(link.getAttribute('href'), control.ownerDocument.location.href);
        return url.origin === control.ownerDocument.location.origin && /^\/users\/[^/]+\/watchlist\/?$/.test(url.pathname);
      } catch { return false; }
    }));
}
