/**
 * Pick something on a watchlist: og shows the page's loaded rows, but reads one random title from the whole list
 * through the API. The media filter (`?display=movie|show|season|episode`) is read when a pick starts and rechecked
 * after every read, so changing it in place cannot show a title from the previous filter.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { MissingClientIdError } from '../../core/trakt.js';
import { watchlistApi } from './api.js';
import { pickWatchlistItem, watchlistItems, watchlistLabel, watchlistType } from './data.js';
import { CSS } from './styles.js';

const ID = 'ogt-watchlist-pick';
/** A reroll should not re-read every page, but a changed watchlist should not stay invisible for a whole session. */
const ITEMS_TTL_MS = 5 * 60 * 1000;
/** Filter changes during a read are retried, but a page that keeps changing must not spin forever. */
const FILTER_RETRIES = 2;

function failureHint(error) {
  if (error instanceof MissingClientIdError) {
    return error.ogSession
      ? error.message
      : 'Sign in to og.trakt.tv or set a Trakt client ID to pick from a watchlist.';
  }
  // og owns its renewal: an expired or rejected og token needs a reload, not a new sign-in.
  if (error?.ogSession) return error.message || 'Your og.trakt.tv session expired; reload the page to renew it.';
  if (error?.status === 403 || error?.status === 404) return 'This watchlist is private or unavailable.';
  if (error?.status === 401) return 'Sign in to Trakt to pick from this watchlist.';
  return 'Could not read this watchlist. Try again later.';
}

function profileId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const watchlistPick = {
  id: 'watchlist-pick',
  css: CSS,
  authScoped: true,
  match: (route) => route.name === 'watchlist',
  mount(route) {
    const actions = document.querySelector('section.title-row .title-bar .actions');
    if (!actions || document.getElementById(ID)) return null;

    const profile = profileId(route.id);
    const button = el('button', { type: 'button', class: 'ogt-watchlist-pick__button', text: 'Pick something' });
    const result = el('a', { class: 'ogt-watchlist-pick__result', hidden: true });
    const announcer = el('span', { class: 'ogt-visually-hidden', role: 'status', 'aria-live': 'polite' });
    const status = el('span', { class: 'ogt-watchlist-pick__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-watchlist-pick' }, button, result, announcer, status);
    const share = [...actions.children].find((child) => child.classList.contains('share'));
    actions.insertBefore(node, share ?? null);

    let active = true;
    let busy = false;
    let previousKey = null;
    let items = null;
    let itemsFor = null;
    let itemsAt = 0;
    let shownFor = null;
    let filterTimer = null;

    const currentDisplay = () => watchlistType(location.search, route.type);
    const currentFilter = () => currentDisplay() ?? 'all';

    function clearFilterMismatch() {
      if (!active || result.hidden || shownFor == null || shownFor === currentFilter()) return;
      result.hidden = true;
      result.removeAttribute('href');
      result.removeAttribute('title');
      result.textContent = '';
      previousKey = null;
      shownFor = null;
      status.textContent = '';
      announcer.textContent = '';
      button.textContent = 'Pick something';
    }

    // A same-page filter link changes only the query, so neither routechange nor a settle pass reports it.
    function scheduleFilterCheck() {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(clearFilterMismatch, 0);
    }

    function onDocumentClick(event) {
      const link = event.target?.closest?.('a[href]');
      if (link && (link.getAttribute('href') || '').includes('/watchlist')) scheduleFilterCheck();
    }

    function onPopState() {
      scheduleFilterCheck();
    }

    async function load(display) {
      const key = display ?? 'all';
      const fresh = items && itemsFor === key && Date.now() - itemsAt < ITEMS_TTL_MS;
      if (fresh) return items;
      const rows = watchlistItems(await watchlistApi.list(profile, { display }));
      if (!active) return null;
      if (itemsFor !== key) previousKey = null;
      items = rows;
      itemsFor = key;
      itemsAt = Date.now();
      return items;
    }

    async function choose() {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.textContent = 'Picking…';
      status.textContent = 'Reading the watchlist…';
      announcer.textContent = '';

      let display = currentDisplay();
      try {
        let loaded = null;
        for (let attempt = 0; attempt <= FILTER_RETRIES; attempt++) {
          loaded = await load(display);
          if (!active) return;
          const latest = currentDisplay();
          if (latest === display) break;
          display = latest;
          loaded = null;
        }
        if (!loaded) {
          result.hidden = true;
          shownFor = null;
          status.textContent = 'The page filter changed while picking. Try again.';
          button.textContent = 'Pick something';
          return;
        }
        if (!loaded.length) {
          result.hidden = true;
          result.removeAttribute('href');
          result.removeAttribute('title');
          result.textContent = '';
          shownFor = null;
          status.textContent = 'Nothing to pick in this filter.';
          button.textContent = 'Pick something';
          return;
        }

        const picked = pickWatchlistItem(loaded, previousKey);
        previousKey = picked.key;
        const label = watchlistLabel(picked);
        result.href = picked.href;
        result.textContent = label;
        result.title = label;
        result.hidden = false;
        shownFor = currentFilter();
        status.textContent = '';
        announcer.textContent = `Picked ${label}.`;
        button.textContent = 'Pick again';
      } catch (error) {
        debugError('watchlist pick failed', error);
        if (!active) return;
        result.hidden = true;
        result.removeAttribute('href');
        result.removeAttribute('title');
        result.textContent = '';
        previousKey = null;
        shownFor = null;
        items = null;
        itemsFor = null;
        itemsAt = 0;
        announcer.textContent = '';
        status.textContent = failureHint(error);
        button.textContent = 'Pick something';
      } finally {
        if (active) {
          busy = false;
          button.disabled = false;
        }
      }
    }

    button.addEventListener('click', choose);
    document.addEventListener('click', onDocumentClick, true);
    window.addEventListener('popstate', onPopState);

    return {
      node,
      destroy() {
        active = false;
        clearTimeout(filterTimer);
        button.removeEventListener('click', choose);
        document.removeEventListener('click', onDocumentClick, true);
        window.removeEventListener('popstate', onPopState);
        node.remove();
      },
    };
  },
};
