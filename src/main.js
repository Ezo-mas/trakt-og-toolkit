/**
 * Trakt OG Toolkit — entry point.
 *
 * Adds the parts of classic Trakt that og.trakt.tv doesn't have (yet), without
 * calling internal endpoints. API requests use the user's own OAuth connection
 * when present, or og's approved in-page session as a fallback; native UI bridges
 * let og show notices and refresh its own signed-in state.
 */
import { VERSION } from './meta.js';
import { injectStyles } from './ui/shell.js';
import { successNotificationCss } from './ui/success-notification-styles.js';
import { DIALOG_CSS } from './ui/dialog.js';
import { createRouter, parseRoute } from './core/router.js';
import { createFeatureHost } from './features/host.js';
import { waitForPageReady, watchModuleResources } from './core/hydration.js';
import { customLinks } from './features/custom-links/index.js';
import { playback } from './features/playback/index.js';
import { pronunciation } from './features/pronunciation/index.js';
import { yourRatings } from './features/your-ratings/index.js';
import { seasonChart } from './features/season-chart/index.js';
import { summaryRatings } from './features/summary-ratings/index.js';
import { monthReview } from './features/month-review/index.js';
import { allLists } from './features/all-lists/index.js';
import { listPreview } from './features/list-preview/index.js';
import { library } from './features/library/index.js';
import { watchlist } from './features/watchlist/index.js';
import { watchlistCards } from './features/watchlist/cards.js';
import { watchlistCredits } from './features/watchlist/credits.js';
import { watchlistPick } from './features/watchlist-pick/index.js';
import { rememberNativeResources } from './ui/native-modules.js';
import { registerMenu } from './menu.js';
import { applyDebugSetting, isFeatureEnabled } from './settings.js';
import { info, warn } from './core/log.js';
import { cacheSize } from './core/http.js';
import { STORAGE, onRemoteValueChange } from './core/store.js';

const FEATURES = [customLinks, seasonChart, summaryRatings, yourRatings, playback, pronunciation, library, watchlist, watchlistCards, watchlistCredits, watchlistPick, monthReview, allLists, listPreview];

function isSvelteKit() {
  return Boolean(
    document.body?.hasAttribute('data-sveltekit-preload-data') ||
      document.body?.hasAttribute('data-sveltekit-preload-code') ||
      Object.keys(window).some((key) => key.startsWith('__sveltekit_')),
  );
}

function start() {
  // Start watching SvelteKit module loads before the resource timing buffer
  // can evict them; the gate uses this map instead of a browser-specific
  // buffer-size override.
  const moduleWatch = watchModuleResources();

  applyDebugSetting();

  let route = parseRoute();
  let host = null;
  let canMount = false;

  const sync = () => {
    if (canMount && host) host(route);
  };
  // Rebuild features that hold personal state from scratch on an account change, so none of
  // them has to remember to clear fields, epochs and listeners itself.
  const authChanged = () => {
    host?.reset?.();
    sync();
  };

  document.addEventListener('ogt:authchange', authChanged);
  document.addEventListener('ogt:featurechange', sync);

  // The client ID and the toolkit's own tokens are shared by every tab. A change made elsewhere can
  // switch this tab's active account, so rebuild instead of keeping the previous account's data.
  // Own writes already dispatch `ogt:authchange`; the listener ignores them.
  const announce = () => document.dispatchEvent(new Event('ogt:authchange'));
  onRemoteValueChange(STORAGE.clientId, announce);
  // A refresh in another tab rewrites the tokens for the same session; only a sign-in, sign-out
  // or a different app is an account change. A renewal must not rebuild every open tab.
  onRemoteValueChange(STORAGE.tokens, (before, after) => {
    if (Boolean(before?.access_token) !== Boolean(after?.access_token) || before?.client_id !== after?.client_id) announce();
  });

  const openGate = () => {
    if (canMount) return;
    canMount = true;
    rememberNativeResources(moduleWatch.entries.keys());
    moduleWatch.stop();

    // Nothing above this point touches og's DOM: styles and the router are
    // created only once the page has finished hydrating.
    injectStyles([successNotificationCss, DIALOG_CSS, ...FEATURES.map((feature) => feature.css).filter(Boolean)]);
    host = createFeatureHost(FEATURES, { isEnabled: isFeatureEnabled });
    createRouter({
      onRoute(next) {
        const changed = next.key !== route.key;
        route = next;
        if (changed) document.dispatchEvent(new CustomEvent('ogt:routechange', { detail: { route: next } }));
        sync();
      },
      // Every settled DOM change: re-mounts anything the app re-rendered away, and lets features
      // follow a query-only change that routechange cannot report.
      onSettle() {
        sync();
        document.dispatchEvent(new CustomEvent('ogt:settle'));
      },
    });
    sync();
  };

  // SvelteKit loads route modules after `load` and hydrates afterwards.
  // Inserting into its DOM before hydration makes Svelte report a mismatch and
  // drop server-rendered blocks (including session-only buttons), so wait for
  // the current route's modules to settle instead of guessing a delay.
  // Other pages mount immediately.
  const scheduleMount = () => {
    if (!isSvelteKit()) {
      openGate();
      return;
    }

    const startGate = () =>
      waitForPageReady({
        earlyEntries: moduleWatch.entries,
        onReady(reason) {
          info(`initial mount after hydration (${reason})`);
          openGate();
        },
        onTimeout(reason) {
          warn(`hydration wait: ${reason}; mounting anyway`);
          openGate();
        },
      });

    // The watcher has been collecting since document-start, so the gate can
    // start at `load` without racing the browser's resource timing buffer.
    if (document.readyState === 'complete') startGate();
    else window.addEventListener('load', startGate, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMount, { once: true });
  } else {
    scheduleMount();
  }

  registerMenu(() => route.key, FEATURES);

  // Handy from the console; harmless if you never use it.
  window.__OGT__ = {
    version: VERSION,
    route: () => parseRoute(),
    cacheSize,
  };

  info(`v${VERSION} loaded on ${location.host}`);
}

/**
 * Userscript managers with `document-start` can run before <head> exists. The
 * styles need a parent and the router observes documentElement, so wait for the
 * root instead of throwing away the whole boot.
 */
function whenHeadReady(callback) {
  if (document.head) {
    callback();
    return;
  }

  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    callback();
  };
  const cleanup = () => {
    observer.disconnect();
    document.removeEventListener('DOMContentLoaded', run);
  };
  const observer = new MutationObserver(() => {
    if (document.head) run();
  });

  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', run, { once: true });
}

whenHeadReady(start);

