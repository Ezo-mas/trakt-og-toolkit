import { apiGet, apiAuth, isSignedIn } from '../../core/trakt.js';
import { watchlistLookup, watchlistBody } from './data.js';

export function createWatchlistApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn } = {}) {
  return {
    async add(route, { active = () => true } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const lookup = watchlistLookup(route);
      if (!lookup) throw new Error('Unsupported watchlist page.');
      if (!active()) return { cancelled: true };
      const body = watchlistBody(lookup, await get(lookup.path));
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
      return { cancelled: false };
    },
  };
}

export const watchlistApi = createWatchlistApi();
