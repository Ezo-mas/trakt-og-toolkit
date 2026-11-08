/** Pure-ish readers for a title page. They take a Document so they can be tested. */
import { cleanTitle, fillTemplate, missingPlaceholders, parseYear } from '../../core/text.js';
import { text } from '../../core/dom.js';
import { isCustomLinkUrl, SERVER_KEYS } from '../../settings.js';
import { validateDirectUrl } from './resolve.js';
import { findPreset, presetGenresAllowed, resolvePresetUrl } from './presets.js';
import { iconKeyForLabel, surfaceForLabel } from './icons.js';

const TMDB_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/;
const IMDB_RE = /imdb\.com\/title\/(tt\d+)/;
const TVDB_RE = /thetvdb\.com\/(?:dereferrer\/)?series\/(\d+)/;
const SEASON_HREF_RE = /\/seasons\/(\d+)(?:\/|$)/;
const SHOW_HREF_RE = /^\/shows\/[^/]+\/?$/;
const SEASON_IMDB_RE = /imdb\.com\/title\/(tt\d+)\/episodes/;
/** An episode's own title link; a show's season list (`/title/ttSHOW/episodes`) is not the episode. */
const EPISODE_IMDB_RE = /imdb\.com\/title\/(tt\d+)(?!\d|\/episodes)/;
const GENRE_HREF_RE = /^\/(?:shows|movies)\/popular\/?$/;
const PERSON_IMDB_PATH_RE = /^\/name\/(nm\d+)\/?$/;
const PERSON_TMDB_PATH_RE = /^\/person\/(\d+)\/?$/;

/**
 * Read what the page already knows: title, year, TMDb, IMDb and TVDB ids.
 * og renders these in the summary's stats strip, so no API call is needed.
 */
export function readTitleData(doc, route) {
  // Season and episode headings describe that season/episode, not the show. Their title comes from og's show link,
  // and ids from og's external links where those are the show's: TMDb's `tv/:id/season/…` always starts with the
  // show, and so does IMDb's season link (`tt…/episodes?season=1`); an episode page's IMDb id is the episode's own.
  // The year shown is the season/episode's, so the show's year (and an episode page's IMDb id) come from the show
  // lookup in index.js; until then those links stay hidden rather than point at the wrong title or year.
  if (route.kind === 'show' && (route.name === 'season' || route.name === 'episode')) {
    return {
      kind: 'show',
      type: 'tv',
      plural: 'shows',
      id: route.id,
      title: cleanTitle(showLinkTitle(doc)) || showTitleFromPageTitle(doc, route) || null,
      year: null,
      tmdb: firstMatch(doc, 'a[href*="themoviedb.org/tv/"]', TMDB_RE, (match) => Number(match[2])),
      imdb: route.name === 'season' ? firstMatch(doc, 'a[href*="imdb.com/title/"]', SEASON_IMDB_RE, (match) => match[1]) : null,
      episodeImdb: route.name === 'episode'
        ? firstMatch(doc, 'a[href*="imdb.com/title/"]', EPISODE_IMDB_RE, (match) => match[1])
        : null,
      tvdb: null,
      genres: readGenres(doc),
      rottenTomatoesUrl: readRottenTomatoesUrl(doc, route.kind),
      metacriticUrl: readMetacriticUrl(doc, route.kind),
    };
  }

  const heading = doc.querySelector('.summary-title h1') || doc.querySelector('h1');
  const rawHeading = headingText(heading);

  const yearEl = doc.querySelector('.summary-title .year') || doc.querySelector('.year');
  const year = parseYear(text(yearEl)) || parseYear(rawHeading);

  let tmdb = null;
  for (const link of doc.querySelectorAll('a[href*="themoviedb.org/"]')) {
    const match = link.getAttribute('href')?.match(TMDB_RE);
    if (match) {
      tmdb = Number(match[2]);
      break;
    }
  }

  let imdb = null;
  for (const link of doc.querySelectorAll('a[href*="imdb.com/title/"]')) {
    const match = link.getAttribute('href')?.match(IMDB_RE);
    if (match) {
      imdb = match[1];
      break;
    }
  }

  let tvdb = null;
  for (const link of doc.querySelectorAll('a[href*="thetvdb.com/"]')) {
    const match = link.getAttribute('href')?.match(TVDB_RE);
    if (match) {
      tvdb = Number(match[1]);
      break;
    }
  }

  const kind = route.kind === 'show' ? 'show' : 'movie';
  const fallbackTitle = text(doc.querySelector('title'))
    .replace(/\s*[-–|]\s*Trakt.*$/i, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim();

  return {
    kind,
    type: kind === 'show' ? 'tv' : 'movie',
    plural: kind === 'show' ? 'shows' : 'movies',
    id: route.id,
    title: cleanTitle(rawHeading) || fallbackTitle || null,
    year,
    tmdb,
    imdb,
    episodeImdb: null,
    rottenTomatoesUrl: readRottenTomatoesUrl(doc, kind),
    metacriticUrl: readMetacriticUrl(doc, kind),
    tvdb,
    genres: readGenres(doc),
  };
}

/**
 * Genres from the current title's metadata field, not from any genre link on the page. og renders
 * `<li><span class="label">Genres</span> …</li>` inside the summary overview; scoping to that field
 * keeps a comment or a "Browse drama" navigation link from changing preset visibility. Returns null
 * when the field is absent so unknown metadata keeps conditional presets available.
 */
export function readGenres(doc) {
  const overview = doc.querySelector('#overview') || doc.querySelector('.summary-frame');
  if (!overview) return null;
  const label = [...overview.querySelectorAll('span.label')]
    .find((node) => text(node).trim().toLowerCase() === 'genres');
  const field = label?.closest('li');
  if (!field) return null;

  const genres = new Set();
  for (const link of field.querySelectorAll('a[href*="genres="]')) {
    let url;
    try {
      url = new URL(link.getAttribute('href'), 'https://og.trakt.tv');
    } catch {
      continue;
    }
    if (url.origin !== 'https://og.trakt.tv' || !GENRE_HREF_RE.test(url.pathname)) continue;
    const genre = url.searchParams.get('genres');
    if (genre && /^[a-z0-9-]+$/i.test(genre)) genres.add(genre.toLowerCase());
  }
  return genres.size ? [...genres] : null;
}

/** Read a person's own name and native ids. Person ids never enter title template values. */
export function readPersonData(doc, route) {
  const heading = doc.querySelector('.summary .summary-title h1') || doc.querySelector('.summary-title h1') || doc.querySelector('h1');
  const fallback = text(doc.querySelector('title')).replace(/\s*[-–|]\s*Trakt.*$/i, '').trim();
  return {
    kind: 'person',
    id: route.id,
    name: text(heading).trim() || fallback || null,
    imdb: readPersonLinkId(doc, 'imdb.com', PERSON_IMDB_PATH_RE),
    tmdb: readPersonLinkId(doc, 'themoviedb.org', PERSON_TMDB_PATH_RE, (match) => Number(match[1])),
  };
}

/** A person's ids come only from the native external-link strip, never a comment or credit row. */
function readPersonLinkId(doc, hostname, pathPattern, value = (match) => match[1]) {
  const strip = doc.querySelector('aside.sidebar ul.external-links') ||
    doc.querySelector('.summary-frame ul.external-links');
  if (!strip) return null;

  for (const link of strip.querySelectorAll('a[href]')) {
    let url;
    try {
      url = new URL(link.getAttribute('href'), 'https://og.trakt.tv');
    } catch {
      continue;
    }
    const host = url.hostname.replace(/^www\./i, '');
    if (url.protocol !== 'https:' || host !== hostname || url.port || url.username || url.password) continue;
    const match = url.pathname.match(pathPattern);
    if (match) return value(match);
  }
  return null;
}

/** Use OG's title link; Rotten Tomatoes slugs cannot be derived from Trakt/IMDb ids. */
function readRottenTomatoesUrl(doc, kind) {
  return readNativeExternalUrl(doc, kind, 'rotten-tomatoes');
}

/** Metacritic links can be reused when OG's native strip already has one. */
function readMetacriticUrl(doc, kind) {
  return readNativeExternalUrl(doc, kind, 'metacritic');
}

/**
 * Only the title's ratings and external-link strips are authoritative. Comments, related titles and
 * other page anchors can mention the same service and must not redirect this title there.
 */
function readNativeExternalUrl(doc, kind, service) {
  for (const link of doc.querySelectorAll('.ratings-strip a[href], ul.external-links a[href]')) {
    const url = validateDirectUrl(service, kind, link.getAttribute('href'));
    if (url) return url;
  }
  return null;
}

/**
 * The h1 also contains a year span, a certification span and tooltips. Only the
 * direct text nodes are the title.
 */
function headingText(heading) {
  if (!heading) return '';
  const direct = [...heading.childNodes]
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join(' ')
    .trim();
  return direct || text(heading);
}

function firstMatch(doc, selector, pattern, value) {
  for (const link of doc.querySelectorAll(selector)) {
    const match = link.getAttribute('href')?.match(pattern);
    if (match) return value(match);
  }
  return null;
}

/** The show link above a season or episode heading, e.g. "Breaking Bad". */
function showLinkTitle(doc) {
  for (const link of doc.querySelectorAll('.title-tags a[href]')) {
    if (SHOW_HREF_RE.test(link.getAttribute('href') || '')) return text(link);
  }
  return '';
}

/** Last-resort show name from og's page title: "Breaking Bad: Season 1" / "Breaking Bad S01E01: Pilot". */
function showTitleFromPageTitle(doc, route) {
  const raw = text(doc.querySelector('title')).replace(/\s*[-–|]\s*Trakt.*$/i, '').trim();
  const suffix = route.name === 'season' ? /\s*:\s*Season\s+\d+\s*$/i : /\s+S\d+E\d+\s*:.*$/i;
  return raw.replace(suffix, '').trim();
}

/** Season/episode selection preset by the route; title pages keep their remembered picker values. */
export function selectionForRoute(route, stored = null) {
  if (route.name === 'season') return { season: route.season ?? null, episode: null };
  if (route.name === 'episode') return { season: route.season ?? null, episode: route.episode ?? null };
  if (stored && typeof stored === 'object') {
    return { season: stored.season ?? null, episode: stored.episode ?? null };
  }
  return { season: null, episode: null };
}

/** Show values for the template variables, from `GET /shows/:id?extended=full`. */
export function showTemplateData(show) {
  if (!show || typeof show !== 'object' || Array.isArray(show)) return null;
  const title = typeof show.title === 'string' ? show.title.trim() : '';
  if (!title) return null;
  return {
    title,
    year: Number.isInteger(show.year) && show.year > 0 ? show.year : null,
    tmdb: Number.isSafeInteger(show.ids?.tmdb) && show.ids.tmdb > 0 ? show.ids.tmdb : null,
    imdb: typeof show.ids?.imdb === 'string' && /^tt\d+$/.test(show.ids.imdb) ? show.ids.imdb : null,
    tvdb: Number.isSafeInteger(show.ids?.tvdb) && show.ids.tvdb > 0 ? show.ids.tvdb : null,
  };
}

/**
 * Seasons are server-rendered as cards linking to /shows/:id/seasons/:n, each
 * with a "16 episodes" subtitle. Season 0 is specials.
 */
export function readSeasons(doc) {
  const found = new Map();

  for (const subtitle of doc.querySelectorAll('a[href*="/seasons/"] span.subtitle')) {
    const link = subtitle.closest('a');
    const match = link?.getAttribute('href')?.match(SEASON_HREF_RE);
    if (!match) continue;

    const number = Number(match[1]);
    const count = Number(text(subtitle).match(/(\d+)/)?.[1]) || null;
    const existing = found.get(number);
    if (!existing || (count && (!existing.episodes || count > existing.episodes))) {
      found.set(number, { number, episodes: count });
    }
  }

  return [...found.values()].sort((a, b) => a.number - b.number);
}

/** IMDb search URLs (OpenSubtitles) take the number without `tt` or leading zeroes. */
export function imdbNumber(imdb) {
  const match = String(imdb || '').match(/^tt0*(\d+)$/);
  return match ? match[1] : null;
}

/** Variables available to person-page link templates; title values deliberately stay out. */
export function personTemplateVars(person = {}) {
  return {
    person: person.name,
    personid: person.id,
    personimdb: person.imdb,
    persontmdb: person.tmdb,
  };
}

/** Variables available to link templates. */
export function templateVars(meta, selection = {}, servers = {}) {
  return {
    id: meta.id,
    plural: meta.plural,
    type: meta.type,
    title: meta.title,
    year: meta.year,
    tmdb: meta.tmdb,
    imdb: meta.imdb,
    imdbnum: imdbNumber(meta.imdb),
    episodeimdb: meta.episodeImdb,
    episodeimdbnum: imdbNumber(meta.episodeImdb),
    tvdb: meta.tvdb,
    rottenTomatoesUrl: meta.rottenTomatoesUrl,
    metacriticUrl: meta.metacriticUrl,
    jellyfin: servers.jellyfin || null,
    emby: servers.emby || null,
    radarr: servers.radarr || null,
    sonarr: servers.sonarr || null,
    seerr: servers.seerr || null,
    season: selection.season,
    episode: selection.episode,
  };
}

/**
 * Resolve the saved links for one page, in their saved order. Each entry keeps the stored URL as
 * `source` so a later refresh can re-resolve deep routes, while `href` is the URL an anchor opens.
 * A preset's icon and surface come from its definition. An edited or user-created URL still keeps the icon and
 * surface for its label when that label names a known service.
 */
export function resolveCustomLinks(links, values, kind, genres = null) {
  const resolved = [];
  for (const entry of Array.isArray(links) ? links : []) {
    if (!entry || typeof entry.label !== 'string' || typeof entry.url !== 'string') continue;
    if (!isCustomLinkUrl(entry.url)) continue;

    const template = resolvePresetUrl(entry.url, values, kind, genres);
    if (!template || missingPlaceholders(template, values).length) continue;

    const preset = findPreset(entry.url);
    resolved.push({
      label: entry.label,
      source: entry.url,
      template,
      href: fillTemplate(template, values, SERVER_KEYS),
      icon: preset?.icon || iconKeyForLabel(entry.label),
      surface: preset?.surface || surfaceForLabel(entry.label),
    });
  }
  return resolved;
}

/** Links that belong on a watch/play/library surface, never ratings or reference sites. */
export function watchNowLinks(entries) {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry.surface === 'watch' || entry.surface === 'library',
  );
}

/**
 * Merge API seasons with the rendered ones. The API usually has the counts; if a
 * season comes back without one, keep the number the page showed rather than
 * turning the episode picker back into a free-text field.
 */
export function mergeSeasons(primary, fallback = []) {
  const rendered = new Map(fallback.map((season) => [season.number, season]));
  return primary
    .map((season) => ({
      number: season.number,
      episodes: season.episodes ?? rendered.get(season.number)?.episodes ?? null,
    }))
    .sort((a, b) => a.number - b.number);
}

export function filterPresetsByKind(presets, kind, genres = null) {
  return presets.filter((preset) => preset.kinds.includes(kind) && presetGenresAllowed(preset, genres));
}

export function presetAlreadyAdded(links, preset) {
  return links.some((link) => link.url === preset.url);
}

export function addPresets(links, presets) {
  const urls = new Set(links.map((link) => link.url));
  const additions = [];
  for (const preset of presets) {
    if (urls.has(preset.url)) continue;
    urls.add(preset.url);
    additions.push({ label: preset.label, url: preset.url });
  }
  return [...links, ...additions];
}

export function moveLink(links, index, direction) {
  const next = [...links];
  const target = index + direction;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function validateCustomLinks(links) {
  const errors = [];
  for (const [index, link] of links.entries()) {
    if (!String(link.label || '').trim()) errors.push({ index, field: 'label', message: 'A label is required.' });
    if (!String(link.url || '').trim()) {
      errors.push({ index, field: 'url', message: 'A URL is required.' });
      continue;
    }

    if (!isCustomLinkUrl(link.url)) {
      errors.push({ index, field: 'url', message: 'URL must start with http://, https://, or a server placeholder.' });
    }
  }
  return errors;
}
