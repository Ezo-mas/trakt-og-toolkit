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
    owner: { slug: ownerSlug, name: ownerName(raw.user) },
    itemCount: count(raw.item_count),
    likes: count(raw.likes),
    // One poster is enough for the compact row; liked lists normally come without any.
    poster: posterUrl(images[0]),
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
  return `/users/${encodeURIComponent(list.owner.slug)}/lists/${encodeURIComponent(list.slug)}`;
}

export function itemCountLabel(value) {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return `${value} ${value === 1 ? 'item' : 'items'}`;
}
