/** Trakt API client. Public GETs only for now; auth arrives in a later step. */
import { API, CACHE_TTL } from '../config.js';
import { getJSON, HttpError } from '../core/http.js';
import { getClientId } from '../settings.js';
import { youtubeId } from '../core/text.js';

export class MissingClientIdError extends Error {
  constructor() {
    super('No Trakt API client ID configured');
    this.name = 'MissingClientIdError';
  }
}

function apiGet(path, { ttl = CACHE_TTL } = {}) {
  const clientId = getClientId();
  if (!clientId) return Promise.reject(new MissingClientIdError());

  return getJSON(`${API.base}${path}`, {
    ttl,
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': API.version,
      'trakt-api-key': clientId,
    },
  });
}

/**
 * Videos for a title, newest-first preference: official YouTube trailer, then
 * any YouTube trailer, then any YouTube clip.
 */
export async function getTrailer(kind, id) {
  const plural = kind === 'show' ? 'shows' : 'movies';
  const videos = await apiGet(`/${plural}/${encodeURIComponent(id)}/videos`);
  if (!Array.isArray(videos)) return null;

  const youtube = videos.filter((video) => String(video.site).toLowerCase() === 'youtube' && youtubeId(video.url));
  const pick =
    youtube.find((v) => /trailer/i.test(v.type) && v.official) ||
    youtube.find((v) => /trailer/i.test(v.type)) ||
    youtube[0];

  if (!pick) return null;
  return { key: youtubeId(pick.url), title: pick.title || 'Trailer' };
}

/** Seasons with their aired episode counts (season 0 is specials). */
export async function getSeasons(id) {
  const seasons = await apiGet(`/shows/${encodeURIComponent(id)}/seasons`);
  if (!Array.isArray(seasons)) return [];
  return seasons
    .filter((season) => Number.isInteger(season.number))
    .map((season) => ({
      number: season.number,
      episodes: Number.isInteger(season.aired_episodes) ? season.aired_episodes : null,
    }))
    .sort((a, b) => a.number - b.number);
}

export function isAuthError(error) {
  return error instanceof MissingClientIdError || (error instanceof HttpError && error.status === 401);
}
