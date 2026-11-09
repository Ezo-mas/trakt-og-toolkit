/**
 * Pure helpers for the compact Trakt ratings chart on summary pages (feature 31).
 *
 * The API returns `{ rating, votes, distribution: { "1": n, …, "10": n } }` for movies, shows and
 * episodes. Season ratings come wrapped as `{ trakt: { … }, tmdb: …, imdb: … }`.
 */

/** Trakt's names for each score, as og's stats page labels them. */
export const RATING_NAMES = [
  'Weak Sauce :(', 'Terrible', 'Bad', 'Poor', 'Meh', 'Fair', 'Good', 'Great', 'Superb', 'Totally Ninja!',
];

/** Below this, a distribution says more about who happened to vote than about the title. */
export const MIN_VOTES = 10;

/** Fixed heights (px, CSS `block-size`): the chart, the gap above it, and the stat tiles with their gap. */
export const CHART_HEIGHT = 104;
export const CHART_GAP = 20;
export const TILES_HEIGHT = 60;
export const TILES_GAP = 16;

/** The API path of a summary route (`/movies/:id`, `/shows/:id/seasons/:s/episodes/:e`, …), or null. */
function apiBase(route) {
  if (!route?.id) return null;
  const id = encodeURIComponent(route.id);
  if (route.kind === 'movie' && route.name === 'title') return `/movies/${id}`;
  if (route.kind !== 'show') return null;
  if (route.name === 'title') return `/shows/${id}`;
  if (route.name === 'season' && Number.isInteger(route.season)) return `/shows/${id}/seasons/${route.season}`;
  if (route.name === 'episode' && Number.isInteger(route.season) && Number.isInteger(route.episode)) {
    return `/shows/${id}/seasons/${route.season}/episodes/${route.episode}`;
  }
  return null;
}

/** The ratings endpoint for a summary route, or null when the route has none. */
export function ratingsPath(route) {
  const base = apiBase(route);
  return base ? `${base}/ratings` : null;
}

/** The matching stats endpoint (watchers, plays, …), used only for the votes tile's watcher share. */
export function statsPath(route) {
  const base = apiBase(route);
  return base ? `${base}/stats` : null;
}

/** og's stats page for the same title, season or episode. */
export function statsHref(route) {
  return route?.path ? `${route.path.replace(/\/+$/, '')}/stats` : null;
}

/**
 * `{ rating, votes, counts: [10 numbers] }` from either response shape, or null when it is unusable or has
 * too few votes to chart.
 */
export function parseRatings(payload) {
  const source = payload && typeof payload === 'object' && payload.trakt && typeof payload.trakt === 'object'
    ? payload.trakt
    : payload;
  if (!source || typeof source !== 'object') return null;

  const distribution = source.distribution;
  if (!distribution || typeof distribution !== 'object') return null;
  const counts = [];
  for (let score = 1; score <= 10; score++) {
    const value = Number(distribution[score] ?? distribution[String(score)] ?? 0);
    counts.push(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
  }

  const total = counts.reduce((sum, count) => sum + count, 0);
  const votes = Number.isFinite(Number(source.votes)) && Number(source.votes) > 0 ? Math.round(Number(source.votes)) : total;
  if (votes < MIN_VOTES || total === 0) return null;

  const fallbackAverage = counts.reduce((sum, count, index) => sum + count * (index + 1), 0) / total;
  const rating = Number(source.rating);
  const average = Number.isFinite(rating) && rating >= 1 && rating <= 10 ? rating : fallbackAverage;
  return { rating: average, votes, counts };
}

/** The score with the most votes (the highest score wins a tie). */
export function mostGiven(counts) {
  let best = 0;
  counts.forEach((count, index) => { if (count >= counts[best]) best = index; });
  return best + 1;
}

/** Bar heights as fractions of the tallest bar; any non-zero count stays visible. */
export function barHeights(counts, minimum = 0.04) {
  const max = Math.max(...counts, 0);
  return counts.map((count) => (count && max ? Math.max(count / max, minimum) : 0));
}

/** Horizontal position (0–1) of the average across ten equal columns, centred on each score. */
export function averagePosition(rating) {
  const clamped = Math.min(10, Math.max(1, rating));
  return (clamped - 0.5) / 10;
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en-US');

/** Counts above the bars stay short: 1,512 → "1,512", 25,111 → "25.1K". */
export function shortCount(count) {
  return count >= 10000 ? compact.format(count) : full.format(count);
}

export function fullCount(count) {
  return full.format(count);
}

/** og's bar shades, measured on its stats page (2026-11-09): grey at 1 to red at 10. */
export const BAR_COLORS = [
  '#616161', '#675b5b', '#705252', '#7a4747', '#863c3c', '#922f30', '#9e2424', '#a81918', '#b11010', '#b70a0a',
];

/**
 * How much of the section fits the empty space in og's details column: `'full'` (chart and stat tiles),
 * `'chart'`, or null. `contentBottom` is where og's own details content ends and `columnBottom` where the
 * action stack's content ends (both page px); `sideBySide` is false when og stacks the two columns. Showing only what fits means og's grid row never grows, so
 * nothing of og's moves.
 */
export function layoutFor({ contentBottom, columnBottom, sideBySide = true }) {
  // Below 992px og stacks the action stack under the details column; its height is then no gap at all.
  if (!sideBySide) return null;
  if (![contentBottom, columnBottom].every(Number.isFinite)) return null;
  const space = columnBottom - contentBottom;
  if (space >= CHART_GAP + CHART_HEIGHT + TILES_GAP + TILES_HEIGHT) return 'full';
  if (space >= CHART_GAP + CHART_HEIGHT) return 'chart';
  return null;
}

/**
 * The four tiles og's stats page shows under its chart, worked out from the distribution:
 * Rating (the average as a percentage and its name), Votes (with the watcher share when known),
 * Most given, and Liked it (share of 7 or higher).
 */
export function statTiles({ rating, votes, counts }, watchers = null) {
  const total = counts.reduce((sum, count) => sum + count, 0) || votes;
  const top = mostGiven(counts);
  const liked = counts.slice(6).reduce((sum, count) => sum + count, 0);
  // og rounds shares (3,984 of 5,029 is "79%") but truncates the rating: 8.79 is "87%", named for 8 ("Great").
  const share = (part, whole, digits = 0) => `${(Math.round((part / whole) * 100 * 10 ** digits) / 10 ** digits).toFixed(digits)}%`;
  // Watcher shares keep a decimal only under 10%: "5.5% of watchers", but "21% of watchers".
  const watcherShare = (part, whole) => share(part, whole, (part / whole) * 100 < 9.95 ? 1 : 0);
  return [
    { name: 'Rating', value: `${Math.floor(rating * 10)}%`, note: RATING_NAMES[Math.min(10, Math.max(1, Math.trunc(rating))) - 1], accent: true },
    {
      name: 'Votes',
      value: fullCount(votes),
      note: Number.isFinite(watchers) && watchers >= votes && watchers > 0 ? `${watcherShare(votes, watchers)} of watchers` : '',
      accent: false,
    },
    { name: 'Most given', value: String(top), suffix: RATING_NAMES[top - 1], note: `${share(counts[top - 1], total)} of ${fullCount(total)} votes`, accent: true },
    { name: 'Liked it', value: share(liked, total), note: 'gave it 7 or higher', accent: true },
  ];
}

/** One line for screen readers and the link's name. */
export function chartLabel({ rating, votes }) {
  return `Trakt ratings: ${rating.toFixed(2)} average from ${fullCount(votes)} votes. Open the full stats.`;
}
