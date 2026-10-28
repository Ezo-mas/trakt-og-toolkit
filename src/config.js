/**
 * Build-time settings.
 *
 * DEFAULT_CLIENT_ID is optional. When it is empty the script asks the user for
 * their own Trakt API client ID (Settings › API apps) and stores it in GM
 * storage. Fill it in before publishing if you want the script to work without
 * that step — a client ID is public, so that is safe.
 */
export const DEFAULT_CLIENT_ID = '';

export const API = {
  base: 'https://api.trakt.tv',
  version: '2',
};

/** Public GETs change slowly; eight hours keeps the API budget small. */
export const CACHE_TTL = 8 * 60 * 60 * 1000;

/** Default links offered in the Watch Now panel. */
export const DEFAULT_LINKS = [
  {
    id: 'tmdb',
    label: 'TMDb',
    url: 'https://www.themoviedb.org/{type}/{tmdb}',
    needs: 'tmdb',
  },
  {
    id: 'imdb',
    label: 'IMDb',
    url: 'https://www.imdb.com/title/{imdb}/',
    needs: 'imdb',
  },
  {
    id: 'justwatch',
    label: 'JustWatch',
    url: 'https://www.justwatch.com/us/search?q={title}',
    needs: 'title',
  },
  {
    id: 'trakt',
    label: 'Trakt',
    url: 'https://trakt.tv/{plural}/{id}',
    needs: 'id',
  },
];
