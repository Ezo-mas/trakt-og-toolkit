/**
 * Pure readers and transforms for the CSV exporter.
 *
 * Lists and watchlists can contain movies, shows, seasons, episodes and people. Each API entry is
 * `{ type, movie|show|season|episode|person, show?, rank, listed_at, notes }`; seasons and episodes carry their
 * show separately. Only fields the CSV exposes are read here.
 */

export const CSV_COLUMNS = [
  'rank', 'type', 'title', 'year', 'season', 'episode', 'trakt', 'imdb', 'tmdb', 'listed_at', 'notes',
];
export const CSV_HEADER = [
  'Rank', 'Type', 'Title', 'Year', 'Season', 'Episode', 'Trakt ID', 'IMDb ID', 'TMDb ID', 'Listed At', 'Notes',
];

const TYPES = new Set(['movie', 'show', 'season', 'episode', 'person']);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function integer(value, minimum = 0) {
  return Number.isSafeInteger(value) && value >= minimum ? value : '';
}

function titleOf(entity) {
  return typeof entity?.title === 'string' ? entity.title.trim() : '';
}

function nameOf(entity) {
  const name = typeof entity?.name === 'string' ? entity.name.trim() : '';
  return name || titleOf(entity);
}

function yearOf(entity) {
  return integer(entity?.year, 1);
}

function usableId(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return '';
}

function idSet(entity) {
  const ids = entity?.ids;
  return {
    trakt: usableId(ids?.trakt),
    imdb: usableId(ids?.imdb),
    tmdb: usableId(ids?.tmdb),
  };
}

/** One API entry as a CSV row, or null for an entry that has no recognized media object. */
export function normalizeExportItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = raw.type;
  if (!TYPES.has(kind)) return null;
  const entity = raw[kind];
  if (!entity || typeof entity !== 'object' || entity === null || Array.isArray(entity)) return null;

  let title = '';
  let year = '';
  let season = '';
  let episode = '';
  let ids;

  if (kind === 'movie' || kind === 'show') {
    title = titleOf(entity);
    year = yearOf(entity);
    ids = idSet(entity);
  } else if (kind === 'person') {
    title = nameOf(entity);
    ids = idSet(entity);
  } else {
    const show = raw.show ?? entity.show;
    const showTitle = titleOf(show);
    const showYear = yearOf(show);
    year = showYear;
    ids = idSet(entity);

    if (kind === 'season') {
      title = showTitle || titleOf(entity);
      season = integer(entity.number);
    } else {
      title = titleOf(entity) || showTitle;
      season = integer(entity.season);
      episode = integer(entity.number, 1);
    }
  }

  return {
    rank: integer(raw.rank),
    type: kind,
    title,
    year,
    season,
    episode,
    ...ids,
    listed_at: text(raw.listed_at),
    notes: text(raw.notes),
  };
}

/** A whole list response, in API order, dropping entries the exporter cannot read. */
export function exportItems(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeExportItem).filter(Boolean);
}

/**
 * Escape one cell. Fields follow RFC 4180: commas, double quotes and line breaks are quoted and quotes doubled.
 * A formula marker (=, +, - or @, including full-width forms) is prefixed with an apostrophe so spreadsheet apps
 * treat the value as text, not a formula. Leading whitespace and control characters are skipped first because some
 * spreadsheets trim them before parsing, which would expose the marker.
 */
export function escapeCsvCell(value) {
  let cell = value == null ? '' : String(value);
  if (/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

/** A complete CSV document with a header row and CRLF line endings. */
export function toCsv(items) {
  const rows = Array.isArray(items) ? items : [];
  const lines = [CSV_HEADER.map(escapeCsvCell).join(',')];
  for (const item of rows) lines.push(CSV_COLUMNS.map((column) => escapeCsvCell(item?.[column])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** `trakt-justin-2015-fall-shows.csv` or `trakt-justin-watchlist.csv`. */
export function exportFilename(route) {
  const owner = decodePart(String(route?.id ?? ''));
  const source = route?.name === 'watchlist' ? 'watchlist' : decodePart(String(route?.slug ?? ''));
  const prefix = route?.name === 'official-list' ? 'official' : owner;
  const base = [prefix, source].filter(Boolean).join('-') || 'export';
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return `trakt-${safe || 'export'}.csv`;
}
