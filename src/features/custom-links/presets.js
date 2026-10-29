export const PRESETS = [
  {
    label: 'Letterboxd',
    url: 'https://letterboxd.com/search/films/?q={title}',
    kinds: ['movie'],
  },
  {
    label: 'Rotten Tomatoes',
    url: 'https://www.rottentomatoes.com/search?search={title}',
    kinds: ['movie', 'show'],
  },
  {
    label: 'Metacritic',
    url: 'https://www.metacritic.com/search/{title}/',
    kinds: ['movie', 'show'],
  },
  {
    label: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?search={title}',
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
  {
    label: 'MyAnimeList',
    url: 'https://myanimelist.net/search/all?q={title}',
    kinds: ['movie', 'show'],
  },
];
