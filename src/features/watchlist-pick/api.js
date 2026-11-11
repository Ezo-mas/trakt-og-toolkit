/** Watchlist reads through the toolkit's sign-in or og's session, with a public fallback. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';
import { apiType } from './data.js';

export const PAGE_SIZE = 100;
/** Bound the number of requests for large watchlists. */
export const MAX_PAGES = 50;
export const MAX_ITEMS = PAGE_SIZE * MAX_PAGES;

function watchlistPath(user, display) {
  const type = apiType(display);
  return `/users/${encodeURIComponent(user)}/watchlist${type ? `/${type}` : ''}`;
}

export function createWatchlistApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  return {
    /** Read pages in API order, using the page count when Trakt sends it. */
    async list(user, { display = null } = {}) {
      const path = watchlistPath(user, display);

      const authenticated = signedIn();
      const rows = [];
      let total = null;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data, pages } = authenticated
          ? await authPage(path, { page, limit: PAGE_SIZE })
          // The picker owns freshness; the public transport returns only the body.
          : { data: await get(`${path}?page=${page}&limit=${PAGE_SIZE}`, { ttl: 0 }) };
        if (Number.isSafeInteger(pages) && pages > 0) total = Math.max(total ?? 0, pages);
        if (!Array.isArray(data) || (!data.length && total > 1)) throw new Error('Incomplete Trakt watchlist response.');
        rows.push(...data);
        if (total == null ? data.length < PAGE_SIZE : page >= total) return { rows, limited: false };
      }
      return { rows, limited: true };
    },
  };
}

export const watchlistApi = createWatchlistApi();
