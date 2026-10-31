/**
 * Trakt OG Toolkit — entry point.
 *
 * Adds the parts of classic Trakt that og.trakt.tv doesn't have (yet), without
 * reusing og's session or internal endpoints: everything here is either plain
 * DOM work or a documented Trakt API call with the user's own app and OAuth connection.
 */
import { VERSION } from './meta.js';
import { injectStyles } from './ui/shell.js';
import { createRouter, parseRoute } from './core/router.js';
import { createFeatureHost } from './features/host.js';
import { waitForPageReady, watchModuleResources } from './core/hydration.js';
import { customLinks } from './features/custom-links/index.js';
import { playback } from './features/playback/index.js';
import { pronunciation } from './features/pronunciation/index.js';
import { yourRatings } from './features/your-ratings/index.js';
import { seasonChart } from './features/season-chart/index.js';
import { monthReview } from './features/month-review/index.js';
import { library } from './features/library/index.js';
import { registerMenu } from './menu.js';
import { applyDebugSetting } from './settings.js';
import { info, warn } from './core/log.js';
import { cacheSize } from './core/http.js';

const FEATURES = [customLinks, seasonChart, yourRatings, playback, pronunciation, library, monthReview];

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

  document.addEventListener('ogt:authchange', sync);

  const openGate = () => {
    if (canMount) return;
    canMount = true;
    moduleWatch.stop();

    // Nothing above this point touches og's DOM: styles and the router are
    // created only once the page has finished hydrating.
    injectStyles(FEATURES.map((feature) => feature.css).filter(Boolean));
    host = createFeatureHost(FEATURES);
    createRouter({
      onRoute(next) {
        route = next;
        sync();
      },
      // Every settled DOM change: re-mounts anything the app re-rendered away.
      onSettle: sync,
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

  registerMenu(() => route.key);

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

