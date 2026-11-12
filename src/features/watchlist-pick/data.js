/**
 * Pure readers and transforms for the watchlist picker.
 *
 * og filters its watchlist with `?display=movie|show|season|episode` (the old `/watchlist/movies` path 301s to the
 * bare page). The API uses plural types and wraps each entry as `{ type, movie|show|season|episode, show?, ... }`.
 */
import { titleOf, usableId, yearOf } from '../../core/entities.js';

const DISPLAY_TO_API = { movie: 'movies', show: 'shows', season: 'seasons', episode: 'episodes' };
const SINGULAR = new Set(Object.keys(DISPLAY_TO_API));

/** The page's media filter, singular, or null for All. A path type is accepted as a fallback. */
export function watchlistType(search = '', pathType = null) {
  let value = pathType;
  try {
    value = new URLSearchParams(search).get('display') || pathType;
  } catch {
    /* fall back to the path */
  }
  if (typeof value !== 'string') return null;
  const singular = value.trim().toLowerCase().replace(/s$/, '');
  return SINGULAR.has(singular) ? singular : null;
}

/** The API path segment for a display filter. */
export function apiType(display) {
  return display ? DISPLAY_TO_API[display] ?? null : null;
}

function mediaHref(kind, id) {
  return `/${kind === 'movie' ? 'movies' : 'shows'}/${encodeURIComponent(id)}`;
}

/**
 * One API entry as the picker uses it, or null when it cannot be linked. Seasons and episodes carry their show in
 * `show`; seasons from the API wrap their own number and ids in `season`, while episodes use `episode`.
 */
export function normalizeWatchlistItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = raw.type;
  if (!SINGULAR.has(kind)) return null;
  const entity = raw[kind];
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) return null;

  if (kind === 'movie' || kind === 'show') {
    const title = titleOf(entity);
    const id = usableId(entity.ids?.slug) ?? usableId(entity.ids?.trakt);
    if (!title || !id) return null;
    return {
      key: `${kind}:${id}`,
      kind,
      title,
      year: yearOf(entity),
      subtitle: null,
      href: mediaHref(kind, id),
    };
  }

  const show = raw.show ?? entity.show;
  const showTitle = titleOf(show);
  const showId = usableId(show?.ids?.slug) ?? usableId(show?.ids?.trakt);
  if (!showTitle || !showId) return null;

  if (kind === 'season') {
    const number = entity.number;
    if (!Number.isSafeInteger(number) || number < 0) return null;
    return {
      key: `season:${showId}:${number}`,
      kind,
      title: showTitle,
      year: yearOf(show),
      subtitle: `Season ${number}`,
      href: `/shows/${encodeURIComponent(showId)}/seasons/${number}`,
    };
  }

  const season = entity.season;
  const episode = entity.number;
  if (!Number.isSafeInteger(season) || season < 0 || !Number.isSafeInteger(episode) || episode < 1) return null;
  const episodeTitle = titleOf(entity);
  return {
    key: `episode:${showId}:${season}:${episode}`,
    kind,
    title: showTitle,
    year: yearOf(show),
    subtitle: `S${season}E${episode}${episodeTitle ? ` · ${episodeTitle}` : ''}`,
    href: `/shows/${encodeURIComponent(showId)}/seasons/${season}/episodes/${episode}`,
  };
}

/** A whole watchlist response, dropping entries the picker cannot use. */
export function watchlistItems(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeWatchlistItem).filter(Boolean);
}

/** The result's link text: title with its year, plus a season/episode suffix when there is one. */
export function watchlistLabel(item) {
  if (!item) return '';
  const title = item.year ? `${item.title} (${item.year})` : item.title;
  return item.subtitle ? `${title} — ${item.subtitle}` : title;
}

/**
 * Pick one item uniformly. When there is a previous pick and more than one candidate, sample among the other items
 * so every title after the previous pick has the same chance. `random` returns a value in [0, 1).
 */
export function pickWatchlistItem(items, previousKey = null, random = Math.random) {
  const candidates = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!candidates.length) return null;
  let pool = candidates;
  if (previousKey != null && candidates.length > 1) {
    const others = candidates.filter((item) => item.key !== previousKey);
    // If duplicate keys filled the whole list, keep the full pool rather than return nothing.
    if (others.length) pool = others;
  }
  return pool[Math.floor(random() * pool.length)];
}
