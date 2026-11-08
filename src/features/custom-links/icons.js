/**
 * Service marks for the custom-link strip and Watch Now tiles.
 *
 * Real brand marks, never fetched favicons (no third-party request per page):
 * - `brand`: a simple-icons path bundled in `brand-paths.js` (CC0);
 * - `native`: the mark OG itself draws in the sidebar's `ul.external-links` (TMDb, TVDB, JustWatch are not in
 *   simple-icons), cloned from the page when OG shows that link;
 * - otherwise a short word mark, so a missing logo still reads as the service.
 * `color` is the brand colour, preferring OG's own `--color-site-*` tokens where it defines one.
 * The anchor holding the mark always carries the service's accessible name and tooltip.
 */
import { BRAND_PATHS } from './brand-paths.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  imdb: { brand: 'imdb', native: 'IMDB', text: 'IMDb', color: 'var(--color-site-imdb, #f5c518)' },
  tmdb: { native: 'TMDB', text: 'TMDb', color: 'var(--color-site-tmdb, #01b4e4)' },
  tvdb: { native: 'TVDB', text: 'TVDB', color: 'var(--color-site-tvdb, #6cd591)' },
  letterboxd: { brand: 'letterboxd', text: 'LB', color: 'var(--color-site-letterboxd, #00e054)' },
  rt: { brand: 'rt', text: 'RT', color: 'var(--color-site-rotten-tomatoes, #fa320a)' },
  wikipedia: { brand: 'wikipedia', native: 'Wikipedia', text: 'W', color: '#ffffff' },
  justwatch: { native: 'JustWatch', text: 'JW', color: 'var(--color-site-justwatch, #fbd446)' },
  mal: { brand: 'mal', text: 'MAL', color: 'var(--color-site-mal, #2e51a2)' },
  metacritic: { brand: 'metacritic', text: 'MC', color: 'var(--color-site-metacritic, #ffcc34)' },
  stremio: { brand: 'stremio', text: 'ST', color: '#8a7cf6' },
  dmm: { text: 'DMM', color: '#3fb6a8' },
  mdblist: { brand: 'mdblist', text: 'MDB', color: '#4284ca' },
  opensubtitles: { text: 'OS', color: '#7aa7d8' },
  plex: { brand: 'plex', text: 'PLEX', color: 'var(--color-site-plex, #e5a00d)' },
  anilist: { brand: 'anilist', text: 'AL', color: '#02a9ff' },
  youtube: { brand: 'youtube', text: 'YT', color: '#ff0000' },
  jellyfin: { brand: 'jellyfin', text: 'JF', color: 'var(--color-site-jellyfin, #aa5cc3)' },
  emby: { brand: 'emby', text: 'EMBY', color: '#52b54b' },
  radarr: { brand: 'radarr', text: 'R', color: '#ffcb3d' },
  sonarr: { brand: 'sonarr', text: 'S', color: '#35c5f4' },
  seerr: { text: 'SEER', color: '#8b5cf6' },
  trakt: { brand: 'trakt', text: 'T', color: 'var(--color-site-trakt, #ed1c24)' },
};

const LABEL_ICONS = {
  imdb: 'imdb',
  tmdb: 'tmdb',
  tvdb: 'tvdb',
  letterboxd: 'letterboxd',
  'rotten tomatoes': 'rt',
  wikipedia: 'wikipedia',
  justwatch: 'justwatch',
  myanimelist: 'mal',
  'my anime list': 'mal',
  metacritic: 'metacritic',
  stremio: 'stremio',
  'debrid media manager': 'dmm',
  dmm: 'dmm',
  mdblist: 'mdblist',
  opensubtitles: 'opensubtitles',
  plex: 'plex',
  anilist: 'anilist',
  youtube: 'youtube',
  'youtube interviews': 'youtube',
  jellyfin: 'jellyfin',
  emby: 'emby',
  radarr: 'radarr',
  sonarr: 'sonarr',
  seerr: 'seerr',
  overseerr: 'seerr',
  jellyseerr: 'seerr',
  trakt: 'trakt',
};

/** Normalise a user label to one of the known service marks, if it names one. */
export function iconKeyForLabel(label) {
  const key = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return LABEL_ICONS[key] || null;
}

const WATCH_ICONS = new Set(['plex', 'stremio', 'jellyfin', 'emby', 'dmm']);
const LIBRARY_ICONS = new Set(['radarr', 'sonarr', 'seerr']);

/**
 * Classify a saved link by its label. This keeps an edited preset on the right surface: Emby's own comment tells
 * users to edit its search path, and that edit must not turn it into a reference link.
 */
export function surfaceForLabel(label) {
  const key = iconKeyForLabel(label);
  if (WATCH_ICONS.has(key)) return 'watch';
  if (LIBRARY_ICONS.has(key)) return 'library';
  return 'reference';
}

/** The service's brand colour (a CSS value), for tinting its tile. */
export function serviceColor(key) {
  return ICONS[key]?.color || null;
}

/** True when the key names a known service (with a logo or word mark). */
export function hasServiceIcon(key) {
  return Boolean(key && ICONS[key]);
}

function brandSvg(doc, d) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

/** OG's own mark for a service it links in this page's sidebar; scoped Svelte classes are dropped. */
function nativeSvg(doc, label) {
  for (const link of doc.querySelectorAll('ul.external-links a[aria-label]')) {
    if (link.getAttribute('aria-label') !== label) continue;
    const svg = link.querySelector('svg');
    if (!svg) return null;
    const copy = svg.cloneNode(true);
    copy.removeAttribute('class');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('focusable', 'false');
    return copy;
  }
  return null;
}

/** Build the visible mark: OG's native mark, else the bundled logo, else a word mark. */
export function serviceIcon(key, doc = document) {
  const definition = ICONS[key];
  if (!definition) return null;
  const native = definition.native ? nativeSvg(doc, definition.native) : null;
  const svg = native || (definition.brand && BRAND_PATHS[definition.brand] ? brandSvg(doc, BRAND_PATHS[definition.brand]) : null);
  const mark = doc.createElement('span');
  mark.className = 'ogt-service-icon';
  mark.setAttribute('aria-hidden', 'true');
  mark.dataset.ogtMark = native ? 'native' : svg ? 'brand' : 'text';
  mark.style.setProperty('--ogt-brand', definition.color);
  if (svg) mark.append(svg);
  else mark.textContent = definition.text;
  return mark;
}
