/**
 * Pure readers and transforms for the all-lists panel.
 *
 * The public API answers `/users/:id/lists/collaborations` with list objects and
 * `/users/:id/likes/lists` with `{ liked_at, list }` wrappers. Both can contain
 * anything, so every field used in the UI is validated here.
 */

/** Only HTTPS images from Trakt's media host; anything else is left out. */
export function posterUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value.startsWith('https://') ? value : `https://${value}`);
    return url.protocol === 'https:' && url.hostname === 'media.trakt.tv' ? url.href : null;
  } catch {
    return null;
  }
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function ownerName(user) {
  return typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : user?.ids?.slug || user?.username || null;
}

/** og's label after an owner's name (`toVipBadge.ts`): staff outrank VIP; OG or EP tags a VIP. */
export function vipBadge(user) {
  if (user?.director === true) return { label: 'Director', tag: null };
  if (user?.vip !== true) return null;
  return { label: 'VIP', tag: user.vip_og === true ? 'OG' : user.vip_ep === true ? 'EP' : null };
}

/** One API list object as the panel uses it, or null when it has no usable link. */
export function normalizeList(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = count(raw.ids?.trakt);
  const slug = typeof raw.ids?.slug === 'string' ? raw.ids.slug : '';
  const ownerSlug = raw.user?.ids?.slug || raw.user?.username;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!id || !slug || typeof ownerSlug !== 'string' || !ownerSlug || !name) return null;

  const images = Array.isArray(raw.images?.posters) ? raw.images.posters : [];
  return {
    id,
    slug,
    name,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    owner: { slug: ownerSlug, name: ownerName(raw.user), avatar: posterUrl(raw.user?.images?.avatar?.full), vip: vipBadge(raw.user) },
    itemCount: count(raw.item_count),
    commentCount: raw.allow_comments === true ? count(raw.comment_count) : null,
    likes: count(raw.likes),
    allowComments: raw.allow_comments === true,
    privacy: typeof raw.privacy === 'string' ? raw.privacy : null,
    kind: raw.type === 'official' ? 'official' : 'personal',
    // OG fetches up to five posters from each list summary for its fan row.
    posters: images.slice(0, 5).map(posterUrl).filter(Boolean),
  };
}

/** `/users/:id/lists/collaborations` -> normalized rows. */
export function collaborationLists(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeList).filter(Boolean);
}

/** `/users/:id/likes/lists` -> normalized rows, keeping the API's newest-first order. */
export function likedLists(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry) => normalizeList(entry?.list))
    .filter(Boolean);
}

/** In-site link to a list, as og spells it. */
export function listHref(list) {
  if (list.kind === 'official') return `/lists/official/${encodeURIComponent(list.slug)}`;
  return `/users/${encodeURIComponent(list.owner.slug)}/lists/${encodeURIComponent(list.slug)}`;
}

/** OG's watched-progress route is scoped to the signed-in viewer, not the list owner. */
export function listProgressHref(list, viewerSlug) {
  if (!viewerSlug || list.kind === 'official') return null;
  return `/users/${encodeURIComponent(viewerSlug)}/progress?list=${encodeURIComponent(list.id)}`;
}

/** og's ListTag names: a list shared by link gets the blue Link tag, friends-only lists "Following". */
export function listPills(entry) {
  if (entry.kind === 'official') return ['Official List'];
  if (entry.privacy === 'private') return ['Private'];
  if (entry.privacy === 'friends') return ['Following'];
  if (entry.privacy === 'link') return ['Link'];
  return [];
}
