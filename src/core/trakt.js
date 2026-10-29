/** Trakt API client. Public GETs only for now; auth arrives in a later step. */
import { API, CACHE_TTL } from '../config.js';
import { getJSON } from './http.js';
import { getClientId } from '../settings.js';

export class MissingClientIdError extends Error {
  constructor() {
    super('No Trakt API client ID configured');
    this.name = 'MissingClientIdError';
  }
}

/** GET a public Trakt API path (e.g. `/shows/1388/seasons`), cached for `ttl` ms. */
export function apiGet(path, { ttl = CACHE_TTL } = {}) {
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

/** Seasons with their episode counts (season 0 is specials). `extended=full` is what adds the counts. */
export async function getSeasons(id) {
  const seasons = await apiGet(`/shows/${encodeURIComponent(id)}/seasons?extended=full`);
  if (!Array.isArray(seasons)) return [];
  return seasons
    .filter((season) => Number.isInteger(season.number))
    .map((season) => ({
      number: season.number,
      episodes: Number.isInteger(season.episode_count)
        ? season.episode_count
        : Number.isInteger(season.aired_episodes)
          ? season.aired_episodes
          : null,
    }))
    .sort((a, b) => a.number - b.number);
}

/** Cheap round-trip used by the menu's connection test. */
export async function ping() {
  const started = Date.now();
  await apiGet('/shows/breaking-bad', { ttl: 0 });
  return Date.now() - started;
}
