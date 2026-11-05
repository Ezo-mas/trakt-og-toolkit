/** Trakt media URLs carry the type and numeric id in three padded groups. */
const POSTER_PATH = /^(?:https?:)?\/\/media\.trakt\.tv\/images\/(shows|movies)\/(\d{3})\/(\d{3})\/(\d{3})\/posters\//i;

export function readPosterRoute(src) {
  if (typeof src !== 'string') return null;
  const match = src.match(POSTER_PATH);
  if (!match) return null;
  const id = Number(`${match[2]}${match[3]}${match[4]}`);
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
