import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { watchlistApi } from './api.js';
import { readWatchlisted, watchlistLookup } from './data.js';
import { css } from './styles.js';
import { debugError } from '../../core/log.js';
import { toast } from '../../ui/shell.js';
import { findActionStack } from '../../ui/action-button.js';
import { watchlistIcon } from './icon.js';
import { createNativeWatchlistRefresh } from './native-refresh.js';

const ID = 'ogt-watchlist';
export const watchlist = {
  id: 'watchlist',
  css,
  match: route => Boolean(watchlistLookup(route)),
  mount(route) {
    const anchor = findActionStack();
    if (!anchor || document.getElementById(ID)) return null;
    let destroyed = false;
    let busy = false;
    let session = 0;
    let added = false;
    let wasWatchlisted = false;
    const nativeRefresh = createNativeWatchlistRefresh();
    const pagePath = location.pathname;
    const label = el('span', { class: 'ogt-watchlist__title', text: 'Add to watchlist' });
    const glyph = el('span', { class: 'ogt-watchlist__glyph', 'aria-hidden': 'true' });
    glyph.append(watchlistIcon());
    const button = el('button', { type: 'button', class: 'ogt-watchlist__button',
      title: 'Add using the toolkit’s Trakt account' });
    button.append(glyph, el('span', { class: 'ogt-watchlist__text' }, label));
    const status = el('p', { class: 'ogt-watchlist__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-watchlist' }, button, status);
    function syncVisibility() {
      const watchlisted = readWatchlisted(anchor);
      if (wasWatchlisted && !watchlisted) added = false;
      wasWatchlisted = watchlisted;
      node.hidden = added || watchlisted;
    }
    async function add() {
      if (busy || node.hidden) return;
      if (!isSignedIn()) { status.textContent = 'Sign in to Trakt through the toolkit menu first.'; return; }
      busy = true;
      const epoch = session;
      button.disabled = true;
      label.textContent = 'Adding to watchlist…';
      status.textContent = '';
      const active = () => !destroyed && epoch === session && location.pathname === pagePath;
      try {
        const result = await watchlistApi.add(route, { active });
        if (!active()) return;
        if (!result.cancelled) {
          added = true;
          syncVisibility();
          toast('Added to your watchlist.');
          await nativeRefresh.refresh(anchor.querySelector('.list-control.summary'), route, { active });
          return;
        }
      } catch (error) {
        debugError('watchlist addition failed', error);
        if (active()) status.textContent = error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not add to watchlist. Check your toolkit sign-in and try again.' : error.message;
      } finally {
        if (active()) {
          busy = false;
          button.disabled = false;
          label.textContent = 'Add to watchlist';
        }
      }
    }
    function authChanged() {
      session++;
      nativeRefresh.destroy();
      busy = false;
      button.disabled = false;
      added = false;
      wasWatchlisted = false;
      label.textContent = 'Add to watchlist';
      status.textContent = '';
      syncVisibility();
    }
    button.addEventListener('click', add);
    document.addEventListener('ogt:authchange', authChanged);
    // Follow the same hydration-gated mount and native-state observer as the library action.
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
