/** List indexes, read with the toolkit's sign-in when there is one (private lists), else publicly. */
import { apiAuth, apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';

// Same as og: liked lists come in pages of 250, at most ten of them.
const LIMIT = 250;
const MAX_PAGES = 10;

function userPath(id) {
  return `/users/${encodeURIComponent(id)}`;
}

/** Not paginated by the API. */
export function getCollaborationLists(id) {
  const path = `${userPath(id)}/lists/collaborations`;
  return isSignedIn() ? apiAuth('GET', path, undefined, { extended: 'images' }) : apiGet(`${path}?extended=images`);
}

/** Every page, newest first. */
export async function getLikedLists(id) {
  const path = `${userPath(id)}/likes/lists`;
  if (isSignedIn()) {
    const page = (n) => apiAuthPage(path, { extended: 'images', page: n, limit: LIMIT });
    const first = await page(1);
    const count = Math.min(first.pages ?? 1, MAX_PAGES);
    const rest = await Promise.all(Array.from({ length: count - 1 }, (_, i) => page(i + 2)));
    return [first, ...rest].flatMap((result) => (Array.isArray(result.data) ? result.data : []));
  }
  // The public cache drops pagination headers, so read until a short page.
  const rows = [];
  for (let n = 1; n <= MAX_PAGES; n++) {
    const page = await apiGet(`${path}?extended=images&page=${n}&limit=${LIMIT}`);
    if (!Array.isArray(page)) break;
    rows.push(...page);
    if (page.length < LIMIT) break;
  }
  return rows;
}

/** `/users/:id/likes/lists` sends empty posters; og reads them from each list's summary. */
export function getListSummary(id) {
  return apiGet(`/lists/${encodeURIComponent(id)}?extended=images`);
}

export function getViewer() {
  return apiAuth('GET', '/users/me');
}
