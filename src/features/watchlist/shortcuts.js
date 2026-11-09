import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { toast } from '../../ui/shell.js';
import { confirmDialog } from '../../ui/dialog.js';
import { notifySuccess } from '../../ui/success-notification.js';
import { watchlistApi } from './api.js';
import { readCardWatchlisted, watchlistBulkBody, watchlistBulkItems } from './data.js';
import { watchlistIcon } from './icon.js';
import { createNativeWatchlistRefresh } from './native-refresh.js';
import { notifyWatchlistAdded } from './notification.js';

/**
 * A page-wide bookmark shortcut placed after og's lists icon in every matching action strip
 * (poster/fanart cards, person credit rows). State is keyed by route, so a title shown twice
 * shares one in-flight add, one undo and one hidden state.
 *
 * `targets()` yields `{ host, control }` pairs; `readRoute(host)` names the movie/show, and is
 * re-read on every scan so a host that og reuses for another title drops its stale button.
 */
export function createWatchlistShortcuts({ id, markerId, className, css, match, logLabel, targets, readRoute, bulk = null }) {
  return {
    id,
    match,
    css,
    mount() {
      if (!document.body || document.getElementById(markerId)) return null;
      // A host-owned marker keeps this page-wide feature alive when the first card or row is replaced.
      const node = el('span', { id: markerId, hidden: true });
      document.body.append(node);
      const entries = new Map();
      const states = new Map();
      const nativeRefresh = createNativeWatchlistRefresh();
      let destroyed = false, session = 0, scheduled = false, bulkBusy = false, refreshRun = 0;
      const bulkButton = bulk ? el('button', { type: 'button', class: 'ogt-watchlist-bulk', text: bulk.label }) : null;

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
        const hidden = state.added || state.wasWatchlisted;
        if (entry.button.hidden !== hidden) entry.button.hidden = hidden;
        entry.button.disabled = bulkBusy || state.busy || state.undoing;
        const busy = String(bulkBusy || state.busy || state.undoing);
        if (entry.button.getAttribute('aria-busy') !== busy) entry.button.setAttribute('aria-busy', busy);
      }
      function bulkEntries() {
        const unique = new Map();
        for (const entry of [...entries.values(), ...(bulk?.targets?.() ?? [])]) {
          const state = stateFor(entry.key);
          if (state.busy || state.undoing || state.added || state.wasWatchlisted) continue;
          if (!entry.host.isConnected || entry.button && !entry.button.isConnected) continue;
          if (entry.control && readCardWatchlisted(entry.control)) continue;
          if (entry.host.closest('[hidden]') || entry.host.checkVisibility?.() === false) continue;
          if (!unique.has(entry.key)) unique.set(entry.key, entry);
        }
        return [...unique.values()];
      }
      function syncBulk() {
        if (!bulkButton) return;
        const control = bulk.target?.();
        if (control && bulkButton.parentElement !== control) control.append(bulkButton);
        const total = bulkEntries().length;
        const label = total ? `${bulk.label} (${total})` : bulk.label;
        if (bulkButton.textContent !== label) bulkButton.textContent = label;
        bulkButton.disabled = bulkBusy || total === 0;
        bulkButton.setAttribute('aria-busy', String(bulkBusy));
        bulkButton.title = total ? `Add ${total} title${total === 1 ? '' : 's'} to your watchlist`
          : 'No shown credits need adding to your watchlist';
      }
      async function addAll() {
        if (bulkBusy) return;
        if (!isSignedIn()) { toast('Sign in to Trakt at og.trakt.tv or through the toolkit menu first.'); return; }
        const list = bulkEntries();
        if (!list.length) return;
        const epoch = session;
        const pagePath = location.pathname;
        const active = () => !destroyed && session === epoch && location.pathname === pagePath;
        let progress, refreshKeys = [];
        bulkBusy = true;
        scan();
        try {
          if (!(await confirmDialog(`Add ${list.length} title${list.length === 1 ? '' : 's'} to your watchlist?`,
            { title: 'Watchlist all', ok: 'Add' })) || !active()) return;
          const result = await watchlistApi.addMany(list.map(entry => entry.route), { active, onProgress: result => {
            if (!active()) return;
            progress = result;
            for (const key of result.succeededKeys) stateFor(key).added = true;
            scan();
          } });
          if (!active() || result.cancelled) return;
          refreshKeys = result.succeededKeys;
          const summary = `Watchlist: ${result.added} added, ${result.existing} already there, ${result.notFound} not found.`;
          // Mixed responses do not identify new vs existing items, so only wholly new additions can be undone.
          const undoable = result.added > 0 && result.existing === 0 && result.succeededKeys.length === result.added;
          const succeeded = new Set(result.succeededKeys);
          const routes = list.filter(entry => succeeded.has(entry.key)).map(entry => entry.route);
          void notifySuccess(summary, active, { undo: undoable ? () => undoAll(routes, active) : undefined });
        } catch (error) {
          debugError(`${logLabel} bulk watchlist addition failed`, error);
          if (active()) {
            if (progress) refreshKeys = progress.succeededKeys;
            const completed = progress ? `Watchlist: ${progress.added} added, ${progress.existing} already there, ${progress.notFound} not found. ` : '';
            toast(completed + (error.status === 429 ? 'Trakt rate limited this request; try again later.' :
              'Remaining titles could not be confirmed; some may have been added. Try again.'));
          }
        } finally {
          if (!destroyed && epoch === session) { bulkBusy = false; scan(); }
        }
        // Native reloads can take a while on a large page; the notice and Undo must not wait for them.
        if (refreshKeys.length && active()) await refreshEntries(refreshKeys, active);
      }
      /** A newer refresh (e.g. Undo's) supersedes the queue of an older one. */
      async function refreshEntries(keys, active) {
        const run = ++refreshRun;
        const wanted = new Set(keys);
        const pending = [...entries.values(), ...(bulk?.targets?.() ?? [])]
          .filter(entry => wanted.has(entry.key) && entry.control);
        // Reuse OG's read-only picker reload, with at most four native loads at once.
        await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
          while (pending.length && active() && run === refreshRun) {
            const entry = pending.shift();
            if (readRoute(entry.host)?.key !== entry.key) continue;
            await nativeRefresh.refresh(entry.control, entry.route, { active });
          }
        }));
      }
      async function undoAll(routes, active) {
        if (bulkBusy || !active()) return false;
        const epoch = session;
        bulkBusy = true;
        scan();
        try {
          // Keep the same batch bound for removal, retaining progress if a later batch fails.
          while (routes.length) {
            if (!active()) return false;
            const batch = routes.slice(0, 100);
            const result = await watchlistApi.remove(watchlistBulkBody(watchlistBulkItems(batch)), { active });
            if (result.cancelled || !active()) return false;
            for (const route of batch) stateFor(route.key).added = false;
            routes.splice(0, batch.length);
            scan();
            await refreshEntries(batch.map(route => route.key), active);
          }
          return true;
        } catch (error) {
          failed(error, 'undo', active);
          return false;
        } finally {
          if (!destroyed && epoch === session) { bulkBusy = false; scan(); }
        }
      }
      /** True while this page, session and at least one live button for the title remain. */
      function activeFor(entry) {
        const epoch = session;
        const pagePath = location.pathname;
        return () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some(e =>
          e.key === entry.key && e.control.isConnected && readRoute(e.host)?.key === entry.key);
      }
      function failed(error, verb, active) {
        debugError(`${logLabel} watchlist ${verb} failed`, error);
        if (active()) toast(error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status && !error.ogSession ? `Could not ${verb === 'undo' ? 'undo' : 'add to watchlist'}. Check your toolkit sign-in and try again.`
            : error.message);
      }
      async function add(entry, event) {
        event.preventDefault();
        event.stopPropagation();
        const state = stateFor(entry.key);
        if (bulkBusy || state.busy || state.undoing || entry.button.hidden) return;
        if (!isSignedIn()) { toast('Sign in to Trakt at og.trakt.tv or through the toolkit menu first.'); return; }
        const epoch = session;
        const operation = ++state.operation;
        const active = activeFor(entry);
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
          failed(error, 'addition', active);
        } finally {
          if (!destroyed && epoch === session && state.operation === operation) {
            state.busy = false;
            scan();
          }
        }
      }
      async function undo(entry, body) {
        const state = stateFor(entry.key);
        if (bulkBusy || state.busy || state.undoing || !body) return false;
        if (!isSignedIn()) { toast('Sign in to Trakt at og.trakt.tv or through the toolkit menu first.'); return false; }
        const epoch = session;
        const operation = ++state.operation;
        const active = activeFor(entry);
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
          failed(error, 'undo', active);
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
          if (!entry.control.isConnected || !entry.button.isConnected || readRoute(entry.host)?.key !== entry.key) remove(entry);
        }
        for (const { host, control } of targets()) {
          if (!control || entries.has(control)) continue;
          const route = host && readRoute(host);
          if (!route) continue;
          const button = el('button', { type: 'button', class: className,
            'aria-label': 'Add to watchlist', title: 'Add to watchlist using the toolkit’s Trakt account' }, watchlistIcon());
          const entry = { host, control, route, key: route.key, button };
          entry.click = event => add(entry, event);
          button.addEventListener('click', entry.click);
          control.after(button);
          entries.set(control, entry);
        }
        const native = new Map();
        for (const entry of [...entries.values(), ...(bulk?.targets?.() ?? [])]) {
          if (!entry.control) continue;
          native.set(entry.key, Boolean(native.get(entry.key) || readCardWatchlisted(entry.control)));
        }
        for (const [key, watchlisted] of native) {
          const state = stateFor(key);
          if (state.wasWatchlisted && !watchlisted) state.added = false;
          state.wasWatchlisted = watchlisted;
        }
        for (const entry of entries.values()) updateButton(entry, stateFor(entry.key));
        syncBulk();
      }
      function schedule() {
        if (scheduled || destroyed) return;
        scheduled = true;
        queueMicrotask(() => { scheduled = false; scan(); });
      }
      function authChanged() {
        session++;
        bulkBusy = false;
        nativeRefresh.destroy();
        states.clear();
        scan();
      }
      if (bulkButton) bulkButton.addEventListener('click', addAll);
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['href', 'aria-describedby', 'hidden'] });
      document.addEventListener('ogt:authchange', authChanged);
      scan();
      return { node, destroy() {
        destroyed = true;
        nativeRefresh.destroy();
        observer.disconnect();
        document.removeEventListener('ogt:authchange', authChanged);
        for (const entry of entries.values()) remove(entry);
        states.clear();
        if (bulkButton) { bulkButton.removeEventListener('click', addAll); bulkButton.remove(); }
        node.remove();
      } };
    },
  };
}
