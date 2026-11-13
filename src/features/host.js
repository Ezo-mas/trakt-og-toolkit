/**
 * Mount features for the current route and keep them mounted across re-renders.
 *
 * A feature is `{ id, css?, authScoped?, match(route), mount(route) }`. `mount` returns
 * `{ node, destroy }` once it has inserted its node, or null to be retried on the next
 * DOM change (e.g. while og is still rendering the page).
 *
 * `authScoped` features read the signed-in account, so `reset()` rebuilds them from their
 * mount state rather than asking each one to clear its own fields, epochs and listeners.
 */
import { isDetached } from '../core/dom.js';
import { debugError } from '../core/log.js';

const RETRY_AFTER_MS = 400;

export function createFeatureHost(features, { isEnabled = () => true } = {}) {
  const mounted = new Map();
  let syncing = false;
  let rerun = false;
  let pendingRoute = null;

  function unmount(id, reason) {
    const entry = mounted.get(id);
    if (!entry) return;
    try {
      entry.destroy?.(reason);
    } catch (error) {
      debugError(`failed to destroy ${id}`, error);
    }
    mounted.delete(id);
  }

  function syncOnce(route) {
    for (const feature of features) {
      let entry = mounted.get(feature.id);
      if (!isEnabled(feature.id)) {
        unmount(feature.id);
        continue;
      }
      const applies = feature.match(route);

      if (!applies) {
        unmount(feature.id);
        continue;
      }

      if (entry) {
        const sameRoute = entry.routeKey === route.key;
        if (sameRoute && entry.node && !isDetached(entry.node)) continue;
        // The app re-rendered and dropped our node, or the route changed.
        if (sameRoute && Date.now() - entry.attemptAt < RETRY_AFTER_MS) continue;
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
  }

  function sync(route) {
    // A feature's match() can observe an og account change from isSignedIn() and trigger a
    // nested sync. Never re-enter the loop holding stale entries; rerun it after this pass.
    if (syncing) {
      rerun = true;
      pendingRoute = route;
      return;
    }
    syncing = true;
    try {
      let current = route;
      for (;;) {
        syncOnce(current);
        if (!rerun) break;
        rerun = false;
        current = pendingRoute ?? current;
      }
    } finally {
      syncing = false;
    }
  }

  /** An account change invalidates every feature that loaded the previous account's state. */
  sync.reset = () => {
    for (const feature of features) if (feature.authScoped) unmount(feature.id, 'authchange');
  };

  sync.problems = (route) => {
    const problems = [];
    for (const feature of features) {
      if (!isEnabled(feature.id) || !feature.match(route)) continue;
      const entry = mounted.get(feature.id);
      if (!entry?.node || entry.routeKey !== route.key || isDetached(entry.node)) {
        if (feature.expectMount?.(route) !== false) problems.push(`${feature.id}: did not mount`);
      } else if (feature.health) {
        const { ok, detail } = feature.health(route);
        if (!ok) problems.push(`${feature.id}: ${detail}`);
      }
    }
    return problems;
  };

  return sync;
}
