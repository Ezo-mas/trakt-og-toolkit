import { apiAuth, isSignedIn } from '../../core/trakt.js';
import { mapPlayback, sortPlayback } from './data.js';

const TTL = 60000;

/** Injectable transport keeps tests at the authenticated API boundary. */
export function createPlaybackApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
  const cache = new Map();
  const flights = new Map();
  let revision = 0;
  let session = 0;
  function invalidate() { revision += 1; cache.clear(); flights.clear(); }
  function resetSession() { session += 1; invalidate(); }
  async function load(kind, { force = false } = {}) {
    if (!signedIn()) { resetSession(); return []; }
    if (force) invalidate();
    const hit = cache.get(kind);
    if (hit && hit.until > now()) return hit.items;
    if (flights.has(kind)) return flights.get(kind);
    const rev = revision;
    const epoch = session;
    const flight = (async () => {
      const rows = await auth('GET', `/sync/playback/${kind === 'movie' ? 'movies' : 'episodes'}`, undefined, { extended: 'images' });
      if (epoch !== session || !signedIn()) throw new Error('Playback session changed.');
      if (!Array.isArray(rows)) throw new Error('Invalid playback response.');
      const items = mapPlayback(rows, kind);
      if (rev === revision) cache.set(kind, { items, until: now() + TTL });
      return items;
    })();
    flights.set(kind, flight);
    try { return await flight; }
    finally { if (flights.get(kind) === flight) flights.delete(kind); }
  }
  async function loadAll({ force = false } = {}) {
    if (force) invalidate();
    const [movies, episodes] = await Promise.all([load('movie'), load('episode')]);
    return sortPlayback([...movies, ...episodes]);
  }
  /** A single batch confirmation includes its actual deduplicated count. */
  async function clearItems(ids, confirm) {
    const unique = [...new Set(ids)];
    if (unique.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Invalid playback ID.');
    if (!signedIn()) throw new Error('Sign in to Trakt first.');
    const epoch = session;
    if (!unique.length || !confirm(`Clear paused playback for ${unique.length} item${unique.length === 1 ? '' : 's'}? This cannot be undone.`)) {
      return { cancelled: true, cleared: [], failed: [] };
    }
    let cursor = 0;
    const cleared = [];
    const failed = [];
    try {
      await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
        while (cursor < unique.length) {
          const id = unique[cursor++];
          if (session !== epoch || !signedIn()) { failed.push(id); continue; }
          try { await auth('DELETE', `/sync/playback/${id}`); cleared.push(id); }
          catch { failed.push(id); }
        }
      }));
    } finally { invalidate(); }
    return { cancelled: false, cleared, failed };
  }
  return { load, loadAll, clearItems, invalidate, resetSession };
}

export const playbackApi = createPlaybackApi();
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', () => playbackApi.resetSession());
