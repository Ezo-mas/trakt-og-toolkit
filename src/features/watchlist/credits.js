import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { toast } from '../../ui/shell.js';
import { watchlistApi } from './api.js';
import { readCardWatchlisted, readCreditControl, readCreditRoute } from './data.js';
import { watchlistIcon } from './icon.js';
import { createNativeWatchlistRefresh } from './native-refresh.js';
import { notifyWatchlistAdded } from './notification.js';

const ID = 'ogt-watchlist-credits';
const ROW = 'article.credit-row';

export const watchlistCredits = {
  id: 'watchlist-credits',
  match: route => route?.name === 'person',
  css: `
    .ogt-watchlist-credit { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 32px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-credit[hidden] { display: none !important; }
    .ogt-watchlist-credit svg { width: 16px; height: 20px; stroke-linejoin: round; }
    .ogt-watchlist-credit:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-credit:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-credit:disabled { opacity: .6; cursor: default; }
  `,
  mount() {
    if (!document.body || document.getElementById(ID)) return null;
    // A page-owned marker keeps this mounted while the credits list re-renders.
    const node = el('span', { id: ID, hidden: true });
    document.body.append(node);
    const entries = new Map();
    const states = new Map();
    const nativeRefresh = createNativeWatchlistRefresh();
    let destroyed = false, session = 0, scheduled = false;

    function stateFor(key) {
      if (!states.has(key)) states.set(key, {
        busy: false, undoing: false, operation: 0, added: false, wasWatchlisted: false,
      });
      return states.get(key);
    }
    function remove(entry) {
      entry.button.removeEventListener('click', entry.click);
      entry.button.remove();
      entries.delete(entry.control);
    }
    function updateButton(entry, state) {
      entry.button.hidden = state.added || state.wasWatchlisted;
      entry.button.disabled = state.busy || state.undoing;
      const busy = String(state.busy || state.undoing);
      if (entry.button.getAttribute('aria-busy') !== busy) entry.button.setAttribute('aria-busy', busy);
    }
    async function add(entry, event) {
      event.preventDefault();
      event.stopPropagation();
      const state = stateFor(entry.key);
      if (state.busy || state.undoing || entry.button.hidden) return;
      if (!isSignedIn()) { toast('Sign in to Trakt through the toolkit menu first.'); return; }
      const epoch = session;
      const operation = ++state.operation;
      const pagePath = location.pathname;
      const active = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some(e =>
        e.key === entry.key && e.control.isConnected && readCreditRoute(e.row)?.key === entry.key);
      state.busy = true;
      scan();
      try {
        const result = await watchlistApi.add(entry.route, { active });
        if (!active() || result.cancelled) return;
        state.added = true;
        scan();
        void notifyWatchlistAdded({
          title: result.title,
          active,
          onUndo: result.undoable ? () => undo(entry, result.body) : undefined,
        });
        await nativeRefresh.refresh(entry.control, entry.route, { active });
      } catch (error) {
        debugError('credit watchlist addition failed', error);
        if (active()) toast(error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not add to watchlist. Check your toolkit sign-in and try again.' : error.message);
      } finally {
        if (!destroyed && epoch === session && state.operation === operation) {
          state.busy = false;
          scan();
        }
      }
    }
    async function undo(entry, body) {
      const state = stateFor(entry.key);
      if (state.undoing || !body) return false;
      if (!isSignedIn()) { toast('Sign in to Trakt through the toolkit menu first.'); return false; }
      const epoch = session;
      const operation = ++state.operation;
      const pagePath = location.pathname;
      const active = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some(e =>
        e.key === entry.key && e.control.isConnected && readCreditRoute(e.row)?.key === entry.key);
      state.undoing = true;
      state.busy = false;
      scan();
      try {
        await watchlistApi.remove(body, { active });
        if (!active()) return false;
        state.added = false;
        scan();
        await nativeRefresh.refresh(entry.control, entry.route, { active });
        return true;
      } catch (error) {
        debugError('credit watchlist undo failed', error);
        if (active()) toast(error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not undo. Check your toolkit sign-in and try again.' : error.message);
        return false;
      } finally {
        if (!destroyed && epoch === session && state.operation === operation) {
          state.undoing = false;
          state.busy = false;
          scan();
        }
      }
    }
    function scan() {
      if (destroyed) return;
      for (const entry of entries.values()) {
        if (!entry.control.isConnected || !entry.button.isConnected || readCreditRoute(entry.row)?.key !== entry.key) remove(entry);
      }
      for (const row of document.querySelectorAll(ROW)) {
        const control = readCreditControl(row);
        const route = readCreditRoute(row);
        if (!control || !route || entries.has(control)) continue;
        const button = el('button', { type: 'button', class: 'ogt-watchlist-credit',
          'aria-label': 'Add to watchlist', title: 'Add to watchlist using the toolkit’s Trakt account' }, watchlistIcon());
        const entry = { row, control, route, key: route.key, button };
        entry.click = event => add(entry, event);
        button.addEventListener('click', entry.click);
        control.after(button);
        entries.set(control, entry);
      }
      const native = new Map();
      for (const entry of entries.values()) {
        native.set(entry.key, Boolean(native.get(entry.key) || readCardWatchlisted(entry.control)));
      }
      for (const [key, watchlisted] of native) {
        const state = stateFor(key);
        if (state.wasWatchlisted && !watchlisted) state.added = false;
        state.wasWatchlisted = watchlisted;
      }
      for (const entry of entries.values()) updateButton(entry, stateFor(entry.key));
    }
    function schedule() {
      if (scheduled || destroyed) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; scan(); });
    }
    function authChanged() {
      session++;
      nativeRefresh.destroy();
      states.clear();
      scan();
    }
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['href', 'aria-describedby'] });
    document.addEventListener('ogt:authchange', authChanged);
    scan();
    return { node, destroy() {
      destroyed = true;
      nativeRefresh.destroy();
      observer.disconnect();
      document.removeEventListener('ogt:authchange', authChanged);
      for (const entry of entries.values()) remove(entry);
      states.clear();
      node.remove();
    } };
  },
};
