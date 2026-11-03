import { apiGet } from '../../core/trakt.js';

/** The show behind a season or episode page. The basic response already has its title, year and external ids. */
export function getShowDetails(id) {
  return apiGet(`/shows/${encodeURIComponent(id)}`);
}
