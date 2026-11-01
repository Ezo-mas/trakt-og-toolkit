import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { toast } from '../../ui/shell.js';
import { watchlistApi } from './api.js';
import { readCardRoute, readCardWatchlisted } from './data.js';
import { watchlistIcon } from './icon.js';
import { createNativeWatchlistRefresh } from './native-refresh.js';
import { notifyWatchlistAdded } from './notification.js';

const ID = 'ogt-watchlist-cards';
const CARD = '.poster-card, .fanart-card';
const CONTROL = '.quick-icons .list-control.card, .quick-icons button.action.list';

export const watchlistCards = {
  id: 'watchlist-cards',
  match: () => true,
  css: `
    .ogt-watchlist-card { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 40px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-card[hidden] { display: none !important; }
    .ogt-watchlist-card svg { width: 20px; height: 24px; stroke-linejoin: round; }
    .quick-icons.small .ogt-watchlist-card { block-size: calc(var(--bar, 35px) - 1px); }
    .quick-icons.small .ogt-watchlist-card svg { width: 16px; height: 20px; }
    .ogt-watchlist-card:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-card:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-card:disabled { opacity: .6; cursor: default; }
  `,
  mount() {
    if (!document.body || document.getElementById(ID)) return null;
    // A host-owned marker keeps this page-wide feature alive when the first card is replaced.
    const node = el('span', { id: ID, hidden: true });
    document.body.append(node);
    const entries = new Map();
    const states = new Map();
    const nativeRefresh = createNativeWatchlistRefresh();
    let destroyed = false, session = 0, scheduled = false;

    function stateFor(key) {
      if (!states.has(key)) states.set(key, { busy: false, added: false, wasWatchlisted: false });
      return states.get(key);
    }
    function remove(entry) {
      entry.button.removeEventListener('click', entry.click);
      entry.button.remove();
      entries.delete(entry.control);
    }
    async function add(entry, event) {
      event.preventDefault();
      event.stopPropagation();
      const state = stateFor(entry.key);
      if (state.busy || entry.button.hidden) return;
      if (!isSignedIn()) { toast('Sign in to Trakt through the toolkit menu first.'); return; }
      const epoch = session;
      const pagePath = location.pathname;
      const active = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some(e =>
        e.key === entry.key && e.control.isConnected && readCardRoute(e.card)?.key === entry.key);
      state.busy = true;
      scan();
      try {
        const result = await watchlistApi.add(entry.route, { active });
        if (!active() || result.cancelled) return;
        state.added = true;
        scan();
        void notifyWatchlistAdded({ title: result.title, active });
        await nativeRefresh.refresh(entry.control, entry.route, { active });
      } catch (error) {
        debugError('card watchlist addition failed', error);
        if (active()) toast(error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not add to watchlist. Check your toolkit sign-in and try again.' : error.message);
      } finally {
        if (!destroyed && epoch === session) { state.busy = false; scan(); }
      }
    }
    function scan() {
      if (destroyed) return;
      for (const entry of entries.values()) {
        if (!entry.control.isConnected || !entry.button.isConnected || readCardRoute(entry.card)?.key !== entry.key) remove(entry);
      }
      for (const control of document.querySelectorAll(CONTROL)) {
        if (entries.has(control)) continue;
        const card = control.closest(CARD);
        const route = card && readCardRoute(card);
        if (!route) continue;
        const button = el('button', { type: 'button', class: 'ogt-watchlist-card',
          'aria-label': 'Add to watchlist', title: 'Add to watchlist using the toolkit’s Trakt account' }, watchlistIcon());
        const entry = { control, card, route, key: route.key, button };
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
      for (const entry of entries.values()) {
        const state = stateFor(entry.key);
        const hidden = state.added || state.wasWatchlisted;
        if (entry.button.hidden !== hidden) entry.button.hidden = hidden;
        if (entry.button.disabled !== state.busy) entry.button.disabled = state.busy;
        const busy = String(state.busy);
        if (entry.button.getAttribute('aria-busy') !== busy) entry.button.setAttribute('aria-busy', busy);
      }
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
