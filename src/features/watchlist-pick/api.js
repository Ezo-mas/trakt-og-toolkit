/** Watchlist reads through the toolkit's sign-in or og's session, with a public fallback. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';
import { PAGE_SIZE, readPages } from '../../core/pages.js';
import { apiType } from './data.js';

/** Bound the number of requests for large watchlists. */
export const MAX_PAGES = 50;
export const MAX_ITEMS = PAGE_SIZE * MAX_PAGES;
export { PAGE_SIZE };

function watchlistPath(user, display) {
  const type = apiType(display);
  return `/users/${encodeURIComponent(user)}/watchlist${type ? `/${type}` : ''}`;
}

export function createWatchlistApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  return {
    /** Every page in API order, up to `MAX_PAGES`; `limited` says the watchlist has more. */
    list(user, { display = null } = {}) {
      const path = watchlistPath(user, display);
      const authenticated = signedIn();
      // The picker owns freshness, so public reads skip the shared cache but keep the page count.
      const read = (page, limit) => (authenticated
        ? authPage(path, { page, limit })
        : get(`${path}?page=${page}&limit=${limit}`, { ttl: 0, withHeaders: true }));
      return readPages(read, { maxPages: MAX_PAGES });
    },
  };
}

export const watchlistApi = createWatchlistApi();
