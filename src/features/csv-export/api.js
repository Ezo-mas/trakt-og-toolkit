/** List and watchlist reads for the exporter, through the toolkit sign-in, og's session or the public API. */
import { apiAuthPage, apiGet, isSignedIn } from '../../core/trakt.js';

export const PAGE_SIZE = 100;
/** Defensive cap for page walking; signed-in reads are capped too. */
export const MAX_PAGES = 200;
const BATCH = 4;
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

/** A positive page count, or null when Trakt did not send the header. */
function pageCount(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function createExportApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
  /** Every page, in API order. `publicOnly` keeps official-list reads on the public transport. */
  async function readAll(path, { publicOnly = false } = {}) {
    const authenticated = !publicOnly && signedIn();
    const read = async (page, limit = PAGE_SIZE) => {
      if (authenticated) return (await authPage(path, { page, limit })) ?? { data: [], pages: null };
      return get(`${path}?page=${page}&limit=${limit}`, { ttl: 0, withHeaders: true });
    };

    const rows = [];
    let total = null;
    for (let page = 1; page <= MAX_PAGES;) {
      const last = total == null ? page : Math.min(total, page + BATCH - 1);
      const batch = await Promise.all(Array.from({ length: last - page + 1 }, (_, offset) => read(page + offset)));
      for (const { data, pages } of batch) {
        const reported = pageCount(pages);
        if (reported != null) total = Math.max(total ?? 0, reported);
        if (total > MAX_PAGES) throw exportLimitError();
        if (!Array.isArray(data) || (!data.length && total > 1)) throw incompleteExportError();
        rows.push(...data);
        if (total == null ? data.length < PAGE_SIZE : page >= total) return rows;
        page++;
      }
    }
    // Without a count, a full final page could be the exact limit. Ask for just the next item.
    const { data } = await read(MAX_PAGES * PAGE_SIZE + 1, 1);
    if (!Array.isArray(data)) throw incompleteExportError();
    if (data.length) throw exportLimitError();
    return rows;
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
