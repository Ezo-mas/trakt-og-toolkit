import { apiAuth, apiAuthPage, isSignedIn } from '../../core/trakt.js';
import { getPrivateValue, setPrivateValue, STORAGE } from '../../core/store.js';
import { lastMonth, summarize, freshCache } from './data.js';

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
let flight;
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', () => { generation++; flight = null; });
export function loadReview(now = new Date()) {
  if (flight) return flight;
  const epoch = generation;
  const alive = () => { if (generation !== epoch || !isSignedIn()) throw new Error('Review session changed.'); };
  const task = (async () => {
    const profile = await apiAuth('GET', '/users/me');
    alive();
    const user = profile?.ids?.slug || profile?.username;
    if (!user) throw new Error('Missing review user.');
    const span = lastMonth(now);
    if (getPrivateValue(STORAGE.dismissedReview(user)) === span.key) return null;
    const key = STORAGE.monthReview(user, span.key);
    const cached = getPrivateValue(key);
    if (freshCache(cached, now)) return { ...cached.summary, user, span };
    const history = await paginate(apiAuthPage, '/sync/history', { start_at: span.start, end_at: span.end, extended: 'full,images' });
    alive();
    let summary = { plays: 0 };
    if (history.some((row) => Date.parse(row.watched_at) >= Date.parse(span.start) && Date.parse(row.watched_at) < Date.parse(span.end))) {
      // Ratings have no date filter; unpaginated, Trakt returns them all in one response instead of 100 per page.
      const [ratings, comments] = await Promise.all([
        apiAuth('GET', '/sync/ratings'), paginate(apiAuthPage, '/users/me/comments'),
      ]);
      if (!Array.isArray(ratings)) throw new Error('Invalid review response.');
      alive();
      summary = summarize(history, ratings, comments, span);
    }
    setPrivateValue(key, { savedAt: now.getTime(), summary });
    return { ...summary, user, span };
  })();
  flight = task;
  task.finally(() => { if (flight === task) flight = null; }).catch(() => {});
  return task;
}
