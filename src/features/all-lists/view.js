/** The All lists view: og's page with the profile's collaborations and liked lists appended. */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { MissingClientIdError, isSignedIn } from '../../core/trakt.js';
import { collaborationLists, likedLists } from './data.js';
import { getCollaborationLists, getLikedLists, getViewer } from './api.js';
import { createRows, nativeParts, postersFor } from './rows.js';

const ROOT_ID = 'ogt-all-lists';

export function createView(profile, lists) {
  const container = lists.querySelector(':scope > .container');
  // og's own section and container classes give the view the page's background and width.
  const node = el('div', { id: ROOT_ID, class: `${lists.className} ogt-all-lists` });
  let cancelled = false;
  let loadRevision = 0;
  let loading = null;
  let observer = null;

  function group(name, title, rows, empty) {
    return el('div', { role: 'region', class: `ogt-all-lists__group ogt-all-lists__group--${name}`, 'aria-label': title },
      el('div', { class: container?.className || 'container' },
        el('h2', { class: 'ogt-all-lists__heading', text: title }),
        rows.length ? el('div', { class: 'rows' }, rows) : el('p', { class: 'ogt-all-lists__empty', text: empty })));
  }

  async function load() {
    const revision = ++loadRevision;
    observer?.disconnect();
    observer = null;
    node.replaceChildren(el('p', { class: 'ogt-all-lists__loading', text: 'Loading collaborations and liked lists…' }));
    const results = await Promise.allSettled([getCollaborationLists(profile), getLikedLists(profile),
      isSignedIn() ? getViewer() : Promise.resolve(null)]);
    if (cancelled || revision !== loadRevision) return;
    for (const result of results) if (result.status === 'rejected') debugError('all-lists lookup failed', result.reason);
    const [collaborations, liked, viewer] = results.map((result) => (result.status === 'fulfilled' ? result.value : null));
    const viewerSlug = viewer?.ids?.slug || viewer?.username || null;
    const likedRows = likedLists(liked);
    // Which lists the viewer liked fills their likes pill, as og does. On the viewer's own profile that's every
    // liked row; elsewhere it takes the viewer's own liked lists.
    let likedIds = new Set();
    if (viewerSlug === profile) likedIds = new Set(likedRows.map((entry) => entry.id));
    else if (viewerSlug) {
      try { likedIds = new Set(likedLists(await getLikedLists(viewerSlug)).map((entry) => entry.id)); }
      catch (error) { debugError('viewer liked lists lookup failed', error); }
      if (cancelled || revision !== loadRevision) return;
    }
    const native = nativeParts(lists);
    node.classList.toggle('ogt-all-lists--fallback', !native);
    const row = createRows(native);

    const waiting = new Map();
    const likedNodes = likedRows.map((entry) => {
      const pending = entry.itemCount > 0 && !entry.posters.length;
      const rowNode = row(entry, { viewerSlug, loading: pending, liked: likedIds.has(entry.id) });
      if (pending) waiting.set(rowNode, entry);
      return rowNode;
    });
    node.replaceChildren(
      group('collaborations', 'Collaborations', collaborationLists(collaborations).map((entry) => row(entry, { viewerSlug, liked: likedIds.has(entry.id) })), 'No collaborations.'),
      group('liked', 'Liked', likedNodes, 'No liked lists.'));

    const failed = results.slice(0, 2).filter((result) => result.status === 'rejected');
    if (failed.length) {
      const missing = failed.find((result) => result.reason instanceof MissingClientIdError)?.reason;
      node.prepend(el('p', { class: 'ogt-all-lists__error', role: 'status', text: missing?.ogSession ? missing.message
        : missing ? 'Set a Trakt API client ID in the toolkit menu to load collaborations and liked lists.'
          : 'Some lists could not be loaded. Try again later.' }));
    }

    // Liked lists arrive without posters: read each list's summary as its row nears the screen.
    const fill = (rowNode) => {
      const entry = waiting.get(rowNode);
      waiting.delete(rowNode);
      void postersFor(entry.id).then((posters) => { if (!cancelled) rowNode.setPosters(posters); });
    };
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (!change.isIntersecting || !waiting.has(change.target)) continue;
          observer.unobserve(change.target);
          fill(change.target);
        }
      }, { rootMargin: '300px' });
      for (const rowNode of waiting.keys()) observer.observe(rowNode);
    } else {
      for (const rowNode of [...waiting.keys()]) fill(rowNode);
    }
  }

  function startLoad() {
    loading ??= load().catch((error) => debugError('all-lists render failed', error));
    return loading;
  }
  return {
    node,
    load: startLoad,
    destroy() {
      cancelled = true;
      loadRevision += 1;
      loading = null;
      observer?.disconnect();
      node.remove();
    },
  };
}
