import { apiGet } from '../../core/trakt.js';

/** Episodes and community ratings for one season. */
export async function getSeasonEpisodes(id, season) {
  const episodes = await apiGet(
    `/shows/${encodeURIComponent(id)}/seasons/${encodeURIComponent(season)}?extended=full`,
  );
  return Array.isArray(episodes) ? episodes : [];
}
