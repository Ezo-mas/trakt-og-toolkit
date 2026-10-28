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

function start() {
  applyDebugSetting();
  injectStyles();

  const host = createFeatureHost(FEATURES);
  let route = parseRoute();

  createRouter({
    onRoute(next) {
      route = next;
      host(next);
    },
    // Every settled DOM change: re-mounts anything the app re-rendered away.
    onSettle() {
      host(route);
    },
  });

  registerMenu(() => route.key);

  // Handy from the console; harmless if you never use it.
  window.__OGT__ = {
    version: VERSION,
    route: () => parseRoute(),
    cacheSize,
  };

  info(`v${VERSION} loaded on ${location.host}`);
}

start();
