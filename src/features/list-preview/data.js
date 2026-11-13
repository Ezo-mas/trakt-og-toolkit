/**
 * Trakt poster URLs carry the type and numeric Trakt id. The API's paths pad the id into three groups
 * (`images/shows/000/137/178/posters/…`); og's list fans now use the short form (`shows/137178/thumb/poster.webp`).
 */
const POSTER_PATH = /^(?:https?:)?\/\/media\.trakt\.tv\/images\/(shows|movies)\/(\d{3})\/(\d{3})\/(\d{3})\/posters\//i;
const SHORT_POSTER_PATH = /^(?:https?:)?\/\/media\.trakt\.tv\/(shows|movies)\/(\d{1,12})\/(?:thumb|medium|full)\/poster\.[a-z]+(?:[?#]|$)/i;

export function readPosterRoute(src) {
  if (typeof src !== 'string') return null;
  const padded = src.match(POSTER_PATH);
  const short = padded ? null : src.match(SHORT_POSTER_PATH);
  const match = padded ?? short;
  if (!match) return null;
  const id = Number(padded ? `${match[2]}${match[3]}${match[4]}` : match[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const kind = match[1].toLowerCase() === 'shows' ? 'show' : 'movie';
  return { kind, id, href: `/${kind === 'show' ? 'shows' : 'movies'}/${id}` };
}

/** A preview slot's tooltip holds the title; its poster image holds the route. */
export function readListPoster(slot) {
  const poster = slot?.querySelector?.('img.poster[src]');
  const route = readPosterRoute(poster?.getAttribute('src'));
  if (!route) return null;
  const doc = slot.ownerDocument;
  const describedBy = slot.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
  const title = describedBy
    .map((id) => doc?.getElementById(id))
    .flatMap((tooltip) => [...(tooltip?.querySelectorAll('.text') ?? [])])
    .map((node) => node.textContent.trim())
    .find(Boolean);
  return { ...route, title: title || 'this title' };
}
