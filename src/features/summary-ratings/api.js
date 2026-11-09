import { apiGet } from '../../core/trakt.js';
import { parseRatings, ratingsPath } from './data.js';

/** Community ratings change slowly; an hour keeps a re-visit cheap without going stale for a day. */
const TTL = 60 * 60 * 1000;

/** The parsed ratings for a summary route, or null when there is no endpoint or too few votes. */
export async function getSummaryRatings(route) {
  const path = ratingsPath(route);
  if (!path) return null;
  return parseRatings(await apiGet(path, { ttl: TTL }));
}
