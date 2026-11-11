/**
 * Export a personal, collaboration or liked list, or the watchlist, to CSV.
 *
 * The whole list is read page by page through the API, not from the rows og has loaded, and the file is assembled
 * in the browser with a Blob. No list data leaves the browser; only the normal Trakt API reads happen.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { parseRoute } from '../../core/router.js';
import { MissingClientIdError } from '../../core/trakt.js';
import { exportApi } from './api.js';
import { exportFilename, exportItems, toCsv } from './data.js';
import { CSS } from './styles.js';

const ID = 'ogt-csv-export';

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function failureHint(error, target) {
  if (error?.exportLimit) return `This ${target} is too large to export as one CSV.`;
  if (error?.exportIncomplete) return `Could not read this ${target} completely. Try again later.`;
  if (error instanceof MissingClientIdError) {
    return error.ogSession
      ? error.message
      : `Sign in to og.trakt.tv or set a Trakt client ID to export this ${target}.`;
  }
  // og owns its renewal: an expired or rejected og token needs a reload, not a new sign-in.
  if (error?.ogSession) return error.message || 'Your og.trakt.tv session expired; reload the page to renew it.';
  if (error?.status === 403 || error?.status === 404) return `This ${target} is private or unavailable.`;
  if (error?.status === 401) return `Sign in to Trakt to export this ${target}.`;
  return `Could not read this ${target}. Try again later.`;
}

export const csvExport = {
  id: 'csv-export',
  css: CSS,
  authScoped: true,
  match: (route) => route.name === 'list' || route.name === 'watchlist' || route.name === 'official-list',
  mount(route) {
    const actions = document.querySelector('section.title-row .title-bar .actions');
    if (!actions || document.getElementById(ID)) return null;

    const watchlist = route.name === 'watchlist';
    const official = route.name === 'official-list';
    const target = watchlist ? 'watchlist' : 'list';
    const profile = official ? null : decodePart(route.id);
    const slug = watchlist ? null : decodePart(route.slug);

    const button = el('button', {
      type: 'button',
      class: 'ogt-csv-export__button',
      title: `Download this ${target} as a CSV file`,
      text: 'Export CSV',
    });
    const status = el('span', { class: 'ogt-csv-export__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-csv-export' }, button, status);
    const share = [...actions.children].find((child) => child.classList.contains('share'));
    actions.insertBefore(node, share ?? null);

    let active = true;
    let busy = false;
    let objectUrl = null;
    let revokeTimer = null;

    function releaseObjectUrl() {
      clearTimeout(revokeTimer);
      revokeTimer = null;
      if (!objectUrl) return;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* the URL is already gone */
      }
      objectUrl = null;
    }

    /** Hand the finished document to the browser as a download; nothing is uploaded. */
    function save(filename, csv) {
      releaseObjectUrl();
      objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.hidden = true;
      (document.body ?? document.documentElement).append(anchor);
      anchor.click();
      anchor.remove();
      // Let the click start the download before releasing the blob URL.
      revokeTimer = setTimeout(() => {
        revokeTimer = null;
        if (!objectUrl) return;
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* the URL is already gone */
        }
        objectUrl = null;
      }, 0);
    }

    async function run() {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.textContent = 'Exporting…';
      status.textContent = watchlist ? 'Reading watchlist…' : 'Reading list…';

      try {
        const rows = watchlist ? await exportApi.watchlist(profile)
          : official ? await exportApi.official(slug)
            : await exportApi.list(profile, slug);
        if (!active) return;

        const items = exportItems(rows);
        // The router's teardown is debounced; a navigation can land while the pages are still being read.
        if (parseRoute().key !== route.key) return;
        save(exportFilename(route), toCsv(items));
        status.textContent = `Exported ${items.length} ${items.length === 1 ? 'item' : 'items'}.`;
      } catch (error) {
        if (objectUrl) releaseObjectUrl();
        debugError('CSV export failed', error);
        if (!active) return;
        status.textContent = failureHint(error, target);
      } finally {
        if (active) {
          busy = false;
          button.disabled = false;
          button.textContent = 'Export CSV';
        }
      }
    }

    button.addEventListener('click', run);

    return {
      node,
      destroy() {
        active = false;
        button.removeEventListener('click', run);
        releaseObjectUrl();
        node.remove();
      },
    };
  },
};
