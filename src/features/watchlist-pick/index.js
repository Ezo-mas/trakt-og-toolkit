/**
 * Pick something from the watchlist API using the page's media filter. Recheck the filter after loading
 * candidates so a navigation during the request cannot show a pick from the previous filter.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { decodePathPart } from '../../core/text.js';
import { listReadFailureHint } from '../../core/trakt.js';
import { mountInTitleBar } from '../../ui/title-bar.js';
import { MAX_ITEMS, watchlistApi } from './api.js';
import { pickWatchlistItem, watchlistItems, watchlistLabel, watchlistType } from './data.js';
import { CSS } from './styles.js';

const ID = 'ogt-watchlist-pick';
/** A reroll should not re-read every page, but a changed watchlist should not stay invisible for a whole session. */
const ITEMS_TTL_MS = 5 * 60 * 1000;
/** Filter changes during a read are retried, but a page that keeps changing must not spin forever. */
const FILTER_RETRIES = 2;
const FILTER_CHANGED = 'The page filter changed while picking. Try again.';
const LIMIT_HINT = `Picks use up to the first ${MAX_ITEMS.toLocaleString('en-US')} watchlist entries.`;

export const watchlistPick = {
  id: 'watchlist-pick',
  css: CSS,
  authScoped: true,
  match: (route) => route.name === 'watchlist',
  mount(route) {
    if (document.getElementById(ID)) return null;

    const profile = decodePathPart(route.id);
    const button = el('button', { type: 'button', class: 'ogt-watchlist-pick__button', text: 'Pick something' });
    const result = el('a', { class: 'ogt-watchlist-pick__result', hidden: true });
    const announcer = el('span', { class: 'ogt-visually-hidden', role: 'status', 'aria-live': 'polite' });
    const status = el('span', { class: 'ogt-watchlist-pick__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-watchlist-pick' }, button, result, announcer, status);
    if (!mountInTitleBar(node)) return null;

    let active = true;
    let busy = false;
    let previousKey = null;
    let items = null;
    let itemsFor = null;
    let itemsAt = 0;
    let shownFor = null;

    const currentDisplay = () => watchlistType(location.search, route.type);
    const currentFilter = () => currentDisplay() ?? 'all';

    function clearResult() {
      result.hidden = true;
      result.removeAttribute('href');
      result.removeAttribute('title');
      result.textContent = '';
      previousKey = null;
      shownFor = null;
      announcer.textContent = '';
    }

    function showStatus(message) {
      clearResult();
      shownFor = message ? currentFilter() : null;
      status.textContent = message;
      button.textContent = 'Pick something';
    }

    function onQueryChange() {
      if (shownFor == null || shownFor === currentFilter()) return;
      if (busy) clearResult();
      else showStatus('');
    }

    async function load(display) {
      const key = display ?? 'all';
      const fresh = items && itemsFor === key && Date.now() - itemsAt < ITEMS_TTL_MS;
      if (fresh) return items;
      const { rows, limited } = await watchlistApi.list(profile, { display });
      if (!active) return null;
      if (itemsFor !== key) previousKey = null;
      items = { candidates: watchlistItems(rows), limited };
      itemsFor = key;
      itemsAt = Date.now();
      return items;
    }

    async function choose() {
      if (busy) return;
      onQueryChange();
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
          showStatus(FILTER_CHANGED);
          return;
        }
        const { candidates, limited } = loaded;
        if (!candidates.length) {
          showStatus(limited ? `Nothing to pick in this filter. ${LIMIT_HINT}` : 'Nothing to pick in this filter.');
          return;
        }

        const picked = pickWatchlistItem(candidates, previousKey);
        previousKey = picked.key;
        const label = watchlistLabel(picked);
        result.href = picked.href;
        result.textContent = label;
        result.title = label;
        result.hidden = false;
        shownFor = currentFilter();
        status.textContent = limited ? LIMIT_HINT : '';
        announcer.textContent = `Picked ${label}.`;
        button.textContent = 'Pick again';
      } catch (error) {
        debugError('watchlist pick failed', error);
        if (!active) return;
        items = null;
        itemsFor = null;
        itemsAt = 0;
        // A failed read for a filter the page has since left still needs an answer, or the click looks ignored.
        showStatus(display === currentDisplay() ? listReadFailureHint(error, 'watchlist', 'pick from') : FILTER_CHANGED);
      } finally {
        if (active) {
          busy = false;
          button.disabled = false;
        }
      }
    }

    button.addEventListener('click', choose);
    document.addEventListener('ogt:querychange', onQueryChange);

    return {
      node,
      destroy() {
        active = false;
        button.removeEventListener('click', choose);
        document.removeEventListener('ogt:querychange', onQueryChange);
        node.remove();
      },
    };
  },
};
