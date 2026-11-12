/** Watchlist reads through og's session. */
import { apiAuthPage } from '../../core/trakt.js';
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

export function createWatchlistApi({ authPage = apiAuthPage } = {}) {
  return {
    /** Every page in API order, up to `MAX_PAGES`; `limited` says the watchlist has more. */
    list(user, { display = null } = {}) {
      const path = watchlistPath(user, display);
      const read = (page, limit) => authPage(path, { page, limit });
      return readPages(read, { maxPages: MAX_PAGES });
    },
  };
}

export const watchlistApi = createWatchlistApi();
