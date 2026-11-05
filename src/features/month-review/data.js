export function monthSpan(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start: start.toISOString(), end: end.toISOString(), year: start.getFullYear(),
    month: start.getMonth() + 1, key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    // og is English-only; match it whatever the browser language.
    label: start.toLocaleString('en-US', { month: 'long' }) };
}
export function lastMonth(now = new Date()) {
  return monthSpan(now.getFullYear(), now.getMonth());
}
export function shiftMonth(span, delta) {
  const date = new Date(span.year, span.month - 1 + delta, 1);
  return monthSpan(date.getFullYear(), date.getMonth() + 1);
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
    if (url.protocol !== 'https:' || url.hostname !== 'media.trakt.tv') return null;
    // The API hands out the 1280px "medium" size; the card spans the page, so use the 1920px "full" one.
    url.pathname = url.pathname.replace('/fanarts/medium/', '/fanarts/full/');
    return url.href;
  } catch { return null; }
}
export function freshCache(entry, now) {
  return entry && (now.getDate() > 7 || now.getTime() - entry.savedAt < 86400000);
}
/** Earlier months are settled; the last month can still gain late syncs early in a month. */
export function monthCacheFresh(entry, span, now = new Date()) {
  return Boolean(entry) && (span.key < lastMonth(now).key || freshCache(entry, now));
}
