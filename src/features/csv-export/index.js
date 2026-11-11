/**
 * Export a personal, collaboration or liked list, or the watchlist, to CSV.
 *
 * The whole list is read page by page through the API, not from the rows og has loaded, and the file is assembled
 * in the browser with a Blob. No list data leaves the browser; only the normal Trakt API reads happen.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { parseRoute } from '../../core/router.js';
import { decodePathPart } from '../../core/text.js';
import { listReadFailureHint } from '../../core/trakt.js';
import { exportApi } from './api.js';
import { exportFilename, exportItems, toCsv } from './data.js';
import { CSS } from './styles.js';

const ID = 'ogt-csv-export';
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

function exportFailureHint(error, target) {
  if (error?.exportLimit) return `This ${target} is too large to export as one CSV.`;
  if (error?.exportIncomplete) return `Could not read this ${target} completely. Try again later.`;
  return listReadFailureHint(error, target, 'export');
}

function save(filename, csv) {
  // The UTF-8 marker lets Excel open the file with the correct encoding.
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  (document.body ?? document.documentElement).append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // The browser may still be starting the download after the feature unmounts.
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
  }
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
    const profile = official ? null : decodePathPart(route.id);
    const slug = watchlist ? null : decodePathPart(route.slug);

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
        debugError('CSV export failed', error);
        if (!active) return;
        status.textContent = exportFailureHint(error, target);
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
        node.remove();
      },
    };
  },
};
