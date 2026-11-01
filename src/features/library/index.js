import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { libraryApi } from './api.js';
import { notifySuccess } from '../../ui/success-notification.js';
import { createNativeLibraryRefresh } from './native-refresh.js';
import { readLibraryTitle } from './data.js';
import { debugError } from '../../core/log.js';
import { actionButtonCss, findActionStack } from '../../ui/action-button.js';

const ID = 'ogt-library';
export const library = {
  id: 'library',
  css: actionButtonCss('ogt-library', 'var(--brand-quaternary, #129982)'),
  match: route => route.kind === 'movie' && route.name === 'title' || route.kind === 'show' && ['title', 'season', 'episode'].includes(route.name),
  mount(route) {
    const anchor = findActionStack();
    if (!anchor || document.getElementById(ID)) return null;
    let destroyed = false;
    let busy = false;
    let session = 0;
    let added = false;
    let refreshing = false;
    let wasCollected = false;
    const nativeRefresh = createNativeLibraryRefresh();
    const doc = anchor.ownerDocument;
    const pagePath = doc.location.pathname;
    const label = el('span', { class: 'ogt-library__title', text: 'Add to library' });
    const glyph = el('span', { class: 'ogt-library__glyph', 'aria-hidden': 'true' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 28', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' })) svg.setAttribute(name, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 2h17v24H3V4a2 2 0 0 1 2-2Z M3 5H1V2a2 2 0 0 1 2-2h17v2 M14 2v8l3-2 3 2V2');
    svg.append(path);
    glyph.append(svg);
    const button = el('button', { type: 'button', class: 'ogt-library__button',
      title: 'Add using the toolkit’s Trakt account' });
    button.append(glyph, el('span', { class: 'ogt-library__text' }, label));
    const status = el('p', { class: 'ogt-library__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-library' }, button, status);
    function syncVisibility() {
      const titles = [...anchor.querySelectorAll('.summary-action .title')].filter(title => !node.contains(title));
      const collected = titles.some(title => /\bin library\b/i.test(title.textContent));
      if (wasCollected && !collected) added = false;
      wasCollected = collected;
      const nativeLibrary = collected || titles.some(title => /\badd to library\b/i.test(title.textContent));
      node.hidden = nativeLibrary || (added && !refreshing);
    }
    async function add() {
      if (busy || node.hidden) return;
      if (!isSignedIn()) { status.textContent = 'Sign in to Trakt through the toolkit menu first.'; return; }
      busy = true;
      const epoch = session;
      button.disabled = true;
      label.textContent = 'Adding to library…';
      status.textContent = '';
      const active = () => !destroyed && epoch === session && node.isConnected && doc.location.pathname === pagePath;
      const title = readLibraryTitle(doc);
      void nativeRefresh.prepare(route, { active }).catch(error => debugError('native library preparation unavailable', error));
      try {
        const result = await libraryApi.add(route, { confirm: message => window.confirm(message), active });
        if (!active()) return;
        if (!result.cancelled) {
          added = true;
          refreshing = route.name === 'title';
          label.textContent = 'Updating library…';
          syncVisibility();
          void notifySuccess(`You added ${title} to your library.`, active);
          try { await nativeRefresh.refresh(route, { active }); }
          catch (error) { debugError('native library refresh unavailable', error); }
          return;
        }
      } catch (error) {
        if (active()) status.textContent = error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not add to library. Check your toolkit sign-in and try again.' : error.message;
      } finally {
        if (active()) {
          busy = false;
          refreshing = false;
          syncVisibility();
          button.disabled = false;
          label.textContent = 'Add to library';
        }
      }
    }
    function authChanged() {
      session++;
      nativeRefresh.destroy();
      busy = false;
      refreshing = false;
      button.disabled = false;
      added = false;
      wasCollected = false;
      label.textContent = 'Add to library';
      status.textContent = '';
      syncVisibility();
    }
    button.addEventListener('click', add);
    document.addEventListener('ogt:authchange', authChanged);
    // Keep OG's own controls intact; this is a separate manual-add action.
    const history = anchor.querySelector('.stacked');
    if (history) history.after(node);
    else anchor.append(node);
    const observer = new MutationObserver(syncVisibility);
    observer.observe(anchor, { childList: true, subtree: true, characterData: true });
    syncVisibility();
    return { node, destroy() {
      destroyed = true;
      nativeRefresh.destroy();
      observer.disconnect();
      button.removeEventListener('click', add);
      document.removeEventListener('ogt:authchange', authChanged);
      node.remove();
    } };
  },
};
