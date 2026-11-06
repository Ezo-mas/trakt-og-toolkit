/** Pure mapping of Trakt playback entries; IDs belong to playback, not media. */
const DAY = 24 * 60 * 60 * 1000;
const MOVIE_IDS = ['trakt', 'slug', 'imdb', 'tmdb'];
export const EPISODE_IDS = ['trakt', 'imdb', 'tmdb', 'tvdb'];

/** One identifying id is enough; prefer the most specific stable one. */
export function pickIds(ids, keys) {
  if (!ids || typeof ids !== 'object') return null;
  for (const key of keys) {
    const value = ids[key];
    const valid = key === 'trakt' || key === 'tmdb' || key === 'tvdb'
      ? Number.isSafeInteger(value) && value > 0
      : typeof value === 'string' && value.trim() !== '';
    if (valid) return { [key]: typeof value === 'string' ? value.trim() : value };
  }
  return null;
}

/**
 * A finite 1–100 percentage, normalized to one decimal; empty/other input is invalid. Trakt ignores scrobbles under
 * 1% (422), and start has already removed the old progress by then, so 0 is refused up front (Clear removes it).
 */
export function normalizeProgress(value) {
  if (value == null || typeof value === 'string' && value.trim() === '') return null;
  const progress = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(progress)) return null;
  const rounded = Math.round(progress * 10) / 10;
  return rounded >= 1 && rounded <= 100 ? rounded : null;
}

function posterUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value.startsWith('https://') ? value : `https://${value}`);
    return url.protocol === 'https:' && url.hostname === 'media.trakt.tv' ? url.href : null;
  } catch { return null; }
}

export function mapPlayback(rows, kind) {
  const mapped = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const media = kind === 'movie' ? row?.movie : row?.show;
    const episode = row?.episode;
    if (!Number.isSafeInteger(row?.id) || row.id <= 0 || !media?.ids ||
        typeof row.progress !== 'number' || !Number.isFinite(row.progress) || row.progress < 0 || row.progress > 100 ||
        !Number.isFinite(Date.parse(row.paused_at))) continue;
    if (kind === 'episode' && (!Number.isInteger(episode?.season) || episode.season < 0 ||
        !Number.isInteger(episode?.number) || episode.number < 1)) continue;
    const slug = media.ids.slug || media.ids.trakt;
    if (!slug) continue;
    const root = `/${kind === 'movie' ? 'movies' : 'shows'}/${encodeURIComponent(slug)}`;
    mapped.push({
      id: row.id, kind, ids: { ...media.ids },
      year: Number.isInteger(media.year) ? media.year : null,
      episodeIds: kind === 'episode' && episode.ids && typeof episode.ids === 'object' ? { ...episode.ids } : null,
      season: kind === 'episode' ? episode.season : null,
      episode: kind === 'episode' ? episode.number : null,
      title: kind === 'movie' ? (media.title || 'Untitled movie') :
        `${media.title || 'Untitled show'} · ${episode.season}×${String(episode.number).padStart(2, '0')} · ${episode.title || 'Untitled episode'}`,
      href: kind === 'movie' ? root : `${root}/seasons/${episode.season}/episodes/${episode.number}`,
      poster: posterUrl(media.images?.poster?.[0]),
      progress: row.progress, pausedAt: row.paused_at, pausedMs: Date.parse(row.paused_at),
    });
  }
  return sortPlayback(mapped);
}

export function sortPlayback(items) {
  return [...items].sort((a, b) => b.pausedMs - a.pausedMs || a.id - b.id);
}

/** Strictly older than the cutoff, with invalid/negative input selecting nothing. */
export function olderThan(items, days, now = Date.now()) {
  if (String(days).trim() === '' || !Number.isFinite(Number(days)) || Number(days) < 0) return [];
  const cutoff = now - Number(days) * DAY;
  return items.filter((item) => Number.isFinite(item.pausedMs) && item.pausedMs < cutoff);
}

/** The scrobble contract takes the movie's title/year or the episode's ids. */
export function scrobbleBody(item, progress, episodeIds = null) {
  const value = normalizeProgress(progress);
  if (!item || value == null) throw new Error('Invalid progress.');
  if (item.kind === 'movie') {
    const ids = pickIds(item.ids, MOVIE_IDS);
    if (!ids) throw new Error('Could not identify this title.');
    const movie = { ids };
    if (typeof item.title === 'string' && item.title.trim()) movie.title = item.title.trim();
    if (Number.isInteger(item.year)) movie.year = item.year;
    return { movie, progress: value };
  }
  const ids = pickIds(episodeIds ?? item.episodeIds, EPISODE_IDS);
  if (!ids) throw new Error('Could not identify this episode.');
  return { episode: { ids }, progress: value };
}

export function matchesRoute(item, route) {
  const kind = route.name === 'episode' ? 'episode' : route.kind;
  return item.kind === kind &&
    [item.ids.slug, item.ids.trakt].some((id) => id != null && String(id) === route.id) &&
    (kind !== 'episode' || item.season === route.season && item.episode === route.episode);
}
