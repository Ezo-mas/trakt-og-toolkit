import { missingPlaceholders } from '../../core/text.js';

/**
 * Services people open from a title, including the external-link targets og itself shows.
 * Exact routes are tried when the page has the id they need; the stored search URL is the
 * fallback, so a preset still works when og's external-link strip is missing.
 */
export const PRESETS = [
  {
    label: 'IMDb',
    url: 'https://www.imdb.com/find/?q={title}',
    kinds: ['movie', 'show'],
    deep: [
      { url: 'https://www.imdb.com/title/{imdb}/episodes?season={season}', kinds: ['show'] },
      { url: 'https://www.imdb.com/title/{imdb}/', kinds: ['movie', 'show'] },
    ],
  },
  {
    label: 'TMDb',
    url: 'https://www.themoviedb.org/search?query={title}',
    kinds: ['movie', 'show'],
    deep: [
      { url: 'https://www.themoviedb.org/tv/{tmdb}/season/{season}/episode/{episode}', kinds: ['show'] },
      { url: 'https://www.themoviedb.org/tv/{tmdb}/season/{season}', kinds: ['show'] },
      { url: 'https://www.themoviedb.org/movie/{tmdb}', kinds: ['movie'] },
      { url: 'https://www.themoviedb.org/tv/{tmdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'TVDB',
    url: 'https://thetvdb.com/search?query={title}',
    kinds: ['show'],
    deep: [
      { url: 'https://thetvdb.com/dereferrer/series/{tvdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'Letterboxd',
    url: 'https://letterboxd.com/search/{title}/',
    kinds: ['movie'],
    deep: [
      { url: 'https://letterboxd.com/imdb/{imdb}/', kinds: ['movie'] },
      { url: 'https://letterboxd.com/tmdb/{tmdb}/', kinds: ['movie'] },
    ],
  },
  {
    label: 'Rotten Tomatoes',
    url: 'https://www.rottentomatoes.com/search?search={title}',
    kinds: ['movie', 'show'],
  },
  {
    label: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?search={title}',
    kinds: ['movie', 'show'],
  },
  {
    label: 'JustWatch',
    url: 'https://www.justwatch.com/us/search?q={title}',
    kinds: ['movie', 'show'],
  },
  {
    label: 'MyAnimeList',
    url: 'https://myanimelist.net/search/all?q={title}',
    kinds: ['movie', 'show'],
  },
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
     * Exact-item routes, most specific first. MetaDetails reads `type`, `id` and `videoId`
     * from `useParams()`, and its episode search builds the video id as
     * `<id>:<season>:<episode>`, so that shape opens one episode directly. With `videoId`
     * unset, `useSeason` reads `?season=` from the same URL, so a season page opens that
     * season's episode list.
     */
    deep: [
      { url: 'https://web.stremio.com/#/detail/series/{imdb}/{imdb}:{season}:{episode}', kinds: ['show'] },
      { url: 'https://web.stremio.com/#/detail/series/{imdb}?season={season}', kinds: ['show'] },
      { url: 'https://web.stremio.com/#/detail/movie/{imdb}', kinds: ['movie'] },
      { url: 'https://web.stremio.com/#/detail/series/{imdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'Debrid Media Manager',
    url: 'https://debridmediamanager.com/search?query={title}',
    kinds: ['movie', 'show'],
    /**
     * DMM routes by IMDb id: `movie/:imdbid` and `show/:imdbid/:seasonNum` (from its
     * `src/pages/movie/[imdbid]/index.tsx` and `src/pages/show/[imdbid]/[seasonNum]/index.tsx`).
     * It has no episode page, so an episode opens its season instead. Signed-out visits
     * redirect to `/start`; the deep routes are for a signed-in DMM session.
     */
    deep: [
      { url: 'https://debridmediamanager.com/show/{imdb}/{season}', kinds: ['show'] },
      { url: 'https://debridmediamanager.com/movie/{imdb}', kinds: ['movie'] },
      { url: 'https://debridmediamanager.com/show/{imdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'MDBList',
    /**
     * MDBList's title URLs carry its own slug prefix (`3tb7f-resident-evil`),
     * which Trakt does not expose. Its site search does take a title or IMDb id,
     * but movies and shows use separate forms, so the show entry overrides the
     * movie search URL for show pages.
     */
    url: 'https://mdblist.com/movies/?q_title={title}',
    kinds: ['movie', 'show'],
    deep: [
      { url: 'https://mdblist.com/shows/?q_title={title}', kinds: ['show'] },
    ],
  },
  {
    label: 'OpenSubtitles',
    /**
     * OpenSubtitles' search takes an IMDb id without `tt` or leading zeroes:
     * `imdbid` for a movie or episode, and `pimdbid` for a show. The episode
     * page's own IMDb link supplies the episode id; without it the season route
     * is the fallback. The stored URL is the movie route, while every show page
     * resolves to one of the deep routes.
     */
    url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{imdbnum}',
    kinds: ['movie', 'show'],
    deep: [
      { url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{episodeimdbnum}', kinds: ['show'] },
      { url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-{imdbnum}/season-{season}', kinds: ['show'] },
      { url: 'https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-{imdbnum}', kinds: ['show'] },
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
  {
    label: 'Jellyfin',
    /**
     * Current web search route; `jellyfin-web` defines `search` without `.html` and reads
     * `?query=`. The server base URL comes from the Servers settings.
     */
    url: '{jellyfin}/web/#/search?query={title}',
    kinds: ['movie', 'show'],
    requires: 'jellyfin',
  },
  {
    label: 'Emby',
    /**
     * Current 4.9 web search page; its search field uses `searchtext`. Older Emby versions
     * used `/web/search.html` directly, so this remains editable in the link editor.
     */
    url: '{emby}/web/index.html#!/list/list.html?type=search&searchtext={title}',
    kinds: ['movie', 'show'],
    requires: 'emby',
  },
  {
    label: 'Radarr',
    url: '{radarr}/add/new?term={title}',
    kinds: ['movie'],
    requires: 'radarr',
    deep: [
      { url: '{radarr}/add/new?term=imdb:{imdb}', kinds: ['movie'] },
      { url: '{radarr}/add/new?term=tmdb:{tmdb}', kinds: ['movie'] },
    ],
  },
  {
    label: 'Sonarr',
    url: '{sonarr}/add/new?term={title}',
    kinds: ['show'],
    requires: 'sonarr',
    deep: [
      { url: '{sonarr}/add/new?term=tvdb:{tvdb}', kinds: ['show'] },
    ],
  },
  {
    label: 'Seerr',
    url: '{seerr}/search?query={title}',
    kinds: ['movie', 'show'],
    requires: 'seerr',
    deep: [
      { url: '{seerr}/movie/{tmdb}', kinds: ['movie'] },
      { url: '{seerr}/tv/{tmdb}', kinds: ['show'] },
    ],
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
 * The exact-item or kind-specific URL a stored preset link should open here, or the stored URL
 * when the page lacks an id that the deep route needs. The stored URL remains the fallback, and
 * hides itself when even its placeholders are missing.
 */
export function resolvePresetUrl(url, vars, kind) {
  const preset = PRESETS.find((entry) => entry.url === url);
  if (!preset?.deep) return url;
  const deep = preset.deep.find(
    (entry) => entry.kinds.includes(kind) && missingPlaceholders(entry.url, vars).length === 0,
  );
  return deep ? deep.url : url;
}
