/**
 * External-id resolution for custom-link presets that need a site's own identifier.
 *
 * Rotten Tomatoes and Metacritic publish those identifiers in Wikidata (P1258 and
 * P1712). A lookup is made only when the user activates a link, the page supplied
 * no valid direct URL, and the page has a validated TMDb or IMDb id. The lookup is
 * deliberately off the navigation path: the anchor keeps its search URL until a
 * mapping arrives, so modified clicks, new tabs and failed lookups stay usable.
 *
 * Wikidata Query Service limits (checked 2026-11-08): 60 s query deadline, 60 s of
 * processing per minute per client, 30 error queries per minute and 5 parallel
 * queries per IP. Its technical guidance also says not to depend on it for a
 * synchronous user experience, so lookups are lazy, deduplicated, cached and
 * time-bounded, and no page render waits for one.
 */
import { getJSON, headerValue } from '../../core/http.js';
import { VERSION } from '../../meta.js';

export const RESOLVE_TIMEOUT_MS = 8000;
/** An identifier found once is stable for the life of the page; a day is plenty. */
export const HIT_TTL_MS = 24 * 60 * 60 * 1000;
/** A genuine miss may become a mapping after Wikidata is edited; retry soon. */
export const MISS_TTL_MS = 5 * 60 * 1000;
/** A 429 without a usable Retry-After still blocks this service for a bounded time. */
export const DEFAULT_COOLDOWN_MS = 60 * 1000;

const SPARQL_URL = 'https://query.wikidata.org/sparql';
const IMDB_RE = /^tt\d{5,10}$/;
const RT_ID_RE = /^(m|tv)\/([a-z0-9][a-z0-9_-]*)$/;
const MC_ID_RE = /^(movie|tv)\/([a-z0-9][a-z0-9-]*)$/;
const MC_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const RT_PATH_RE = /^[a-z0-9][a-z0-9_-]*$/;
const WIKIDATA_ITEM_RE = /^https?:\/\/www\.wikidata\.org\/entity\/Q\d+$/;

const SERVICES = {
  'rotten-tomatoes': {
    property: 'P1258',
    hostnames: ['www.rottentomatoes.com', 'rottentomatoes.com'],
    kinds: {
      movie: { className: 'Q11424', tmdbProperty: 'P4947', prefix: 'm' },
      show: { className: 'Q5398426', tmdbProperty: 'P4983', prefix: 'tv' },
    },
  },
  metacritic: {
    property: 'P1712',
    hostnames: ['www.metacritic.com', 'metacritic.com'],
    kinds: {
      movie: { className: 'Q11424', tmdbProperty: 'P4947', prefix: 'movie' },
      show: { className: 'Q5398426', tmdbProperty: 'P4983', prefix: 'tv' },
    },
  },
};

const cache = new Map(); // service|kind|tmdb|imdb -> { url: string|null, expires }
const inflight = new Map(); // same key -> Promise<string|null> (identifier URL)
let nextLookupAt = 0; // Both destinations use the same Wikidata endpoint and rate limit.

function serviceConfig(service, kind) {
  const config = SERVICES[service];
  if (!config || !config.kinds[kind]) return null;
  return { ...config.kinds[kind], property: config.property, hostnames: config.hostnames };
}

export function validTmdbId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function validImdbId(value) {
  const imdb = String(value ?? '').trim();
  return IMDB_RE.test(imdb) ? imdb : null;
}

function normalise(def, identifier) {
  const match = String(identifier ?? '').match(def.property === 'P1258' ? RT_ID_RE : MC_ID_RE);
  if (!match || match[1] !== def.prefix) return null;
  if (def.property === 'P1258') return `https://www.rottentomatoes.com/${match[1]}/${match[2]}`;
  return `https://www.metacritic.com/${match[1]}/${match[2]}/`;
}

/**
 * A direct title URL already rendered by OG, restricted to the exact service host
 * and the title/season shapes both sites use. Bare `metacritic.com` and
 * `rottentomatoes.com` links are accepted; credentials and nonstandard ports are
 * not, while OG tracking parameters are dropped. Deeper paths are left alone
 * because episode slugs vary.
 */
export function validateDirectUrl(service, kind, raw) {
  const config = SERVICES[service];
  const def = config?.kinds[kind];
  if (!def || !raw) return null;

  let url;
  try {
    url = new URL(String(raw));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!config.hostnames.includes(url.hostname)) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (service === 'rotten-tomatoes') {
    if (!segments.length || !['m', 'tv'].includes(segments[0])) return null;
    if (segments[0] !== def.prefix) return null;
    if (segments.length === 2 && RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join('/')}`;
    if (kind === 'show' && segments.length === 3 && /^s\d+$/.test(segments[2]) &&
      RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join('/')}`;
    if (kind === 'show' && segments.length === 4 && /^s\d+$/.test(segments[2]) && /^e\d+$/.test(segments[3]) &&
      RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join('/')}`;
    return null;
  }

  if (!segments.length || !['movie', 'tv'].includes(segments[0])) return null;
  if (segments[0] !== def.prefix || segments.length > 3) return null;
  if (!MC_SLUG_RE.test(segments[1] || '')) return null;
  if (segments.length === 2) return `${url.origin}/${segments.join('/')}/`;
  if (kind === 'show' && /^season-\d+$/.test(segments[2])) return `${url.origin}/${segments.join('/')}/`;
  return null;
}

/** Build the identifier URL for one Wikidata claim value, or null when malformed/kind-mismatched. */
export function externalIdUrl(service, kind, identifier) {
  const def = serviceConfig(service, kind);
  if (!def) return null;
  return normalise(def, identifier);
}

/**
 * Add the route-specific suffix when the page is a season or episode. Episodes
 * fall back to their season page: RT episode URLs include a season/episode
 * number that may not follow Trakt's numbering, and Metacritic's episode slugs
 * are not covered by its Wikidata identifier. Season 0 (specials) stays at the
 * show page for the same reason.
 */
export function buildDestinationUrl(service, baseUrl, context = {}) {
  const def = serviceConfig(service, context.kind);
  if (!def || !baseUrl) return null;
  const season = context.season;
  if (context.kind !== 'show' || !(context.routeName === 'season' || context.routeName === 'episode')) return baseUrl;
  if (!Number.isSafeInteger(season) || season < 1) return baseUrl;
  if (service === 'rotten-tomatoes') return `${baseUrl.replace(/\/+$/, '')}/s${String(season).padStart(2, '0')}`;
  return `${baseUrl.replace(/\/+$/, '')}/season-${season}/`;
}

export function resolverKey({ service, kind, tmdb, imdb }) {
  return `${service}|${kind}|${validTmdbId(tmdb) ?? ''}|${validImdbId(imdb) ?? ''}`;
}

/** A SPARQL query constrained by media class and the kind-specific TMDb property, or IMDb. */
export function buildWikidataQuery({ service, kind, tmdb, imdb }) {
  const def = serviceConfig(service, kind);
  if (!def) throw new Error('Unsupported resolver service or kind.');

  const tmdbId = validTmdbId(tmdb);
  const imdbId = validImdbId(imdb);
  const idClause = tmdbId != null
    ? `?item wdt:${def.tmdbProperty} "${tmdbId}" .`
    : imdbId != null
      ? `?item wdt:P345 "${imdbId}" .`
      : null;
  if (!idClause) throw new Error('No validated TMDb or IMDb id.');

  return [
    'SELECT DISTINCT ?item ?value WHERE {',
    `  ${idClause}`,
    `  ?item wdt:P31/wdt:P279* wd:${def.className} .`,
    `  ?item wdt:${def.property} ?value .`,
    '}',
  ].join('\n');
}

/**
 * Turn the SPARQL response into one identifier URL. A missing row, more than one
 * distinct identifier, or a value of the wrong kind all fail closed to null.
 */
export function parseWikidataResponse(payload, service, kind) {
  const bindings = payload?.results?.bindings;
  if (!Array.isArray(bindings)) throw new Error('Malformed Wikidata response.');

  const values = new Set();
  for (const binding of bindings) {
    const item = binding?.item?.value;
    const value = binding?.value?.value;
    if (typeof item !== 'string' || !WIKIDATA_ITEM_RE.test(item)) throw new Error('Malformed Wikidata item.');
    if (typeof value !== 'string') throw new Error('Malformed Wikidata value.');
    values.add(value);
  }

  if (values.size !== 1) return null;
  return externalIdUrl(service, kind, [...values][0]);
}

function directUrlFor(input) {
  return validateDirectUrl(input.service, input.kind, input.directUrl);
}

function fetchBase(input, { fetchImpl }) {
  const query = buildWikidataQuery(input);
  const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
  const fetchJson = fetchImpl || ((target) => getJSON(target, {
    headers: {
      Accept: 'application/sparql-results+json',
      'Api-User-Agent': `TraktOGToolkit/${VERSION} (https://github.com/Ezo-mas/trakt-og-toolkit)`,
    },
    timeout: RESOLVE_TIMEOUT_MS,
    retries: 0,
  }));
  return Promise.resolve(fetchJson(url)).then((payload) => parseWikidataResponse(payload, input.service, input.kind));
}

/** Parse Retry-After seconds or an HTTP date; use a bounded fallback when the header is unusable. */
export function retryAfterMs(value, nowMs = Date.now()) {
  if (value == null || value === '') return DEFAULT_COOLDOWN_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(String(value));
  if (Number.isFinite(date)) return Math.max(0, date - nowMs);
  return DEFAULT_COOLDOWN_MS;
}

function coolingDown(now) {
  return nextLookupAt > now();
}

function recordCooldown(error, now) {
  const at = now();
  nextLookupAt = Math.max(nextLookupAt, at + retryAfterMs(headerValue(error?.headers, 'retry-after'), at));
}

/** Return a successful mapping already in memory, so a warm click can upgrade before navigation. */
export function peekExternalUrl(input, options = {}) {
  const direct = directUrlFor(input);
  if (direct) return direct;
  if (!serviceConfig(input.service, input.kind)) return null;

  const now = options.now || Date.now;
  const hit = cache.get(resolverKey(input));
  if (!hit || hit.expires <= now()) return null;
  return hit.url ? buildDestinationUrl(input.service, hit.url, input.context) : null;
}

/**
 * Resolve one service/title pair. Concurrent callers share one request; successful
 * mappings and genuine misses are cached, while transport errors are not cached
 * so the next activation retries. The promise resolves to a destination URL or null.
 */
export function resolveExternalUrl(input, options = {}) {
  const direct = directUrlFor(input);
  if (direct) return Promise.resolve(direct);
  if (!serviceConfig(input.service, input.kind)) return Promise.resolve(null);
  if (validTmdbId(input.tmdb) == null && validImdbId(input.imdb) == null) return Promise.resolve(null);

  const now = options.now || Date.now;
  const key = resolverKey(input);
  const hit = cache.get(key);
  if (hit && hit.expires > now()) {
    return Promise.resolve(hit.url ? buildDestinationUrl(input.service, hit.url, input.context) : null);
  }
  // A Wikidata 429 blocks both destinations; cached and native links remain usable.
  if (coolingDown(now)) return Promise.resolve(null);

  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchBase(input, { fetchImpl: options.fetchImpl })
      .then((url) => {
        cache.set(key, { url, expires: now() + (url ? HIT_TTL_MS : MISS_TTL_MS) });
        return url;
      })
      .catch((error) => {
        if (error?.status === 429) {
          recordCooldown(error, now);
          return null;
        }
        throw error;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  return pending.then((url) => (url ? buildDestinationUrl(input.service, url, input.context) : null));
}

/** Test hook; resolver memory is intentionally process-wide otherwise. */
export function resetResolverCache() {
  cache.clear();
  inflight.clear();
  nextLookupAt = 0;
}
