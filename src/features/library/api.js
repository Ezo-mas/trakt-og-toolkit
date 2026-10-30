import { apiGet, apiAuth, isSignedIn } from '../../core/trakt.js';

const validId = (id) => Number.isSafeInteger(id) && id > 0;

export function createLibraryApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
  return {
    async add(route, { confirm = () => true, active = () => true } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
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
          if (!active() || !signedIn()) return { cancelled: true };
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
        if (!active() || !signedIn()) return { cancelled: true };
        if (route.name !== 'episode' && !confirm(`Add ${body.episodes.length} aired episode${body.episodes.length === 1 ? '' : 's'} to your toolkit Trakt account’s library?${route.name === 'title' ? ' Specials are excluded.' : ''}`)) {
          return { cancelled: true };
        }
      } else throw new Error('Unsupported library page.');
      if (!active() || !signedIn()) return { cancelled: true };
      const result = await auth('POST', '/sync/collection', body);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find some items; the addition may be incomplete.');
      }
      const counts = [result?.added?.movies, result?.added?.episodes, result?.updated?.movies, result?.updated?.episodes];
      if (!counts.some(count => Number.isInteger(count) && count > 0)) throw new Error('Trakt did not confirm a library addition.');
      return { cancelled: false };
    },
  };
}

export const libraryApi = createLibraryApi();
