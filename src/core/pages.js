/** Reading a paginated Trakt list (watchlists, list items) in API order. */

export const PAGE_SIZE = 100;
/** Pages read at once when the page count is known: faster than one at a time without a large burst. */
export const PAGE_BATCH = 4;

/** A required page was missing or malformed, so the rows would be partial. */
export class IncompletePagesError extends Error {
  constructor() {
    super('Incomplete Trakt list response.');
    this.name = 'IncompletePagesError';
  }
}

/** A positive page count, or null when Trakt did not send one. */
function pageCount(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Read every page up to `maxPages`. `read(page, limit)` resolves `{ data, pages }`, where `pages` is Trakt's
 * `x-pagination-page-count` or null. Page 1 is read alone. Once a count is known the rest are read `PAGE_BATCH` at a
 * time; without one, pages are read one by one until a short page. If all `maxPages` pages are full and there is no
 * count, one item past the limit shows whether anything was left out.
 *
 * Resolves `{ rows, limited }`. `limited` means the list has more than `maxPages` pages. With `stopAtLimit`, reading
 * stops as soon as a page count shows that, for callers that refuse a partial result.
 */
export async function readPages(read, { maxPages, stopAtLimit = false } = {}) {
  const rows = [];
  let total = null;
  let page = 1;
  while (page <= maxPages) {
    const last = total == null ? page : Math.min(total, maxPages, page + PAGE_BATCH - 1);
    const numbers = Array.from({ length: last - page + 1 }, (_, index) => page + index);
    const results = await Promise.all(numbers.map((number) => read(number, PAGE_SIZE)));
    for (const [index, result] of results.entries()) {
      const number = numbers[index];
      // An empty body or 204 comes back as null: an empty page.
      const { data, pages } = result ?? { data: [], pages: null };
      const reported = pageCount(pages);
      if (reported != null) total = Math.max(total ?? 0, reported);
      if (stopAtLimit && total > maxPages) return { rows, limited: true };
      // An empty page is only the end of a one-page list; when Trakt counts several pages, it is a gap.
      if (!Array.isArray(data) || (!data.length && total > 1)) throw new IncompletePagesError();
      rows.push(...data);
      if (total == null ? data.length < PAGE_SIZE : number >= total) return { rows, limited: false };
    }
    page = last + 1;
  }
  if (total != null) return { rows, limited: true };
  const { data } = (await read(maxPages * PAGE_SIZE + 1, 1)) ?? { data: [] };
  if (!Array.isArray(data)) throw new IncompletePagesError();
  return { rows, limited: data.length > 0 };
}
