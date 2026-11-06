import { apiAuth, isSignedIn } from '../../core/trakt.js';
import { mapRatings } from './data.js';

export function createRatingsApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
  let cache = null;
  let flight = null;
  let generation = 0;
  function resetSession() { generation++; cache = null; flight = null; }
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
      cache = { items, until: now() + 10 * 60000 };
      return items;
    })();
    flight = pending;
    try { return await pending; }
    finally { if (flight === pending) flight = null; }
  }
  return { load, resetSession };
}
export const ratingsApi = createRatingsApi();
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', ratingsApi.resetSession);
