/** Public list indexes. Both endpoints are readable without signing in. */
import { apiGet } from '../../core/trakt.js';

function userPath(id) {
  return `/users/${encodeURIComponent(id)}`;
}

export function getCollaborationLists(id) {
  return apiGet(`${userPath(id)}/lists/collaborations?extended=images`);
}

export function getLikedLists(id) {
  return apiGet(`${userPath(id)}/likes/lists?extended=images`);
}
