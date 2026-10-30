/** Services og doesn't already link from a title page (it links Rotten Tomatoes, Wikipedia, Letterboxd and, on anime, MyAnimeList). */
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
