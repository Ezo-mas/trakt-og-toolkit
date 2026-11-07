import { apiGet, apiAuth, isSignedIn } from '../../core/trakt.js';

const validId = (id) => Number.isSafeInteger(id) && id > 0;

/** Only pass the queue guard when the caller supplied one, so injected transports keep their old shape. */
function writeRequest(auth, path, body, active, signal) {
  return active || signal
    ? auth('POST', path, body, undefined, { active, signal })
    : auth('POST', path, body);
}

export function createLibraryApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
  return {
    async add(route, { confirm = () => true, active, signal } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const isActive = active ?? (() => true);
      const id = encodeURIComponent(route.id);
      const at = now();
      const collected_at = new Date(at).toISOString();
      let body;
      if (route.kind === 'movie' && route.name === 'title') {
        const movie = await get(`/movies/${id}`);
        if (!validId(movie?.ids?.trakt)) throw new Error('Could not identify this movie.');
        body = { movies: [{ ids: { trakt: movie.ids.trakt }, collected_at }] };
      } else if (route.kind === 'show' && ['title', 'season', 'episode'].includes(route.name)) {
        // One uncached request returns every season's episodes with air dates (899 for The Simpsons, ~1 MB).
        const seasons = route.name === 'title'
          ? await get(`/shows/${id}/seasons?extended=full,episodes`, { ttl: 0 })
          : [{ number: route.season }];
        if (!Array.isArray(seasons)) throw new Error('Could not load seasons.');
        const episodes = [];
        for (const season of seasons) {
          if (!isActive() || !signedIn()) return { cancelled: true };
          if (!Number.isSafeInteger(season.number) || season.number < 0) continue;
          // Whole-show additions exclude specials; season 0 can be added explicitly.
          if (route.name === 'title' && season.number === 0) continue;
          const path = `/shows/${id}/seasons/${season.number}`;
          const rows = route.name === 'title' ? season.episodes
            : route.name === 'episode' ? [await get(`${path}/episodes/${route.episode}?extended=full`)]
            : await get(`${path}?extended=full`);
          if (!Array.isArray(rows)) throw new Error('Could not load episodes.');
          for (const episode of rows) {
            if (validId(episode?.ids?.trakt) && Number.isFinite(Date.parse(episode.first_aired)) && Date.parse(episode.first_aired) <= at) {
              episodes.push({ ids: { trakt: episode.ids.trakt }, collected_at });
            }
          }
        }
        body = { episodes: [...new Map(episodes.map(ep => [ep.ids.trakt, ep])).values()] };
        if (!body.episodes.length) throw new Error('No aired episodes to add.');
        if (!isActive() || !signedIn()) return { cancelled: true };
        if (route.name !== 'episode' && !(await confirm(`Add ${body.episodes.length} aired episode${body.episodes.length === 1 ? '' : 's'} to your toolkit Trakt account’s library?${route.name === 'title' ? ' Specials are excluded.' : ''}`))) {
          return { cancelled: true };
        }
        if (!isActive() || !signedIn()) return { cancelled: true };
      } else throw new Error('Unsupported library page.');
      if (!isActive() || !signedIn()) return { cancelled: true };
      const result = await writeRequest(auth, '/sync/collection', body, active, signal);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find some items; the addition may be incomplete.');
      }
      const counts = [result?.added?.movies, result?.added?.episodes, result?.updated?.movies, result?.updated?.episodes];
      if (!counts.some(count => Number.isInteger(count) && count > 0)) throw new Error('Trakt did not confirm a library addition.');
      // Updated and existing items were already collected. The bulk response doesn't say which ids
      // they were, so a mixed add can't be undone without risking the removal of those items.
      const total = counts => (Number(counts?.movies) || 0) + (Number(counts?.episodes) || 0);
      const undoable = total(result?.added) > 0 && total(result?.updated) === 0 && total(result?.existing) === 0;
      return { cancelled: false, body, undoable };
    },

    /** Undo an addition with the exact body that was sent. */
    async remove(body, { active, signal } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const isActive = active ?? (() => true);
      if (!body || typeof body !== 'object' || !isActive()) return { cancelled: true };
      const result = await writeRequest(auth, '/sync/collection/remove', body, active, signal);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find some items.');
      }
      return { cancelled: false };
    },
  };
}

export const libraryApi = createLibraryApi();
