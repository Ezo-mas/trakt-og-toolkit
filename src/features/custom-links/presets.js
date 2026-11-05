/** Services og doesn't already link from a title page (it links Rotten Tomatoes, Wikipedia, Letterboxd and, on anime, MyAnimeList). */
import { missingPlaceholders } from '../../core/text.js';

export const PRESETS = [
  {
    label: 'Metacritic',
    url: 'https://www.metacritic.com/search/{title}/',
    kinds: ['movie', 'show'],
  },
  {
    label: 'Stremio',
    url: 'https://web.stremio.com/#/search?search={title}',
    kinds: ['movie', 'show'],
    /**
     * Exact-item routes, most specific first: `#/detail/:type/:id/:videoId?`. Stremio's
     * MetaDetails reads those params, and its episode search builds the video id as
     * `<id>:<season>:<episode>`, so the same shape opens one episode directly.
     */
    deep: [
      { url: 'https://web.stremio.com/#/detail/series/{imdb}/{imdb}:{season}:{episode}', kinds: ['show'] },
      { url: 'https://web.stremio.com/#/detail/movie/{imdb}', kinds: ['movie'] },
      { url: 'https://web.stremio.com/#/detail/series/{imdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'Plex',
    url: 'https://app.plex.tv/desktop/#!/search?query={title}',
    kinds: ['movie', 'show'],
  },
  {
    label: 'AniList',
    url: 'https://anilist.co/search/anime?search={title}',
    kinds: ['movie', 'show'],
  },
];

/**
 * Every template a stored preset link can use on this page kind, including deep ones that
 * can't be filled yet. Callers need this to know which ids (such as the show's IMDb id) are
 * worth looking up before deciding that only the search URL is available.
 */
export function presetTemplateUrls(url, kind) {
  const preset = PRESETS.find((entry) => entry.url === url);
  if (!preset?.deep) return [url];
  return [url, ...preset.deep.filter((entry) => entry.kinds.includes(kind)).map((entry) => entry.url)];
}

/**
 * The exact-item URL a stored preset link should open here, or the stored URL when the page
 * lacks an id that the deep route needs. The search URL remains the fallback, and hides itself
 * when even `{title}` is missing.
 */
export function resolvePresetUrl(url, vars, kind) {
  const preset = PRESETS.find((entry) => entry.url === url);
  if (!preset?.deep) return url;
  const deep = preset.deep.find(
    (entry) => entry.kinds.includes(kind) && missingPlaceholders(entry.url, vars).length === 0,
  );
  return deep ? deep.url : url;
}
