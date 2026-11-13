/**
 * Trakt OG Toolkit — entry point.
 *
 * Adds the parts of classic Trakt that og.trakt.tv doesn't have (yet), without
 * calling internal endpoints. API requests use og's approved in-page session. Native UI bridges
 * let og show notices and refresh its own signed-in state.
 */
import { VERSION } from './meta.js';
import { collectDrift, createDriftMonitor, reportDrift } from './core/drift.js';
import { injectStyles, toast } from './ui/shell.js';
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
import { csvExport } from './features/csv-export/index.js';
import { rememberNativeResources } from './ui/native-modules.js';
import { registerMenu } from './menu.js';
import { applyDebugSetting, isDebug, isFeatureEnabled } from './settings.js';
import { info, warn } from './core/log.js';
import { cacheSize, clearCache } from './core/http.js';
import { API } from './config.js';
import { removePrivateValue, removeValue } from './core/store.js';
import { OG_SESSION_CHANGE_EVENT, readOgSession } from './core/og-session.js';

const FEATURES = [customLinks, seasonChart, summaryRatings, yourRatings, playback, pronunciation, library, watchlist, watchlistCards, watchlistCredits, csvExport, watchlistPick, monthReview, allLists, listPreview];

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
  // Upgrades can still have credentials for the toolkit's retired device sign-in.
  removePrivateValue('trakt.oauth.tokens');
  removePrivateValue('trakt.oauth.redirectUri');
  removeValue('trakt.clientId');

  let route = parseRoute();
  let host = null;
  let canMount = false;

  const monitor = createDriftMonitor({
    currentKey: () => parseRoute().key,
    collect: (page, current) => {
      const hasSession = Boolean(readOgSession());
      const headerSignedIn = Boolean(document.querySelector('header.top-nav .profile'));
      return collectDrift(document, page, host, current, {
        headerSignedIn, hasSession, isEnabled: isFeatureEnabled,
      });
    },
    report: (page, problems, fresh) => {
      reportDrift(page, problems, fresh);
      if (fresh.length && isDebug()) {
        const more = fresh.length > 1 ? ` (+${fresh.length - 1} more, see Diagnostics)` : '';
        toast(`og drift on ${page} pages: ${fresh[0]}${more}`, { duration: 10000 });
      }
    },
  });

  const sync = () => {
    if (!canMount || !host) return;
    readOgSession();
    host(route);
  };
  // Rebuild features that hold personal state from scratch on an account change, so none of
  // them has to remember to clear fields, epochs and listeners itself.
  const authChanged = () => {
    clearCache(API.base);
    host?.reset?.();
    sync();
  };

  document.addEventListener(OG_SESSION_CHANGE_EVENT, authChanged);
  document.addEventListener('ogt:featurechange', sync);

  let sveltePage = false;
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
      onQuery(route, search) {
        document.dispatchEvent(new CustomEvent('ogt:querychange', { detail: { route, search } }));
      },
      // Every settled DOM change: re-mounts anything the app re-rendered away.
      onSettle() {
        sync();
        if (sveltePage) monitor(route);
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
    sveltePage = isSvelteKit();
    if (!sveltePage) {
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

