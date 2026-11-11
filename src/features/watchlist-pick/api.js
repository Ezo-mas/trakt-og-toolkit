/** Watchlist reads through the toolkit's sign-in or og's session, with a public fallback. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';
import { apiType } from './data.js';

export const PAGE_SIZE = 100;
/** Bound the number of requests for large watchlists. */
export const MAX_PAGES = 50;
export const MAX_ITEMS = PAGE_SIZE * MAX_PAGES;
/** Pages read at once once the page count is known: quicker than one by one, without a burst of requests. */
export const BATCH = 4;

function watchlistPath(user, display) {
  const type = apiType(display);
  return `/users/${encodeURIComponent(user)}/watchlist${type ? `/${type}` : ''}`;
}

export function createWatchlistApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  return {
    /**
     * Read pages in API order. Once Trakt sends a page count, the remaining pages are read `BATCH` at a time;
     * without one, pages are read one by one until a short page.
     */
    async list(user, { display = null } = {}) {
      const path = watchlistPath(user, display);
      const authenticated = signedIn();
      const read = async (page, limit = PAGE_SIZE) => {
        // The picker owns freshness; the public transport returns only the body.
        if (!authenticated) return { data: await get(`${path}?page=${page}&limit=${limit}`, { ttl: 0 }), pages: null };
        // An empty body or 204 comes back as null: an empty page, not a failure.
        return (await authPage(path, { page, limit })) ?? { data: [], pages: null };
      };

      const rows = [];
      let total = null;
      let page = 1;
      while (page <= MAX_PAGES) {
        const last = total == null ? page : Math.min(total, MAX_PAGES, page + BATCH - 1);
        const numbers = Array.from({ length: last - page + 1 }, (_, index) => page + index);
        const results = await Promise.all(numbers.map((number) => read(number)));
        for (const [index, { data, pages }] of results.entries()) {
          const number = numbers[index];
          if (Number.isSafeInteger(pages) && pages > 0) total = Math.max(total ?? 0, pages);
          if (!Array.isArray(data) || (!data.length && total > number)) {
            throw new Error('Incomplete Trakt watchlist response.');
          }
          rows.push(...data);
          if (total == null ? data.length < PAGE_SIZE : number >= total) return { rows, limited: false };
        }
        page = last + 1;
      }
      if (total != null) return { rows, limited: true };
      // No page count and every page was full: one entry past the limit says whether anything was left out.
      const { data } = await read(MAX_ITEMS + 1, 1);
      return { rows, limited: Array.isArray(data) && data.length > 0 };
    },
  };
}

export const watchlistApi = createWatchlistApi();
