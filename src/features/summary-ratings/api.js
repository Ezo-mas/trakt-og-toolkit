import { apiGet } from '../../core/trakt.js';
import { parseRatings, ratingsPath, statsPath } from './data.js';

/** Community ratings change slowly; an hour keeps a re-visit cheap without going stale for a day. */
const TTL = 60 * 60 * 1000;

/** The parsed ratings for a summary route, or null when there is no endpoint or too few votes. */
export async function getSummaryRatings(route) {
  const path = ratingsPath(route);
  if (!path) return null;
  return parseRatings(await apiGet(path, { ttl: TTL }));
}

/** The title's watcher count, for the votes tile; null when unavailable. */
export async function getSummaryWatchers(route) {
  const path = statsPath(route);
  if (!path) return null;
  const stats = await apiGet(path, { ttl: TTL });
  const watchers = Number(stats?.watchers);
  return Number.isFinite(watchers) && watchers > 0 ? watchers : null;
}
