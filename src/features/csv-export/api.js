/** List and watchlist reads for the exporter, through the toolkit sign-in, og's session or the public API. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';
import { IncompletePagesError, PAGE_SIZE, readPages } from '../../core/pages.js';

/** Defensive cap for page walking; signed-in reads are capped too. */
export const MAX_PAGES = 200;
export { PAGE_SIZE };
const SEARCH_LIMIT = 25;

function traktId(list) {
  const id = list?.ids?.trakt;
  if (Number.isSafeInteger(id) && id > 0) return id;
  if (typeof id === 'string' && /^\d+$/.test(id)) return id;
  return '';
}

function missingOfficial() {
  const error = new Error('Official list not found.');
  error.status = 404;
  return error;
}

function exportLimitError() {
  const error = new Error('This list is too large to export as one CSV.');
  error.exportLimit = true;
  return error;
}

function incompleteExportError() {
  const error = new Error('The list changed while it was being read.');
  error.exportIncomplete = true;
  return error;
}

export function createExportApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  /** Every page, in API order. `publicOnly` keeps official-list reads on the public transport. */
  async function readAll(path, { publicOnly = false } = {}) {
    const authenticated = !publicOnly && signedIn();
    // Public reads skip the shared cache, which would keep removed titles, and keep the page count.
    const read = (page, limit) => (authenticated
      ? authPage(path, { page, limit })
      : get(`${path}?page=${page}&limit=${limit}`, { ttl: 0, withHeaders: true }));
    let result;
    try {
      result = await readPages(read, { maxPages: MAX_PAGES, stopAtLimit: true });
    } catch (error) {
      throw error instanceof IncompletePagesError ? incompleteExportError() : error;
    }
    // A partial CSV would look complete, so an oversized list fails instead.
    if (result.limited) throw exportLimitError();
    return result.rows;
  }

  /** Official lists need their numeric id: `/lists/:id/items`; a slug can also belong to a personal list. */
  async function officialId(slug) {
    let summary;
    try {
      summary = await get(`/lists/${encodeURIComponent(slug)}`);
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
    if (summary?.type === 'official') {
      const id = traktId(summary);
      if (id) return id;
      throw missingOfficial();
    }
    // A numeric slug is an id, not a search term.
    if (/^\d+$/.test(slug)) throw missingOfficial();
    const query = slug.replaceAll('-', ' ');
    const results = await get(`/search/list?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`);
    if (!Array.isArray(results)) throw missingOfficial();
    const match = results.find((row) => row?.list?.type === 'official' && row.list.ids?.slug === slug);
    const id = traktId(match?.list);
    if (!id) throw missingOfficial();
    return id;
  }

  return {
    /** Personal, collaboration and liked list pages all resolve through the list's owner path. */
    list(profile, slug) {
      return readAll(`/users/${encodeURIComponent(profile)}/lists/${encodeURIComponent(slug)}/items`);
    },
    watchlist(profile) {
      return readAll(`/users/${encodeURIComponent(profile)}/watchlist`);
    },
    /** Official lists are public and have no profile owner. */
    async official(slug) {
      const id = await officialId(slug);
      return readAll(`/lists/${id}/items`, { publicOnly: true });
    },
  };
}

export const exportApi = createExportApi();
