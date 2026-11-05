import { apiGet, apiAuth, isSignedIn } from '../../core/trakt.js';
import { watchlistLookup, watchlistBody, watchlistBulkBody, watchlistBulkItems } from './data.js';

/** A whole credits page can be large; 100 keeps each sync payload comfortably bounded. */
const BULK_BATCH = 100;
const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;

export function createWatchlistApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn } = {}) {
  return {
    async add(route, { active = () => true } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const lookup = watchlistLookup(route);
      if (!lookup) throw new Error('Unsupported watchlist page.');
      if (!active()) return { cancelled: true };
      const data = await get(lookup.path);
      const body = watchlistBody(lookup, data);
      const item = lookup.type === 'seasons' ? data.find(season => season?.number === lookup.season) : data;
      const title = typeof item?.title === 'string' && item.title.trim() ? item.title.trim()
        : lookup.type === 'seasons' ? `Season ${lookup.season}` : 'this title';
      if (!active() || !signedIn()) return { cancelled: true };
      const result = await auth('POST', '/sync/watchlist', body);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find this title.');
      }
      // An existing entry is also confirmed by Trakt, without toggling it off.
      const counts = [result?.added?.[lookup.type], result?.existing?.[lookup.type]];
      if (!counts.some(count => Number.isSafeInteger(count) && count > 0)) {
        throw new Error('Trakt did not confirm a watchlist addition.');
      }
      // Existing entries must stay on the list, so they get no Undo.
      return { cancelled: false, title, body, undoable: Number.isSafeInteger(result?.added?.[lookup.type]) && result.added[lookup.type] > 0 };
    },

    /** Add every whole movie/show in one confirmed batch, using each route's slug. */
    async addMany(routes, { active = () => true } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      if (!active()) return { cancelled: true };
      const items = watchlistBulkItems(routes);
      if (!items.length) return { cancelled: false, sent: 0, added: 0, existing: 0, notFound: 0, succeededKeys: [] };
      let added = 0, existing = 0, notFound = 0;
      const missing = new Set();
      for (let start = 0; start < items.length; start += BULK_BATCH) {
        const batch = items.slice(start, start + BULK_BATCH);
        if (!active() || !signedIn()) return { cancelled: true };
        const result = await auth('POST', '/sync/watchlist', watchlistBulkBody(batch));
        if (!result || typeof result !== 'object') throw new Error('Trakt did not confirm watchlist additions.');
        let confirmed = 0;
        for (const type of ['movies', 'shows']) {
          const addedCount = count(result.added?.[type]);
          const existingCount = count(result.existing?.[type]);
          const missingItems = result.not_found?.[type];
          let missingCount = 0;
          if (Array.isArray(missingItems)) {
            missingCount = missingItems.length;
            for (const item of missingItems) {
              const slug = item?.ids?.slug;
              if (typeof slug === 'string' && slug) missing.add(`${type}:${slug}`);
            }
          } else missingCount = count(missingItems);
          added += addedCount;
          existing += existingCount;
          notFound += missingCount;
          confirmed += addedCount + existingCount + missingCount;
        }
        if (!confirmed) throw new Error('Trakt did not confirm watchlist additions.');
      }
      const succeededKeys = notFound === 0 ? items.map(item => item.key)
        : missing.size === notFound ? items.filter(item => !missing.has(`${item.type}:${item.slug}`)).map(item => item.key)
          : [];
      return { cancelled: false, sent: items.length, added, existing, notFound, succeededKeys };
    },

    /** Undo an addition with the exact body that was sent. */
    async remove(body, { active = () => true } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      if (!body || typeof body !== 'object' || !active()) return { cancelled: true };
      const result = await auth('POST', '/sync/watchlist/remove', body);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find this title.');
      }
      return { cancelled: false };
    },
  };
}

export const watchlistApi = createWatchlistApi();
