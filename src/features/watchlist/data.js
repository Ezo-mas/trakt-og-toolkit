/** Public lookup needed to identify exactly the item on this page. */
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
