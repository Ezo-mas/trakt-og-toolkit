/** Pure-ish readers for a title page. They take a Document so they can be tested. */
import { cleanTitle, parseYear } from '../../core/text.js';
import { text } from '../../core/dom.js';

const TMDB_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/;
const IMDB_RE = /imdb\.com\/title\/(tt\d+)/;
const SEASON_HREF_RE = /\/seasons\/(\d+)(?:\/|$)/;

/**
 * Read what the page already knows: title, year, TMDb and IMDb ids.
 * og renders these in the summary's stats strip, so no API call is needed.
 */
export function readTitleData(doc, route) {
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
  };
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

/** Variables available to link templates. */
export function templateVars(meta, selection = {}) {
  return {
    id: meta.id,
    plural: meta.plural,
    type: meta.type,
    title: meta.title,
    year: meta.year,
    tmdb: meta.tmdb,
    imdb: meta.imdb,
    season: selection.season,
    episode: selection.episode,
  };
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

export function filterPresetsByKind(presets, kind) {
  return presets.filter((preset) => preset.kinds.includes(kind));
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

    if (!/^https?:\/\//i.test(String(link.url).trim())) {
      errors.push({ index, field: 'url', message: 'URL must start with http:// or https://.' });
    }
  }
  return errors;
}
