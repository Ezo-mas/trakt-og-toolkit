/** Watchlist reads through the toolkit's sign-in or og's session, with a public fallback. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';
import { apiType } from './data.js';

export const PAGE_SIZE = 100;
/** A defensive cap for a public profile with an enormous watchlist (100 items per page). */
export const MAX_PAGES = 50;

function watchlistPath(user, display) {
  const type = apiType(display);
  return `/users/${encodeURIComponent(user)}/watchlist${type ? `/${type}` : ''}`;
}

export function createWatchlistApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  return {
    /** Every page, in og's order. Signed in, Trakt's page count bounds the reads. */
    async list(user, { display = null } = {}) {
      const path = watchlistPath(user, display);

      if (signedIn()) {
        const page = (number) => authPage(path, { page: number, limit: PAGE_SIZE });
        const first = await page(1);
        const pages = Math.min(Math.max(Number(first?.pages) || 1, 1), MAX_PAGES);
        const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => page(index + 2)));
        return [first, ...rest].flatMap((result) => (Array.isArray(result?.data) ? result.data : []));
      }

      // The public cache drops response headers, so read until a short page.
      const rows = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const data = await get(`${path}?page=${page}&limit=${PAGE_SIZE}`);
        if (!Array.isArray(data) || !data.length) break;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
      }
      return rows;
    },
  };
}

export const watchlistApi = createWatchlistApi();
