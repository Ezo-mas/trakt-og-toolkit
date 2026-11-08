import { apiGet } from '../../core/trakt.js';

/** The show behind a season or episode page. The basic response already has its title, year and external ids. */
export function getShowDetails(id) {
  return apiGet(`/shows/${encodeURIComponent(id)}`);
}

/** One episode by its show, season and number. The basic response carries the episode's own external ids. */
export function getEpisode(id, season, episode) {
  return apiGet(`/shows/${encodeURIComponent(id)}/seasons/${season}/episodes/${episode}`);
}
