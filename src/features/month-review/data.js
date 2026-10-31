export function lastMonth(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start: start.toISOString(), end: end.toISOString(), year: start.getFullYear(),
    month: start.getMonth() + 1, key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    label: start.toLocaleString(undefined, { month: 'long' }) };
}
export function inMonth(value, span) {
  const time = Date.parse(value);
  return time >= Date.parse(span.start) && time < Date.parse(span.end);
}
export function summarize(history, ratings, comments, span) {
  const plays = history.filter((row) => inMonth(row.watched_at, span));
  const first = plays.reduce((a, b) => !a || Date.parse(b.watched_at) < Date.parse(a.watched_at) ? b : a, null);
  const minutes = plays.reduce((sum, row) => {
    const runtime = (row.episode || row.movie)?.runtime;
    return sum + (Number.isFinite(runtime) && runtime > 0 ? runtime : 0);
  }, 0);
  return { plays: plays.length, hours: Math.round(minutes / 60),
    ratings: ratings.filter((row) => inMonth(row.rated_at, span)).length,
    comments: comments.filter((row) => inMonth(row.comment?.created_at ?? row.created_at, span)).length, first };
}
export function fanart(first) {
  const raw = (first?.show || first?.movie)?.images?.fanart?.[0];
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw.startsWith('https://') ? raw : `https://${raw}`);
    return url.protocol === 'https:' && url.hostname === 'media.trakt.tv' ? url.href : null;
  } catch { return null; }
}
export function freshCache(entry, now) {
  return entry && (now.getDate() > 7 || now.getTime() - entry.savedAt < 86400000);
}
