import { apiAuth, apiAuthPage, isSignedIn } from '../../core/trakt.js';
import { getPrivateValue, setPrivateValue, STORAGE } from '../../core/store.js';
import { lastMonth, monthCacheFresh, monthSpan, summarize } from './data.js';

export async function paginate(pageRequest, path, options = {}) {
  const rows = [];
  for (let page = 1; ; page++) {
    const result = await pageRequest(path, { ...options, page, limit: 100 });
    if (!Array.isArray(result.data)) throw new Error('Invalid review response.');
    rows.push(...result.data);
    if (result.pages !== null ? page >= result.pages : result.data.length < 100) return rows;
    if (page >= 10000) throw new Error('Review pagination limit reached.');
  }
}
let generation = 0;
const flights = new Map();
let firstFlight;
let firstMonth;
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', () => {
  generation++; flights.clear(); firstFlight = null; firstMonth = undefined;
});
function alive(epoch) {
  if (generation !== epoch || !isSignedIn()) throw new Error('Review session changed.');
}
export function loadReview(span = lastMonth(), now = new Date(), user = null) {
  const existing = flights.get(span.key);
  if (existing) return existing;
  const epoch = generation;
  const task = (async () => {
    let username = user;
    if (!username) {
      const profile = await apiAuth('GET', '/users/me');
      username = profile?.ids?.slug || profile?.username;
    }
    if (!username) throw new Error('Missing review user.');
    alive(epoch);
    // Hide dismisses the card until the next month, so only last month's load honors it.
    if (span.key === lastMonth(now).key && getPrivateValue(STORAGE.dismissedReview(username)) === span.key) return null;
    const key = STORAGE.monthReview(username, span.key);
    const cached = getPrivateValue(key);
    if (monthCacheFresh(cached, span, now)) return { ...cached.summary, user: username, span };
    const history = await paginate(apiAuthPage, '/sync/history', { start_at: span.start, end_at: span.end, extended: 'full,images' });
    alive(epoch);
    let summary = { plays: 0, hours: 0, ratings: 0, comments: 0, first: null };
    if (history.some((row) => Date.parse(row.watched_at) >= Date.parse(span.start) && Date.parse(row.watched_at) < Date.parse(span.end))) {
      // Ratings have no date filter; unpaginated, Trakt returns them all in one response instead of 100 per page.
      const [ratings, comments] = await Promise.all([
        apiAuth('GET', '/sync/ratings'), paginate(apiAuthPage, '/users/me/comments'),
      ]);
      if (!Array.isArray(ratings)) throw new Error('Invalid review response.');
      alive(epoch);
      summary = summarize(history, ratings, comments, span);
    }
    setPrivateValue(key, { savedAt: now.getTime(), summary });
    return { ...summary, user: username, span };
  })();
  flights.set(span.key, task);
  task.finally(() => { if (flights.get(span.key) === task) flights.delete(span.key); }).catch(() => {});
  return task;
}
/** The month holding the account's oldest play, for the previous arrow's stop. */
export function loadFirstMonth() {
  if (firstMonth !== undefined) return Promise.resolve(firstMonth);
  if (firstFlight) return firstFlight;
  const epoch = generation;
  const task = (async () => {
    const head = await apiAuthPage('/sync/history', { page: 1, limit: 100 });
    alive(epoch);
    if (!Array.isArray(head.data)) throw new Error('Invalid review response.');
    let rows = head.data;
    if (head.pages && head.pages > 1) {
      const tail = await apiAuthPage('/sync/history', { page: head.pages, limit: 100 });
      alive(epoch);
      if (!Array.isArray(tail.data)) throw new Error('Invalid review response.');
      rows = tail.data;
    }
    const oldest = rows.reduce((found, row) => {
      const time = Date.parse(row?.watched_at);
      return Number.isFinite(time) && (!found || time < found.time) ? { time, row } : found;
    }, null);
    if (!oldest) {
      firstMonth = null;
      return null;
    }
    const date = new Date(oldest.time);
    firstMonth = monthSpan(date.getFullYear(), date.getMonth() + 1);
    return firstMonth;
  })();
  firstFlight = task;
  task.finally(() => { if (firstFlight === task) firstFlight = null; }).catch(() => {});
  return task;
}
