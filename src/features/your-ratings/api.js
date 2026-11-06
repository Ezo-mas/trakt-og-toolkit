import { apiAuth, isSignedIn } from '../../core/trakt.js';
import { mapRatings, mapTitleRatings } from './data.js';

const TTL = 10 * 60000;
const emptyTitles = () => ({ movie: new Map(), show: new Map() });

export function createRatingsApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
  let cache = null;
  let flight = null;
  let titleCache = null;
  let titleFlight = null;
  let generation = 0;
  function resetSession() { generation++; cache = null; flight = null; titleCache = null; titleFlight = null; }
  async function load() {
    if (!signedIn()) { resetSession(); return []; }
    if (cache && cache.until > now()) return cache.items;
    if (flight) return flight;
    const epoch = generation;
    const pending = (async () => {
      const rows = await auth('GET', '/sync/ratings/episodes');
      if (epoch !== generation || !signedIn()) throw new Error('Ratings session changed.');
      if (!Array.isArray(rows)) throw new Error('Invalid ratings response.');
      const items = mapRatings(rows);
      cache = { items, until: now() + TTL };
      return items;
    })();
    flight = pending;
    try { return await pending; }
    finally { if (flight === pending) flight = null; }
  }
  /** Your movie and show ratings as Maps keyed by Trakt id; separate from the episode cache above. */
  async function loadTitles() {
    if (!signedIn()) { resetSession(); return emptyTitles(); }
    if (titleCache && titleCache.until > now()) return titleCache.titles;
    if (titleFlight) return titleFlight;
    const epoch = generation;
    const pending = (async () => {
      const [movies, shows] = await Promise.all([auth('GET', '/sync/ratings/movies'), auth('GET', '/sync/ratings/shows')]);
      if (epoch !== generation || !signedIn()) throw new Error('Ratings session changed.');
      if (!Array.isArray(movies) || !Array.isArray(shows)) throw new Error('Invalid ratings response.');
      const titles = { movie: mapTitleRatings(movies, 'movie'), show: mapTitleRatings(shows, 'show') };
      titleCache = { titles, until: now() + TTL };
      return titles;
    })();
    titleFlight = pending;
    try { return await pending; }
    finally { if (titleFlight === pending) titleFlight = null; }
  }
  return { load, loadTitles, resetSession };
}
export const ratingsApi = createRatingsApi();
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', ratingsApi.resetSession);
