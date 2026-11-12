/** List indexes for the account signed in to og. */
import { apiAuth, apiAuthPage, apiGet } from '../../core/trakt.js';

// Same as og: liked lists come in pages of 250, at most ten of them.
const LIMIT = 250;
const MAX_PAGES = 10;

function userPath(id) {
  return `/users/${encodeURIComponent(id)}`;
}

/** Not paginated by the API. */
export function getCollaborationLists(id) {
  return apiAuth('GET', `${userPath(id)}/lists/collaborations`, undefined, { extended: 'images' });
}

/** Every page, newest first. */
export async function getLikedLists(id) {
  const path = `${userPath(id)}/likes/lists`;
  const page = (n) => apiAuthPage(path, { extended: 'images', page: n, limit: LIMIT });
  const first = await page(1);
  const count = Math.min(first?.pages ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: count - 1 }, (_, i) => page(i + 2)));
  return [first, ...rest].flatMap((result) => (Array.isArray(result?.data) ? result.data : []));
}

/** `/users/:id/likes/lists` sends empty posters; og reads them from each list's summary. */
export function getListSummary(id) {
  return apiGet(`/lists/${encodeURIComponent(id)}?extended=images`);
}

export function getViewer() {
  return apiAuth('GET', '/users/me');
}
