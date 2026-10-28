/** Mount features for the current route and keep them mounted across re-renders. */
import { isDetached } from '../core/dom.js';
import { debugError } from '../core/log.js';

const RETRY_AFTER_MS = 400;

export function createFeatureHost(features) {
  const mounted = new Map();

  function unmount(id) {
    const entry = mounted.get(id);
    if (!entry) return;
    try {
      entry.destroy?.();
    } catch (error) {
      debugError(`failed to destroy ${id}`, error);
    }
    mounted.delete(id);
  }

  return function sync(route) {
    for (const feature of features) {
      let entry = mounted.get(feature.id);
      const applies = feature.match(route);

      if (!applies) {
        unmount(feature.id);
        continue;
      }

      if (entry) {
        const sameRoute = entry.routeKey === route.key;
        if (sameRoute && entry.node && !isDetached(entry.node)) continue;
        // The app re-rendered and dropped our node, or the route changed.
        if (Date.now() - entry.attemptAt < RETRY_AFTER_MS) continue;
        unmount(feature.id);
        entry = null;
      }

      let handle = null;
      try {
        handle = feature.mount(route);
      } catch (error) {
        debugError(`${feature.id} failed to mount`, error);
        mounted.set(feature.id, { routeKey: route.key, node: null, destroy: null, attemptAt: Date.now() });
        continue;
      }

      if (!handle) {
        // Nothing to attach to yet (or the page is still rendering). Try again later.
        mounted.set(feature.id, { routeKey: route.key, node: null, destroy: null, attemptAt: Date.now() });
        continue;
      }

      mounted.set(feature.id, {
        routeKey: route.key,
        node: handle.node,
        destroy: handle.destroy,
        attemptAt: Date.now(),
      });
    }
  };
}
