import { apiAuth, apiGet, isSignedIn } from '../../core/trakt.js';
import { EPISODE_IDS, mapPlayback, normalizeProgress, pickIds, scrobbleBody, sortPlayback } from './data.js';

const TTL = 60000;
/** Injectable transport keeps tests at the authenticated API boundary. */
export function createPlaybackApi({ auth = apiAuth, get = apiGet, signedIn = isSignedIn, now = Date.now } = {}) {
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
    if (!unique.length || !(await confirm(`Clear paused playback for ${unique.length} item${unique.length === 1 ? '' : 's'}? This cannot be undone.`))) {
      return { cancelled: true, cleared: [], failed: [] };
    }
    if (session !== epoch || !signedIn()) return { cancelled: true, cleared: [], failed: [] };
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
  async function episodeIdsFor(item) {
    if (pickIds(item.episodeIds, EPISODE_IDS)) return item.episodeIds;
    if (!item.ids || !Number.isInteger(item.season) || !Number.isInteger(item.episode)) {
      throw new Error('Could not identify this episode.');
    }
    const showId = item.ids.slug || item.ids.trakt;
    if (!showId) throw new Error('Could not identify this episode.');
    const episode = await get(`/shows/${encodeURIComponent(showId)}/seasons/${item.season}/episodes/${item.episode}`);
    if (!pickIds(episode?.ids, EPISODE_IDS)) throw new Error('Could not identify this episode.');
    return episode.ids;
  }
  /**
   * Scrobble start then pause, never stop: stop can mark the title watched. Start removes any saved progress, so a
   * failed pause after it is flagged `partial`: the old progress is gone and nothing new was saved.
   */
  async function setProgress(item, progress, epoch = session) {
    if (!signedIn()) throw new Error('Sign in to Trakt first.');
    const value = normalizeProgress(progress);
    if (!item || value == null) throw new Error('Invalid progress.');
    const episodeIds = item.kind === 'movie' ? null : await episodeIdsFor(item);
    if (epoch !== session || !signedIn()) throw new Error('Playback session changed.');
    const body = scrobbleBody(item, value, episodeIds);
    await auth('POST', '/scrobble/start', body);
    invalidate();
    try {
      if (epoch !== session || !signedIn()) throw new Error('Playback session changed.');
      await auth('POST', '/scrobble/pause', body);
    } catch (error) {
      error.partial = true;
      throw error;
    } finally { invalidate(); }
    return { progress: value, body };
  }
  async function setRouteProgress(route, progress) {
    if (!signedIn()) throw new Error('Sign in to Trakt first.');
    const value = normalizeProgress(progress);
    if (value == null) throw new Error('Invalid progress.');
    if (!route?.id) throw new Error('Unsupported playback page.');
    const epoch = session;
    if (route.kind === 'movie') {
      const movie = await get(`/movies/${encodeURIComponent(route.id)}`);
      return setProgress({ kind: 'movie', ids: movie?.ids, title: movie?.title, year: movie?.year }, value, epoch);
    }
    if (route.name !== 'episode' || !Number.isInteger(route.season) || !Number.isInteger(route.episode)) {
      throw new Error('Unsupported playback page.');
    }
    const episode = await get(`/shows/${encodeURIComponent(route.id)}/seasons/${route.season}/episodes/${route.episode}`);
    return setProgress({ kind: 'episode', episodeIds: episode?.ids, season: route.season, episode: route.episode }, value, epoch);
  }
  return { load, loadAll, clearItems, setProgress, setRouteProgress, invalidate, resetSession };
}

export const playbackApi = createPlaybackApi();
if (typeof document !== 'undefined') document.addEventListener('ogt:authchange', () => playbackApi.resetSession());
