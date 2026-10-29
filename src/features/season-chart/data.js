import { text } from '../../core/dom.js';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 180;
const PLOT = { left: 38, right: 12, top: 12, bottom: 30 };

function episodeNumber(value) {
  const match = value.match(/x\s*(\d+)\s*$/i);
  return match ? Number(match[1]) : null;
}

function percent(value) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function sortEpisodes(episodes) {
  return episodes.sort((a, b) => a.number - b.number);
}

/** Read the rendered episode rows, which og may have sorted by another field. */
export function readSeasonEpisodes(doc) {
  const episodes = [];

  for (const row of doc.querySelectorAll('section.episodes article.row')) {
    const heading = row.querySelector('.titles h3');
    const number = episodeNumber(text(heading?.querySelector('.number')));
    const links = heading?.querySelectorAll('a') || [];
    const titleLink = links[links.length - 1];
    if (number == null || !titleLink) continue;

    episodes.push({
      number,
      title: text(titleLink),
      rating: percent(text(row.querySelector('.rating-trigger .value'))),
      votes: null,
      href: titleLink.getAttribute('href'),
    });
  }

  return sortEpisodes(episodes);
}

/** Map Trakt's 0–10 ratings to percentages, keeping page links when available. */
export function mapApiEpisodes(episodes, { showId, season, fallback = [] }) {
  const fallbackByNumber = new Map(fallback.map((item) => [item.number, item]));
  const mapped = [];

  for (const episode of Array.isArray(episodes) ? episodes : []) {
    const number = Number(episode.number);
    if (!Number.isInteger(number)) continue;

    const rendered = fallbackByNumber.get(number);
    const rating = episode.rating == null ? null : Number(episode.rating) * 10;
    const href = rendered?.href ||
      `/shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(season)}/episodes/${number}`;
    mapped.push({
      number,
      title: episode.title || rendered?.title || '',
      rating: Number.isFinite(rating) ? rating : null,
      votes: episode.votes == null ? null : Number(episode.votes),
      href,
    });
  }

  return sortEpisodes(mapped);
}

/** Rated episodes appear on the line; low-vote ratings remain visible as hollow dots. */
export function ratedEpisodes(episodes) {
  return episodes
    .filter((episode) => Number.isFinite(episode.rating) && episode.rating > 0)
    .sort((a, b) => a.number - b.number);
}

/** Low-vote ratings do not affect the average; unknown vote counts use a plain mean. */
export function averageRating(episodes) {
  const included = ratedEpisodes(episodes).filter((episode) => episode.votes == null || episode.votes >= 10);
  if (!included.length) return null;

  if (included.every((episode) => Number.isFinite(episode.votes))) {
    const votes = included.reduce((sum, episode) => sum + episode.votes, 0);
    if (votes) {
      return included.reduce((sum, episode) => sum + episode.rating * episode.votes, 0) / votes;
    }
  }

  return included.reduce((sum, episode) => sum + episode.rating, 0) / included.length;
}

/** Keep the chart on a shared scale, zooming only below 50% in ten-point steps. */
export function axisBottom(episodes) {
  const rated = ratedEpisodes(episodes);
  if (!rated.length) return 50;
  const lowest = Math.min(...rated.map((episode) => episode.rating));
  return Math.min(50, Math.floor(lowest / 10) * 10);
}

/** SVG coordinates for a 720×180 chart. X positions follow episode numbers. */
export function chartGeometry(episodes, allEpisodes = episodes, average = averageRating(episodes)) {
  const rated = ratedEpisodes(episodes);
  const allNumbers = allEpisodes.map((episode) => episode.number).filter(Number.isFinite);
  const first = allNumbers.length ? Math.min(...allNumbers) : 1;
  const last = allNumbers.length ? Math.max(...allNumbers) : first;
  const bottom = axisBottom(rated);
  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const x = (number) =>
    PLOT.left + (last === first ? plotWidth / 2 : ((number - first) / (last - first)) * plotWidth);
  const y = (rating) => PLOT.top + ((100 - rating) / (100 - bottom)) * plotHeight;

  return {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    plot: PLOT,
    axisBottom: bottom,
    ticks: Array.from({ length: (100 - bottom) / 10 + 1 }, (_, i) => bottom + i * 10),
    points: rated.map((episode) => ({ episode, x: x(episode.number), y: y(episode.rating) })),
    averageY: average == null ? null : y(average),
  };
}
