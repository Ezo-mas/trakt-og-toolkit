export const API = {
  base: 'https://api.trakt.tv',
  version: '2',
};

/** Public GETs change slowly; eight hours keeps the API budget small. */
export const CACHE_TTL = 8 * 60 * 60 * 1000;
