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
