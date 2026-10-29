/**
 * Wait for SvelteKit to finish booting before touching its DOM.
 *
 * SvelteKit loads route node modules with dynamic imports after the document's
 * `load` event. On a slow connection that can be seconds later. Inserting a
 * panel into the app tree while Svelte is hydrating makes Svelte report a
 * hydration mismatch and throw away the server-rendered subtree, which drops
 * session-only UI (the library/watchlist button) along with our panel.
 *
 * The gate below waits for the current route's node modules, then for module
 * activity to go quiet, then for a short settle period. It never relies on a
 * single fixed delay.
 */

const QUIET_MS = 300;
const SETTLE_MS = 600;
const NO_IDS_SETTLE_MS = 1500;
const MAX_WAIT_MS = 15000;

/** Read `node_ids: [0, 50]` from SvelteKit's inline bootstrap script. */
export function readRouteNodeIds(doc = document) {
  for (const script of doc.scripts || []) {
    const source = script.textContent || '';
    if (!source.includes('node_ids')) continue;
    const match = /node_ids\s*:\s*\[([0-9,\s]+)\]/.exec(source);
    if (!match) continue;
    const ids = match[1]
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length) return ids;
  }
  return [];
}

/** One of SvelteKit's lazy JS modules (route nodes or their shared chunks). */
export function isModuleResource(name) {
  return /\/_app\/immutable\/(?:nodes|chunks)\/[^/]+\.js(?:\?|$)/.test(name || '');
}

/** The route node id encoded in a `nodes/50.<hash>.js` URL. */
export function routeNodeId(name) {
  const match = /\/_app\/immutable\/nodes\/(\d+)\.[^/]+\.js(?:\?|$)/.exec(name || '');
  return match ? Number(match[1]) : null;
}

/**
 * Collect SvelteKit module resources from the moment the script boots.
 *
 * The browser's resource timing buffer is finite (Firefox defaults to 250
 * entries) and drops old entries as new ones arrive. Route modules are often
 * loaded before `load`, so by the time the gate starts they can be gone.
 * Keeping our own map means the gate does not need to raise the browser's
 * buffer size.
 */
export function watchModuleResources(win = window) {
  const entries = new Map();

  const record = (entry) => {
    const name = entry?.name || '';
    if (!isModuleResource(name)) return;
    entries.set(name, entry);
  };

  try {
    for (const entry of win.performance?.getEntriesByType?.('resource') || []) record(entry);
  } catch {
    // No resource timing; the observer below may still work.
  }

  let observer = null;
  if (typeof win.PerformanceObserver === 'function') {
    try {
      observer = new win.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) record(entry);
      });
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      observer = null;
    }
  }

  return {
    entries,
    stop() {
      observer?.disconnect();
      observer = null;
    },
  };
}

/**
 * Call `onReady` once the page has booted and hydrated. Returns a cancel
 * function. `onTimeout` is used when the route modules never show up; the
 * caller can decide whether to mount anyway.
 */
export function waitForPageReady({
  doc = document,
  win = window,
  earlyEntries = null,
  onReady,
  onTimeout,
} = {}) {
  const ids = readRouteNodeIds(doc);
  const settleMs = ids.length ? SETTLE_MS : NO_IDS_SETTLE_MS;
  const seen = new Set();
  let routeReady = ids.length === 0;
  let finished = false;
  let quietTimer = null;
  let settleTimer = null;
  let maxTimer = null;
  let observer = null;

  const clear = (timer) => {
    if (timer != null) win.clearTimeout(timer);
    return null;
  };

  const cleanup = () => {
    quietTimer = clear(quietTimer);
    settleTimer = clear(settleTimer);
    maxTimer = clear(maxTimer);
    observer?.disconnect();
    observer = null;
  };

  const finish = (reason, timedOut = false) => {
    if (finished) return;
    finished = true;
    cleanup();
    if (timedOut) onTimeout?.(reason);
    else onReady?.(reason);
  };

  const armQuiet = () => {
    settleTimer = clear(settleTimer);
    quietTimer = clear(quietTimer);
    quietTimer = win.setTimeout(() => {
      quietTimer = null;
      // Route modules are still loading; the max timer protects this wait.
      if (!routeReady) return;
      settleTimer = win.setTimeout(() => {
        settleTimer = null;
        finish('module activity settled');
      }, settleMs);
    }, QUIET_MS);
  };

  const noteEntry = (entry) => {
    const name = entry?.name || '';
    if (!isModuleResource(name)) return;

    const id = routeNodeId(name);
    if (id != null && ids.includes(id)) {
      seen.add(id);
      if (ids.every((value) => seen.has(value))) routeReady = true;
    }

    if (routeReady) armQuiet();
  };

  const start = () => {
    if (ids.length === 0) routeReady = true;

    if (earlyEntries) {
      const entries =
        typeof earlyEntries.values === 'function' ? earlyEntries.values() : earlyEntries;
      for (const entry of entries) noteEntry(entry);
    }

    try {
      for (const entry of win.performance.getEntriesByType('resource')) noteEntry(entry);
    } catch {
      // No resource timing: fall back to a quiet period from `load`.
    }

    if (typeof win.PerformanceObserver === 'function') {
      try {
        observer = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) noteEntry(entry);
        });
        observer.observe({ type: 'resource', buffered: true });
      } catch {
        observer = null;
      }
    }

    armQuiet();
    maxTimer = win.setTimeout(() => {
      maxTimer = null;
      finish('timed out waiting for the page to settle', true);
    }, MAX_WAIT_MS);
  };

  if (!ids.length && typeof win.performance?.getEntriesByType !== 'function') {
    // Very small/old environments (and some tests): just settle from `load`.
    settleTimer = win.setTimeout(() => finish('no resource timing'), SETTLE_MS);
    return () => {
      finished = true;
      cleanup();
    };
  }

  start();

  return () => {
    if (finished) return;
    finished = true;
    cleanup();
  };
}
