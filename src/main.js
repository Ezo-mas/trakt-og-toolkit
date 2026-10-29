/**
 * Trakt OG Toolkit — entry point.
 *
 * Adds the parts of classic Trakt that og.trakt.tv doesn't have (yet), without
 * reusing og's session or internal endpoints: everything here is either plain
 * DOM work or a public Trakt API call with the user's own client ID.
 */
import { VERSION } from './meta.js';
import { injectStyles } from './ui/shell.js';
import { createRouter, parseRoute } from './core/router.js';
import { createFeatureHost } from './features/host.js';
import { watchNow } from './features/watch-now/index.js';
import { registerMenu } from './menu.js';
import { applyDebugSetting } from './settings.js';
import { info } from './core/log.js';
import { cacheSize } from './core/http.js';

const FEATURES = [watchNow];
const INITIAL_MOUNT_DELAY_MS = 750;

function isSvelteKit() {
  return Boolean(
    document.body?.hasAttribute('data-sveltekit-preload-data') ||
      document.body?.hasAttribute('data-sveltekit-preload-code') ||
      Object.keys(window).some((key) => key.startsWith('__sveltekit_')),
  );
}

function start() {
  applyDebugSetting();
  injectStyles();

  const host = createFeatureHost(FEATURES);
  let route = parseRoute();
  let canMount = false;

  const sync = () => {
    if (canMount) host(route);
  };

  createRouter({
    onRoute(next) {
      route = next;
      sync();
    },
    // Every settled DOM change: re-mounts anything the app re-rendered away.
    onSettle: sync,
  });

  const openGate = () => {
    if (canMount) return;
    canMount = true;
    host(route);
  };

  // SvelteKit finishes hydrating after `load`. Inserting into its DOM before
  // that makes Svelte report a hydration mismatch and can drop SSR-only blocks,
  // so give the app a moment on SvelteKit pages. Other pages mount immediately.
  const scheduleMount = () => {
    if (!isSvelteKit()) {
      openGate();
      return;
    }
    if (document.readyState === 'complete') {
      setTimeout(openGate, INITIAL_MOUNT_DELAY_MS);
    } else {
      window.addEventListener('load', () => setTimeout(openGate, INITIAL_MOUNT_DELAY_MS), { once: true });
    }
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

