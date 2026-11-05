// ==UserScript==
// @name         Trakt OG Toolkit
// @namespace    https://github.com/trakt-og-toolkit
// @version      0.3.0
// @description  Brings back the useful classic-Trakt extras on og.trakt.tv.
// @author       Ezo-mas
// @license      MIT
// @match        https://og.trakt.tv/*
// @match        http://localhost:5173/*
// @match        http://localhost:5174/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      api.trakt.tv
// @connect      auth.trakt.tv
// @connect      forvo.com
// @noframes
// ==/UserScript==

(() => {
  // src/meta.js
  var NAME = "Trakt OG Toolkit";
  var VERSION = "0.3.0";

  // src/ui/styles.js
  var CSS = String.raw`
.ogt-panel {
  --ogt-fg: light-dark(#333, #e6e6e6);
  --ogt-muted: light-dark(#767676, #9a9a9a);
  --ogt-surface: light-dark(#ffffff, #262626);
  --ogt-raised: light-dark(#f5f5f5, #2f2f2f);
  --ogt-border: light-dark(#e2e2e2, #3c3c3c);
  --ogt-accent: var(--brand-primary, #ed1c24);
  box-sizing: border-box;
  margin: 24px 0;
  padding: 16px 18px 18px;
  border: 1px solid var(--ogt-border);
  border-radius: 6px;
  background: var(--ogt-surface);
  color: var(--ogt-fg);
  font-size: 13px;
  line-height: 1.45;
}

.ogt-panel *,
.ogt-panel *::before,
.ogt-panel *::after {
  box-sizing: inherit;
}

/* Our own display rules must not beat the hidden attribute. */
.ogt-panel [hidden] {
  display: none !important;
}

.ogt-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 12px;
}

.ogt-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ogt-muted);
}

.ogt-badge {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ogt-muted);
  border: 1px solid var(--ogt-border);
  border-radius: 999px;
  padding: 1px 7px;
}

.ogt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ogt-row + .ogt-row {
  margin-block-start: 12px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--ogt-border);
}

.ogt-hint {
  margin: 0;
  padding: 8px 0;
  color: var(--ogt-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ogt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--ogt-border);
  border-radius: 999px;
  background: var(--ogt-raised);
  color: var(--ogt-fg);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
}

.ogt-panel button.ogt-chip {
  cursor: pointer;
  font-family: inherit;
}

.ogt-chip:hover,
.ogt-chip:focus-visible {
  border-color: var(--ogt-accent);
  color: var(--ogt-accent);
  outline: none;
}

.ogt-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ogt-muted);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ogt-select {
  appearance: none;
  padding: 5px 26px 5px 9px;
  border: 1px solid var(--ogt-border);
  border-radius: 4px;
  background-color: var(--ogt-raised);
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 13px) 50%, calc(100% - 9px) 50%;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
  color: var(--ogt-fg);
  font: inherit;
  font-size: 12px;
}

.ogt-select:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 1px;
}

/* The episode fallback is a number input, not a select. */
.ogt-panel input.ogt-select {
  padding-inline-end: 9px;
  background-image: none;
}

.ogt-link-tools {
  margin-block-start: 10px;
  padding: 10px;
  border: 1px solid var(--ogt-border);
  border-radius: 5px;
  background: var(--ogt-raised);
}

.ogt-editor-list-wrap,
.ogt-preset-list-wrap {
  max-block-size: 240px;
  overflow: auto;
}

.ogt-editor-list {
  display: grid;
  gap: 8px;
}

.ogt-editor-row {
  display: grid;
  grid-template-columns: minmax(100px, 0.8fr) minmax(180px, 1.6fr) auto;
  align-items: end;
  gap: 8px;
}

.ogt-editor-field {
  display: grid;
  gap: 3px;
  min-width: 0;
  color: var(--ogt-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ogt-editor-input {
  width: 100%;
  min-width: 0;
  padding: 5px 7px;
  border: 1px solid var(--ogt-border);
  border-radius: 4px;
  background: var(--ogt-surface);
  color: var(--ogt-fg);
  font: inherit;
  font-size: 12px;
  letter-spacing: normal;
  text-transform: none;
}

.ogt-editor-input:focus-visible,
.ogt-mini-button:focus-visible,
.ogt-preset-item input:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 1px;
}

.ogt-editor-actions {
  display: flex;
  gap: 4px;
}

.ogt-mini-button {
  min-width: 28px;
  min-height: 28px;
  padding: 3px 6px;
  border: 1px solid var(--ogt-border);
  border-radius: 4px;
  background: var(--ogt-surface);
  color: var(--ogt-fg);
  font: inherit;
  cursor: pointer;
}

.ogt-mini-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.ogt-editor-footer {
  margin-block-start: 10px;
}

.ogt-editor-error {
  margin: 8px 0 0;
  color: light-dark(#a00000, #ff8a8a);
  font-size: 12px;
}

.ogt-preset-list {
  display: grid;
  gap: 4px;
}

.ogt-preset-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: var(--ogt-fg);
  font-size: 12px;
  cursor: pointer;
}

.ogt-preset-item input {
  accent-color: var(--ogt-accent);
}

.ogt-preset-added {
  color: var(--ogt-muted);
  font-size: 10px;
  text-transform: uppercase;
}

.ogt-toast {
  position: fixed;
  inset-block-end: 24px;
  inset-inline: 0;
  z-index: 2147483001;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.ogt-toast__body {
  max-inline-size: min(90vw, 480px);
  padding: 10px 16px;
  border-radius: 6px;
  background: light-dark(#222, #f2f2f2);
  color: light-dark(#fff, #111);
  font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: 0 6px 24px rgb(0 0 0 / 28%);
  pointer-events: auto; /* the container ignores clicks; the text itself stays selectable */
  user-select: text;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 160ms ease, transform 160ms ease;
}

.ogt-toast__body[data-open] {
  opacity: 1;
  transform: none;
}

@media (max-width: 768px) {
  .ogt-panel {
    margin: 16px 0;
    padding: 14px;
  }

  .ogt-editor-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;

  // src/core/dom.js
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === void 0 || value === null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key === "style") node.setAttribute("style", value);
      else if (key === "on") {
        for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
      } else if (key in node && typeof node[key] !== "string") node[key] = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === void 0 || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  function debounce(fn, ms = 200) {
    let timer;
    const wrapped = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
  }
  function isDetached(node) {
    return !node || !node.isConnected;
  }
  function text(node) {
    return (node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  // src/ui/shell.js
  var STYLE_ID = "ogt-styles";
  function injectStyles(extra = []) {
    if (document.getElementById(STYLE_ID)) return;
    const css2 = [CSS, ...extra].join("\n");
    if (typeof GM_addStyle === "function") {
      try {
        GM_addStyle(css2);
        return;
      } catch {
      }
    }
    const style = el("style", { id: STYLE_ID, text: css2 });
    (document.head || document.documentElement).append(style);
  }
  var toastTimer = null;
  var toastRoot = null;
  function toast(message, { duration = 3200 } = {}) {
    if (!message) return;
    if (!toastRoot) {
      toastRoot = el("div", { class: "ogt-toast", role: "status", "aria-live": "polite" });
      document.body.append(toastRoot);
    }
    toastRoot.replaceChildren(el("div", { class: "ogt-toast__body", text: message }));
    const body = toastRoot.firstElementChild;
    requestAnimationFrame(() => body?.setAttribute("data-open", ""));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      body?.removeAttribute("data-open");
      setTimeout(() => toastRoot?.remove(), 200);
      toastRoot = null;
    }, duration);
  }

  // src/ui/success-notification-styles.js
  var successNotificationCss = `
  .ogt-watchlist-toasts {
    inset-block-start: calc(var(--header-height, 70px) + var(--toast-offset, 12px) + var(--ogt-native-toast-height, 0px));
    inset-block-end: auto; inset-inline-start: auto; inset-inline-end: var(--toast-offset, 12px);
    z-index: var(--z-toast, 30); inline-size: min(var(--toast-width, 360px), calc(100vw - 2 * var(--toast-offset, 12px)));
    display: flex; flex-direction: column; justify-content: normal; gap: var(--toast-gap, 8px);
  }
  .ogt-watchlist-toast {
    position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center;
    gap: var(--toast-icon-gap, 10px); padding: var(--toast-padding, 11px 8px 11px 14px); overflow: hidden;
    border: 1px solid var(--color-toast-border, #ffffff20); border-radius: var(--radius-toast, 12px);
    background: var(--color-toast-bg, #171717ed); color: var(--color-toast-text, white);
    box-shadow: var(--shadow-toast, 0 12px 32px #0007); backdrop-filter: var(--blur-toast, blur(16px));
    font: var(--font-size-toast, 14px)/1.4 var(--font-body, system-ui); pointer-events: auto;
  }
  .ogt-watchlist-toast__icon { display: flex; color: var(--color-toast-success, #6cc96c); }
  .ogt-watchlist-toast__icon svg { inline-size: var(--font-size-toast-icon, 18px); block-size: var(--font-size-toast-icon, 18px); }
  .ogt-watchlist-toast__message { margin: 0; overflow-wrap: anywhere; }
  .ogt-watchlist-toast__actions { display: flex; align-items: center; gap: var(--toast-action-gap, 2px); }
  .ogt-watchlist-toast__undo {
    min-block-size: 0; padding: var(--toast-undo-padding, 4px 8px); border: 0; border-radius: var(--radius-toast-close, 4px);
    background: none; color: var(--color-toast-success, #6cc96c); font: inherit; font-weight: 600; cursor: pointer;
  }
  .ogt-watchlist-toast__undo:is(:hover, :focus-visible) { background: var(--color-toast-close-hover, #ffffff15); color: var(--color-toast-text, white); }
  .ogt-watchlist-toast__undo:focus-visible { outline: 2px solid currentColor; }
  .ogt-watchlist-toast__undo:disabled { opacity: .6; cursor: default; }
  .ogt-watchlist-toast__error { grid-column: 2 / -1; margin: 0; color: var(--color-toast-error, #f0a6a6); font-size: var(--font-size-toast-error, 12px); }
  .ogt-watchlist-toast__error:empty { display: none; }
  .ogt-watchlist-toast__close {
    display: grid; place-items: center; min-block-size: 0; padding: 0; border: 0;
    inline-size: var(--toast-close-size, 28px); block-size: var(--toast-close-size, 28px);
    border-radius: var(--radius-toast-close, 4px); background: none; color: var(--color-toast-close, #bbb); cursor: pointer;
  }
  .ogt-watchlist-toast__close svg { inline-size: var(--font-size-toast-close, 14px); block-size: var(--font-size-toast-close, 14px); }
  .ogt-watchlist-toast__close:is(:hover, :focus-visible) { background: var(--color-toast-close-hover, #ffffff15); color: var(--color-toast-text, white); }
  .ogt-watchlist-toast__close:focus-visible { outline: 2px solid currentColor; }
  .ogt-watchlist-toast__timer { position: absolute; inset: auto 0 0; block-size: var(--toast-timer-height, 2px);
    background: var(--color-toast-success, #6cc96c); transform-origin: left; }
  @media (prefers-reduced-motion: reduce) { .ogt-watchlist-toast__timer { display: none; } }
`;

  // src/core/router.js
  var CHART_NAMES = /* @__PURE__ */ new Set([
    "trending",
    "popular",
    "anticipated",
    "recommendations",
    "recommended",
    "favorited",
    "watched",
    "library",
    "collected",
    "played",
    "boxoffice"
  ]);
  var TITLE_PATH = /^\/(shows|movies)\/([^/]+)(?:\/(.*))?$/;
  function parseRoute(pathname = location.pathname) {
    const path = pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/dashboard") return { name: "dashboard", kind: null, id: null, path, key: path };
    const progress = path.match(/^\/users\/([^/]+)\/progress(?:\/.*)?$/);
    if (progress) return { name: "progress", kind: null, id: progress[1], path, key: path };
    const person = path.match(/^\/people\/([^/]+)$/);
    if (person) return { name: "person", kind: "person", id: person[1], path, key: path };
    const lists = path.match(/^\/users\/([^/]+)\/(?:lists(?:\/collaborations|\/liked(?:\/official)?)?|smart-lists)$/);
    if (lists) {
      const name2 = path.endsWith("/smart-lists") ? "smart-lists" : path.endsWith("/collaborations") ? "lists-collaborations" : path.includes("/liked") ? "liked-lists" : "lists";
      return { name: name2, kind: null, id: lists[1], path, key: path };
    }
    const match = path.match(TITLE_PATH);
    if (!match) {
      return { name: "other", kind: null, id: null, path, key: path };
    }
    const [, plural, id, rest = ""] = match;
    const kind = plural === "shows" ? "show" : "movie";
    if (CHART_NAMES.has(id)) {
      return { name: "chart", kind, id: null, path, key: path };
    }
    const segments = rest.split("/").filter(Boolean);
    const [first, second, third, fourth] = segments;
    let name = first || "title";
    let season = null;
    let episode = null;
    if (first === "seasons") {
      if (second !== void 0 && /^\d+$/.test(second)) {
        season = Number(second);
        name = "season";
        if (third === "episodes" && fourth !== void 0 && /^\d+$/.test(fourth)) {
          episode = Number(fourth);
          name = "episode";
        }
      } else {
        name = second === "all" ? "all-episodes" : "seasons";
      }
    }
    return { name, kind, id, rest, season, episode, path, key: path };
  }
  function createRouter({ onRoute, onSettle }) {
    let lastKey = null;
    const settle = debounce(() => {
      const route = parseRoute();
      if (route.key !== lastKey) {
        lastKey = route.key;
        onRoute(route);
      }
      onSettle?.(route);
    }, 150);
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function patchedPush(...args) {
      const result = push.apply(this, args);
      settle();
      return result;
    };
    history.replaceState = function patchedReplace(...args) {
      const result = replace.apply(this, args);
      settle();
      return result;
    };
    const onPop = () => settle();
    const onHash = () => settle();
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onHash);
    const observer = new MutationObserver(() => settle());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const ready = () => {
      const route = parseRoute();
      lastKey = route.key;
      onRoute(route);
      onSettle?.(route);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ready, { once: true });
    } else {
      ready();
    }
    return function stop() {
      history.pushState = push;
      history.replaceState = replace;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onHash);
      observer.disconnect();
      settle.cancel();
    };
  }

  // src/core/log.js
  var PREFIX = "[OGT]";
  var verbose = false;
  function setVerbose(value) {
    verbose = Boolean(value);
  }
  function isVerbose() {
    return verbose;
  }
  function info(...args) {
    console.info(PREFIX, ...args);
  }
  function warn(...args) {
    console.warn(PREFIX, ...args);
  }
  function debugError(label, error) {
    if (verbose) console.warn(PREFIX, label, error);
  }

  // src/features/host.js
  var RETRY_AFTER_MS = 400;
  function createFeatureHost(features, { isEnabled = () => true } = {}) {
    const mounted = /* @__PURE__ */ new Map();
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
          mounted.set(feature.id, { routeKey: route.key, node: null, destroy: null, attemptAt: Date.now() });
          continue;
        }
        mounted.set(feature.id, {
          routeKey: route.key,
          node: handle.node,
          destroy: handle.destroy,
          attemptAt: Date.now()
        });
      }
    };
  }

  // src/core/hydration.js
  var QUIET_MS = 300;
  var SETTLE_MS = 600;
  var NO_IDS_SETTLE_MS = 1500;
  var MAX_WAIT_MS = 15e3;
  function readRouteNodeIds(doc = document) {
    for (const script of doc.scripts || []) {
      const source = script.textContent || "";
      if (!source.includes("node_ids")) continue;
      const match = /node_ids\s*:\s*\[([0-9,\s]+)\]/.exec(source);
      if (!match) continue;
      const ids = match[1].split(",").map((part) => Number(part.trim())).filter((id) => Number.isInteger(id) && id > 0);
      if (ids.length) return ids;
    }
    return [];
  }
  function isModuleResource(name) {
    return /\/_app\/immutable\/(?:nodes|chunks)\/[^/]+\.js(?:\?|$)/.test(name || "");
  }
  function routeNodeId(name) {
    const match = /\/_app\/immutable\/nodes\/(\d+)\.[^/]+\.js(?:\?|$)/.exec(name || "");
    return match ? Number(match[1]) : null;
  }
  function watchModuleResources(win = window) {
    const entries = /* @__PURE__ */ new Map();
    const record = (entry) => {
      const name = entry?.name || "";
      if (!isModuleResource(name)) return;
      entries.set(name, entry);
    };
    try {
      for (const entry of win.performance?.getEntriesByType?.("resource") || []) record(entry);
    } catch {
    }
    let observer = null;
    if (typeof win.PerformanceObserver === "function") {
      try {
        observer = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) record(entry);
        });
        observer.observe({ type: "resource", buffered: true });
      } catch {
        observer = null;
      }
    }
    return {
      entries,
      stop() {
        observer?.disconnect();
        observer = null;
      }
    };
  }
  function waitForPageReady({
    doc = document,
    win = window,
    earlyEntries = null,
    onReady,
    onTimeout
  } = {}) {
    const ids = readRouteNodeIds(doc);
    const settleMs = ids.length ? SETTLE_MS : NO_IDS_SETTLE_MS;
    const seen = /* @__PURE__ */ new Set();
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
        if (!routeReady) return;
        settleTimer = win.setTimeout(() => {
          settleTimer = null;
          finish("module activity settled");
        }, settleMs);
      }, QUIET_MS);
    };
    const noteEntry = (entry) => {
      const name = entry?.name || "";
      if (!isModuleResource(name)) return;
      const id = routeNodeId(name);
      if (id != null && ids.includes(id)) {
        seen.add(id);
        if (ids.every((value) => seen.has(value))) routeReady = true;
      }
      if (routeReady) armQuiet();
    };
    const start2 = () => {
      if (ids.length === 0) routeReady = true;
      if (earlyEntries) {
        const entries = typeof earlyEntries.values === "function" ? earlyEntries.values() : earlyEntries;
        for (const entry of entries) noteEntry(entry);
      }
      try {
        for (const entry of win.performance.getEntriesByType("resource")) noteEntry(entry);
      } catch {
      }
      if (typeof win.PerformanceObserver === "function") {
        try {
          observer = new win.PerformanceObserver((list) => {
            for (const entry of list.getEntries()) noteEntry(entry);
          });
          observer.observe({ type: "resource", buffered: true });
        } catch {
          observer = null;
        }
      }
      armQuiet();
      maxTimer = win.setTimeout(() => {
        maxTimer = null;
        finish("timed out waiting for the page to settle", true);
      }, MAX_WAIT_MS);
    };
    if (!ids.length && typeof win.performance?.getEntriesByType !== "function") {
      settleTimer = win.setTimeout(() => finish("no resource timing"), SETTLE_MS);
      return () => {
        finished = true;
        cleanup();
      };
    }
    start2();
    return () => {
      if (finished) return;
      finished = true;
      cleanup();
    };
  }

  // src/core/text.js
  function fillTemplate(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = vars[key];
      if (value === void 0 || value === null || value === "") return "";
      return encodeURIComponent(String(value));
    });
  }
  function missingPlaceholders(template, vars) {
    const missing = [];
    for (const [, key] of String(template).matchAll(/\{(\w+)\}/g)) {
      const value = vars[key];
      if ((value === void 0 || value === null || value === "") && !missing.includes(key)) missing.push(key);
    }
    return missing;
  }
  function cleanTitle(value) {
    return String(value || "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
  }
  function parseYear(value) {
    const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  // src/config.js
  var DEFAULT_CLIENT_ID = "";
  var API = {
    base: "https://api.trakt.tv",
    version: "2"
  };
  var CACHE_TTL = 8 * 60 * 60 * 1e3;

  // src/core/store.js
  var NS = "ogt:";
  function gm() {
    if (typeof GM_getValue === "function" && typeof GM_setValue === "function") {
      return {
        get: (key, fallback) => GM_getValue(key, fallback),
        set: (key, value) => GM_setValue(key, value),
        remove: (key) => typeof GM_deleteValue === "function" ? GM_deleteValue(key) : GM_setValue(key, void 0)
      };
    }
    return null;
  }
  var backend = gm();
  function localKey(key) {
    return NS + key;
  }
  function getValue(key, fallback = null) {
    if (backend) {
      const value = backend.get(key, fallback);
      return value === void 0 ? fallback : value;
    }
    try {
      const raw = localStorage.getItem(localKey(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function setValue(key, value) {
    if (backend) {
      backend.set(key, value);
      return;
    }
    try {
      localStorage.setItem(localKey(key), JSON.stringify(value));
    } catch {
    }
  }
  function removeValue(key) {
    if (backend) {
      backend.remove(key);
      return;
    }
    try {
      localStorage.removeItem(localKey(key));
    } catch {
    }
  }
  var STORAGE = {
    monthReview: (user, month) => `review.${encodeURIComponent(user)}.${month}`,
    dismissedReview: (user) => `review.dismissed.${encodeURIComponent(user)}`,
    clientId: "trakt.clientId",
    tokens: "trakt.oauth.tokens",
    redirectUri: "trakt.oauth.redirectUri",
    customLinks: "watch.customLinks",
    features: "features.disabled",
    debug: "debug",
    selection: (kind, id) => `selection.${kind}.${id}`
  };
  function getPrivateValue(key) {
    return backend ? backend.get(key, null) : null;
  }
  function setPrivateValue(key, value) {
    if (!backend) throw new Error("OAuth requires userscript GM storage.");
    backend.set(key, value);
  }
  function removePrivateValue(key) {
    backend?.remove(key);
  }

  // src/settings.js
  function getClientId() {
    const stored = getValue(STORAGE.clientId, "");
    return (stored || DEFAULT_CLIENT_ID || "").trim();
  }
  function setClientId(value) {
    const clean = String(value || "").trim();
    if (clean) setValue(STORAGE.clientId, clean);
    else removeValue(STORAGE.clientId);
    return clean;
  }
  function getCustomLinks() {
    const stored = getValue(STORAGE.customLinks, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry) => entry && typeof entry.label === "string" && typeof entry.url === "string").map((entry) => ({ label: entry.label, url: entry.url }));
  }
  function setCustomLinks(links) {
    setValue(STORAGE.customLinks, Array.isArray(links) ? links : []);
  }
  function addCustomLink(link) {
    const links = getCustomLinks();
    const clean = { label: String(link.label || "").trim(), url: String(link.url || "").trim() };
    if (!clean.label || !clean.url) return links;
    const withoutDuplicate = links.filter((entry) => entry.label.toLowerCase() !== clean.label.toLowerCase());
    const next = [...withoutDuplicate, clean];
    setCustomLinks(next);
    return next;
  }
  function removeCustomLink(label) {
    const next = getCustomLinks().filter((entry) => entry.label.toLowerCase() !== String(label).toLowerCase());
    setCustomLinks(next);
    return next;
  }
  function getSelection(kind, id) {
    const stored = getValue(STORAGE.selection(kind, id), null);
    if (!stored || typeof stored !== "object") return null;
    return { season: Number(stored.season) || null, episode: Number(stored.episode) || null };
  }
  function setSelection(kind, id, { season, episode }) {
    setValue(STORAGE.selection(kind, id), { season, episode });
  }
  function isDebug() {
    return Boolean(getValue(STORAGE.debug, false));
  }
  function setDebug(value) {
    setValue(STORAGE.debug, Boolean(value));
    setVerbose(Boolean(value));
    return Boolean(value);
  }
  function applyDebugSetting() {
    setVerbose(isDebug());
    return isVerbose();
  }
  function getDisabledFeatures() {
    const stored = getValue(STORAGE.features, []);
    if (!Array.isArray(stored)) return [];
    return [...new Set(stored.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
  }
  function isFeatureEnabled(id) {
    return !getDisabledFeatures().includes(String(id));
  }
  function setFeatureEnabled(id, enabled) {
    const featureId = String(id || "").trim();
    if (!featureId) return true;
    const disabled = new Set(getDisabledFeatures());
    if (enabled) disabled.delete(featureId);
    else disabled.add(featureId);
    setValue(STORAGE.features, [...disabled]);
    return !disabled.has(featureId);
  }

  // src/features/custom-links/data.js
  var TMDB_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/;
  var IMDB_RE = /imdb\.com\/title\/(tt\d+)/;
  var SEASON_HREF_RE = /\/seasons\/(\d+)(?:\/|$)/;
  var SHOW_HREF_RE = /^\/shows\/[^/]+\/?$/;
  var SEASON_IMDB_RE = /imdb\.com\/title\/(tt\d+)\/episodes/;
  function readTitleData(doc, route) {
    if (route.kind === "show" && (route.name === "season" || route.name === "episode")) {
      return {
        kind: "show",
        type: "tv",
        plural: "shows",
        id: route.id,
        title: cleanTitle(showLinkTitle(doc)) || showTitleFromPageTitle(doc, route) || null,
        year: null,
        tmdb: firstMatch(doc, 'a[href*="themoviedb.org/tv/"]', TMDB_RE, (match) => Number(match[2])),
        imdb: route.name === "season" ? firstMatch(doc, 'a[href*="imdb.com/title/"]', SEASON_IMDB_RE, (match) => match[1]) : null
      };
    }
    const heading = doc.querySelector(".summary-title h1") || doc.querySelector("h1");
    const rawHeading = headingText(heading);
    const yearEl = doc.querySelector(".summary-title .year") || doc.querySelector(".year");
    const year = parseYear(text(yearEl)) || parseYear(rawHeading);
    let tmdb = null;
    for (const link of doc.querySelectorAll('a[href*="themoviedb.org/"]')) {
      const match = link.getAttribute("href")?.match(TMDB_RE);
      if (match) {
        tmdb = Number(match[2]);
        break;
      }
    }
    let imdb = null;
    for (const link of doc.querySelectorAll('a[href*="imdb.com/title/"]')) {
      const match = link.getAttribute("href")?.match(IMDB_RE);
      if (match) {
        imdb = match[1];
        break;
      }
    }
    const kind = route.kind === "show" ? "show" : "movie";
    const fallbackTitle = text(doc.querySelector("title")).replace(/\s*[-–|]\s*Trakt.*$/i, "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
    return {
      kind,
      type: kind === "show" ? "tv" : "movie",
      plural: kind === "show" ? "shows" : "movies",
      id: route.id,
      title: cleanTitle(rawHeading) || fallbackTitle || null,
      year,
      tmdb,
      imdb
    };
  }
  function headingText(heading) {
    if (!heading) return "";
    const direct = [...heading.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(" ").trim();
    return direct || text(heading);
  }
  function firstMatch(doc, selector, pattern, value) {
    for (const link of doc.querySelectorAll(selector)) {
      const match = link.getAttribute("href")?.match(pattern);
      if (match) return value(match);
    }
    return null;
  }
  function showLinkTitle(doc) {
    for (const link of doc.querySelectorAll(".title-tags a[href]")) {
      if (SHOW_HREF_RE.test(link.getAttribute("href") || "")) return text(link);
    }
    return "";
  }
  function showTitleFromPageTitle(doc, route) {
    const raw = text(doc.querySelector("title")).replace(/\s*[-–|]\s*Trakt.*$/i, "").trim();
    const suffix = route.name === "season" ? /\s*:\s*Season\s+\d+\s*$/i : /\s+S\d+E\d+\s*:.*$/i;
    return raw.replace(suffix, "").trim();
  }
  function selectionForRoute(route, stored = null) {
    if (route.name === "season") return { season: route.season ?? null, episode: null };
    if (route.name === "episode") return { season: route.season ?? null, episode: route.episode ?? null };
    if (stored && typeof stored === "object") {
      return { season: stored.season ?? null, episode: stored.episode ?? null };
    }
    return { season: null, episode: null };
  }
  function showTemplateData(show) {
    if (!show || typeof show !== "object" || Array.isArray(show)) return null;
    const title = typeof show.title === "string" ? show.title.trim() : "";
    if (!title) return null;
    return {
      title,
      year: Number.isInteger(show.year) && show.year > 0 ? show.year : null,
      tmdb: Number.isSafeInteger(show.ids?.tmdb) && show.ids.tmdb > 0 ? show.ids.tmdb : null,
      imdb: typeof show.ids?.imdb === "string" && /^tt\d+$/.test(show.ids.imdb) ? show.ids.imdb : null
    };
  }
  function readSeasons(doc) {
    const found = /* @__PURE__ */ new Map();
    for (const subtitle of doc.querySelectorAll('a[href*="/seasons/"] span.subtitle')) {
      const link = subtitle.closest("a");
      const match = link?.getAttribute("href")?.match(SEASON_HREF_RE);
      if (!match) continue;
      const number = Number(match[1]);
      const count2 = Number(text(subtitle).match(/(\d+)/)?.[1]) || null;
      const existing = found.get(number);
      if (!existing || count2 && (!existing.episodes || count2 > existing.episodes)) {
        found.set(number, { number, episodes: count2 });
      }
    }
    return [...found.values()].sort((a, b) => a.number - b.number);
  }
  function templateVars(meta, selection = {}) {
    return {
      id: meta.id,
      plural: meta.plural,
      type: meta.type,
      title: meta.title,
      year: meta.year,
      tmdb: meta.tmdb,
      imdb: meta.imdb,
      season: selection.season,
      episode: selection.episode
    };
  }
  function mergeSeasons(primary, fallback = []) {
    const rendered = new Map(fallback.map((season) => [season.number, season]));
    return primary.map((season) => ({
      number: season.number,
      episodes: season.episodes ?? rendered.get(season.number)?.episodes ?? null
    })).sort((a, b) => a.number - b.number);
  }
  function filterPresetsByKind(presets, kind) {
    return presets.filter((preset) => preset.kinds.includes(kind));
  }
  function presetAlreadyAdded(links, preset) {
    return links.some((link) => link.url === preset.url);
  }
  function addPresets(links, presets) {
    const urls = new Set(links.map((link) => link.url));
    const additions = [];
    for (const preset of presets) {
      if (urls.has(preset.url)) continue;
      urls.add(preset.url);
      additions.push({ label: preset.label, url: preset.url });
    }
    return [...links, ...additions];
  }
  function moveLink(links, index, direction) {
    const next = [...links];
    const target = index + direction;
    if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  function validateCustomLinks(links) {
    const errors = [];
    for (const [index, link] of links.entries()) {
      if (!String(link.label || "").trim()) errors.push({ index, field: "label", message: "A label is required." });
      if (!String(link.url || "").trim()) {
        errors.push({ index, field: "url", message: "A URL is required." });
        continue;
      }
      if (!/^https?:\/\//i.test(String(link.url).trim())) {
        errors.push({ index, field: "url", message: "URL must start with http:// or https://." });
      }
    }
    return errors;
  }

  // src/features/custom-links/presets.js
  var PRESETS = [
    {
      label: "Metacritic",
      url: "https://www.metacritic.com/search/{title}/",
      kinds: ["movie", "show"]
    },
    {
      label: "Stremio",
      url: "https://web.stremio.com/#/search?search={title}",
      kinds: ["movie", "show"]
    },
    {
      label: "Plex",
      url: "https://app.plex.tv/desktop/#!/search?query={title}",
      kinds: ["movie", "show"]
    },
    {
      label: "AniList",
      url: "https://anilist.co/search/anime?search={title}",
      kinds: ["movie", "show"]
    }
  ];

  // src/core/http.js
  var HttpError = class extends Error {
    constructor(message, status, body) {
      super(message);
      this.name = "HttpError";
      this.status = status;
      this.body = body;
    }
  };
  var MAX_CONCURRENT = 4;
  var MAX_RETRIES = 2;
  var DEFAULT_TIMEOUT = 2e4;
  var active = 0;
  var waiting = [];
  function acquire() {
    if (active < MAX_CONCURRENT) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  }
  function release() {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  }
  function rawRequest({ method = "GET", url, headers: headers2 = {}, body = null, timeout = DEFAULT_TIMEOUT, signal }) {
    const gmRequest = typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest : null;
    if (!gmRequest) {
      return fetch(url, { method, headers: headers2, body, signal }).then(async (response) => ({
        status: response.status,
        headers: response.headers,
        text: await response.text()
      }));
    }
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new HttpError("Request cancelled", 0, null));
      let handle;
      const abort = () => {
        handle?.abort();
        reject(new HttpError("Request cancelled", 0, null));
      };
      const finish = (callback, value) => {
        signal?.removeEventListener("abort", abort);
        callback(value);
      };
      signal?.addEventListener("abort", abort, { once: true });
      handle = gmRequest({
        method,
        url,
        headers: headers2,
        data: body,
        timeout,
        onload: (response) => finish(resolve, { status: response.status, headers: response.responseHeaders, text: response.responseText }),
        onerror: () => finish(reject, new HttpError(`Network error for ${url}`, 0, null)),
        ontimeout: () => finish(reject, new HttpError(`Timed out for ${url}`, 0, null)),
        onabort: () => finish(reject, new HttpError(`Aborted ${url}`, 0, null))
      });
    });
  }
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function request(options) {
    await acquire();
    try {
      let attempt = 0;
      for (; ; ) {
        const response = await rawRequest(options);
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt >= (options.retries ?? MAX_RETRIES)) return response;
        const retryAfter = Number(headerValue(response.headers, "retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1e3, 1e4) : 1e3 * (attempt + 1);
        attempt += 1;
        await sleep(delay);
      }
    } finally {
      release();
    }
  }
  function headerValue(headers2, name) {
    if (!headers2) return null;
    if (typeof headers2.get === "function") return headers2.get(name);
    const line = String(headers2).split(/\r?\n/).find((row) => row.toLowerCase().startsWith(`${name}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : null;
  }
  var cache = /* @__PURE__ */ new Map();
  async function getJSON(url, { headers: headers2 = {}, ttl = 0 } = {}) {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expires > now) return hit.value;
    const response = await request({ url, headers: headers2, method: "GET" });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text);
    }
    let value;
    try {
      value = JSON.parse(response.text);
    } catch (error) {
      throw new HttpError(`Invalid JSON from ${url}`, response.status, response.text);
    }
    if (ttl > 0) cache.set(url, { expires: now + ttl, value });
    return value;
  }
  function clearCache(prefix) {
    if (!prefix) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  }
  function cacheSize() {
    return cache.size;
  }

  // src/core/oauth.js
  var AUTH = "https://auth.trakt.tv";
  var generation = 0;
  var refreshFlight = null;
  var device = null;
  var DEVICE_MESSAGES = {
    400: "Waiting for Trakt authorization.",
    404: "Invalid device code; start sign-in again.",
    409: "Device code already used; start sign-in again.",
    410: "Device code expired; start sign-in again.",
    418: "Trakt authorization denied.",
    429: "Polling slowed down; waiting before trying again."
  };
  function authError(message, status = 0) {
    return new HttpError(message, status, null);
  }
  async function privateRequest(url, options = {}) {
    try {
      const r = await request({ ...options, url, retries: 0 });
      return r;
    } catch {
      throw authError("Trakt request failed; check your connection.");
    }
  }
  function headers() {
    return { "Content-Type": "application/json" };
  }
  function post(path, body, signal) {
    return privateRequest(`${AUTH}/oauth${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body), signal });
  }
  function readTokens() {
    const t = getPrivateValue(STORAGE.tokens);
    return t?.client_id === getClientId() ? t : null;
  }
  function isSignedIn() {
    const t = readTokens();
    return Boolean(t?.access_token && t?.refresh_token);
  }
  function saveTokens(text2, clientId) {
    let t;
    try {
      t = JSON.parse(text2);
    } catch {
    }
    if (!t || typeof t.access_token !== "string" || !t.access_token || typeof t.refresh_token !== "string" || !t.refresh_token || !Number.isFinite(t.expires_in) || t.expires_in <= 0 || t.created_at != null && !Number.isFinite(t.created_at)) {
      throw authError("Trakt returned invalid token data; sign in again.");
    }
    const tokens = {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      client_id: clientId,
      expires_at: (t.created_at == null ? Date.now() : t.created_at * 1e3) + t.expires_in * 1e3
    };
    setPrivateValue(STORAGE.tokens, tokens);
    return tokens;
  }
  function clearTokens() {
    generation += 1;
    removePrivateValue(STORAGE.tokens);
    if (typeof document !== "undefined") document.dispatchEvent(new Event("ogt:authchange"));
  }
  function refreshTokens() {
    if (refreshFlight) return refreshFlight;
    const epoch = generation;
    const t = readTokens();
    if (!t) return Promise.reject(authError("Signed out; sign in to Trakt."));
    refreshFlight = (async () => {
      try {
        const r = await post("/token", {
          client_id: t.client_id,
          refresh_token: t.refresh_token,
          grant_type: "refresh_token",
          redirect_uri: getPrivateValue(STORAGE.redirectUri)
        });
        if (epoch !== generation || getClientId() !== t.client_id) {
          if (r.status === 200) {
            try {
              const rotated = JSON.parse(r.text);
              const revoked = await post("/revoke", { token: rotated.access_token, client_id: t.client_id });
              if (revoked.status !== 200 && revoked.status !== 204) throw authError("Revocation failed.");
            } catch {
              throw authError("Signed out locally; token revocation failed.", 502);
            }
          }
          throw authError("Signed out; sign in to Trakt.");
        }
        if (r.status !== 200) throw authError("Trakt session expired; sign in again.", r.status);
        return saveTokens(r.text, t.client_id);
      } catch (error) {
        if (epoch !== generation) {
          if (error?.status === 502) throw authError("Signed out locally; token revocation failed.", 502);
          throw authError("Trakt session expired; sign in again.");
        }
        if (error?.status === 400 || error?.status === 401) {
          clearTokens();
          throw authError("Trakt session expired; sign in again.", error.status);
        }
        throw authError("Could not refresh your Trakt session; try again.", error?.status || 0);
      } finally {
        refreshFlight = null;
      }
    })();
    return refreshFlight;
  }
  function cancelSignIn() {
    device?.abort();
  }
  function wait(ms, signal) {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      signal.addEventListener("abort", done, { once: true });
      if (signal.aborted) done();
    });
  }
  async function signIn({ onCode = () => {
  }, onMessage = () => {
  } } = {}) {
    let lastMessage;
    const emit = (message) => {
      if (message === lastMessage) return;
      lastMessage = message;
      onMessage(message);
    };
    cancelSignIn();
    const controller = new AbortController();
    device = controller;
    const { signal } = controller;
    const epoch = generation;
    const clientId = getClientId();
    const current = () => !signal.aborted && epoch === generation && clientId === getClientId();
    try {
      if (!clientId) throw authError("Set your Trakt client ID first.");
      setPrivateValue(STORAGE.redirectUri, getPrivateValue(STORAGE.redirectUri));
      const started = Date.now();
      const r = await post("/device/code", { client_id: clientId }, signal);
      if (!current()) return;
      if (r.status !== 200) throw authError("Could not start Trakt sign-in.", r.status);
      let code;
      try {
        code = JSON.parse(r.text);
      } catch {
      }
      if (!code?.device_code || typeof code.user_code !== "string" || !/^https:\/\/(auth\.)?trakt\.tv\//.test(code.verification_url) || !Number.isFinite(code.interval) || code.interval <= 0 || !Number.isFinite(code.expires_in) || code.expires_in <= 0) throw authError("Invalid Trakt device response.");
      const deadline = started + code.expires_in * 1e3;
      let interval = code.interval * 1e3;
      onCode({ user_code: code.user_code, verification_url: code.verification_url });
      while (current()) {
        await wait(Math.min(interval, Math.max(0, deadline - Date.now())), signal);
        if (!current()) return;
        if (Date.now() >= deadline) {
          emit(DEVICE_MESSAGES[410]);
          return;
        }
        const result = await post("/device/token", { code: code.device_code, client_id: clientId }, signal);
        if (!current()) return;
        if (Date.now() >= deadline) {
          emit(DEVICE_MESSAGES[410]);
          return;
        }
        if (result.status === 200) {
          saveTokens(result.text, clientId);
          if (typeof document !== "undefined") document.dispatchEvent(new Event("ogt:authchange"));
          emit("Signed in to Trakt.");
          return;
        }
        emit(DEVICE_MESSAGES[result.status] || "Trakt sign-in failed; start again.");
        if (result.status === 429) interval += 5e3;
        else if (result.status !== 400) return;
      }
    } catch {
      if (current()) emit("Trakt sign-in failed; check your client ID and connection.");
    } finally {
      if (signal.aborted) emit("Trakt sign-in cancelled.");
      if (device === controller) device = null;
    }
  }
  async function signOut() {
    cancelSignIn();
    const pending = refreshFlight;
    const old = getPrivateValue(STORAGE.tokens);
    clearTokens();
    let refreshed;
    let rotationRevokeFailed = false;
    if (pending) {
      try {
        refreshed = await pending;
      } catch (error) {
        rotationRevokeFailed = error?.status === 502;
      }
    }
    const token = refreshed || old;
    try {
      if (token) {
        const r = await post("/revoke", { token: token.access_token, client_id: token.client_id });
        if (r.status !== 200 && r.status !== 204) throw authError("Signed out locally; Trakt revocation failed.");
      }
      if (rotationRevokeFailed) throw authError("Signed out locally; Trakt revocation failed.");
    } catch {
      throw authError("Signed out locally; revoke this app in Trakt settings if needed.");
    }
  }

  // src/core/trakt.js
  var MissingClientIdError = class extends Error {
    constructor() {
      super("No Trakt API client ID configured");
      this.name = "MissingClientIdError";
    }
  };
  function apiGet(path, { ttl = CACHE_TTL } = {}) {
    const clientId = getClientId();
    if (!clientId) return Promise.reject(new MissingClientIdError());
    return getJSON(`${API.base}${path}`, {
      ttl,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": API.version,
        "trakt-api-key": clientId
      }
    });
  }
  async function getSeasons(id) {
    const seasons = await apiGet(`/shows/${encodeURIComponent(id)}/seasons?extended=full`);
    if (!Array.isArray(seasons)) return [];
    return seasons.filter((season) => Number.isInteger(season.number)).map((season) => ({
      number: season.number,
      episodes: Number.isInteger(season.episode_count) ? season.episode_count : Number.isInteger(season.aired_episodes) ? season.aired_episodes : null
    })).sort((a, b) => a.number - b.number);
  }
  async function ping() {
    const started = Date.now();
    await apiGet("/shows/breaking-bad", { ttl: 0 });
    return Date.now() - started;
  }
  function apiAuth(method, path, body, options = {}) {
    return authenticated(method, path, body, options, false);
  }
  function apiAuthPage(path, options = {}) {
    return authenticated("GET", path, void 0, options, true);
  }
  async function authenticated(method, path, body, options, metadata) {
    if (!/^\/(?!\/)/.test(path) || /[?#]/.test(path) || path.includes("://")) {
      throw authError("Authenticated API paths must be relative and contain no query.");
    }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      const valid = method === "GET" && (["page", "limit"].includes(key) && Number.isSafeInteger(value) && value >= 1 && (key !== "limit" || value <= 1e3) || ["start_at", "end_at"].includes(key) && typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) || key === "extended" && ["images", "full", "full,images"].includes(value));
      if (!valid) throw authError("Unsupported authenticated query option.");
      query.set(key, String(value));
    }
    const requestPath = query.size ? `${path}?${query}` : path;
    let tokens = readTokens();
    if (!tokens) throw authError("Signed out; sign in to Trakt.");
    if (tokens.expires_at <= Date.now() + 6e4) {
      tokens = await refreshTokens();
    }
    const send = (t) => privateRequest(`${API.base}${requestPath}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": API.version,
        "trakt-api-key": t.client_id,
        Authorization: `Bearer ${t.access_token}`
      },
      body: body == null ? null : JSON.stringify(body)
    });
    let response = await send(tokens);
    if (response.status === 401) {
      const latest = readTokens();
      if (!latest) throw authError("Signed out; sign in to Trakt.");
      tokens = latest.access_token !== tokens.access_token ? latest : await refreshTokens();
      response = await send(tokens);
    }
    if (response.status === 401) {
      clearTokens();
      throw authError("Trakt session expired; sign in again.", 401);
    }
    if (response.status < 200 || response.status >= 300) throw authError("Authenticated Trakt request failed.", response.status);
    if (!response.text || response.status === 204) return null;
    try {
      const data = JSON.parse(response.text);
      if (!metadata) return data;
      const raw = headerValue(response.headers, "x-pagination-page-count");
      const pages = raw == null ? null : Number(raw);
      if (pages !== null && (!Number.isSafeInteger(pages) || pages < 0)) throw new Error();
      return { data, pages };
    } catch {
      throw authError("Invalid Trakt response.");
    }
  }

  // src/features/custom-links/api.js
  function getShowDetails(id) {
    return apiGet(`/shows/${encodeURIComponent(id)}`);
  }

  // src/features/custom-links/index.js
  var PANEL_ID = "ogt-custom-links";
  var TITLE_ID = "ogt-custom-links-title";
  function findMountPoint() {
    const top = document.querySelector(".summary-frame #overview .top") || document.querySelector("#overview .top");
    if (top?.parentElement) return { parent: top.parentElement, before: top.nextSibling };
    const overview = document.querySelector("#overview");
    if (overview) return { parent: overview, before: null };
    const hero = document.querySelector(".fanart-header");
    if (hero?.parentElement) return { parent: hero.parentElement, before: hero.nextSibling };
    return null;
  }
  function seasonLabel(number) {
    return number === 0 ? "Specials" : `Season ${number}`;
  }
  function chip({ label, href, template }) {
    const link = el("a", {
      class: "ogt-chip",
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      text: label
    });
    if (template) link.dataset.ogtTemplate = template;
    return link;
  }
  function createPanel(meta, route) {
    let cancelled = false;
    let seasons = [];
    const timers = [];
    const fixedSelection = route.name === "season" || route.name === "episode";
    let selection = selectionForRoute(route, fixedSelection ? null : getSelection(meta.kind, meta.id));
    const linksRow = el("div", { class: "ogt-row ogt-links" });
    const controlsRow = el("div", { class: "ogt-row", hidden: true });
    const actionsRow = el("div", { class: "ogt-row ogt-link-actions" });
    const tools = el("div", { class: "ogt-link-tools", hidden: true });
    const editor = el("div", { class: "ogt-editor", hidden: true });
    const presetChecklist = el("div", { class: "ogt-presets", hidden: true });
    tools.append(editor, presetChecklist);
    const presetsButton = el("button", { class: "ogt-chip", type: "button", text: "Add presets…" });
    const editButton = el("button", { class: "ogt-chip", type: "button", text: "Edit links" });
    actionsRow.append(presetsButton, editButton);
    const node = el(
      "section",
      { class: "ogt-panel", id: PANEL_ID, "aria-labelledby": TITLE_ID },
      el(
        "div",
        { class: "ogt-head" },
        el("h2", { class: "ogt-title", id: TITLE_ID, text: "Custom links" }),
        el("span", { class: "ogt-badge", text: "og toolkit" })
      ),
      linksRow,
      controlsRow,
      actionsRow,
      tools
    );
    const vars = () => templateVars(meta, selection);
    function updateLinkHrefs() {
      const values = vars();
      for (const link of linksRow.querySelectorAll("[data-ogt-template]")) {
        const template = link.dataset.ogtTemplate;
        if (missingPlaceholders(template, values).length) continue;
        link.setAttribute("href", fillTemplate(template, values));
      }
    }
    function renderLinks() {
      const values = vars();
      linksRow.replaceChildren();
      const links = getCustomLinks();
      if (!links.length) {
        linksRow.append(
          el("p", { class: "ogt-hint", text: "Add links to your own services: Plex, Jellyfin, Sonarr, or any URL." })
        );
      }
      for (const entry of links) {
        if (!/^https?:\/\//i.test(entry.url)) continue;
        if (missingPlaceholders(entry.url, values).length) continue;
        linksRow.append(chip({ label: entry.label, href: fillTemplate(entry.url, values), template: entry.url }));
      }
      lookUpShow();
    }
    let showRequested = false;
    function lookUpShow() {
      if (!fixedSelection || showRequested || !getClientId()) return;
      const missing = ["year", "tmdb", "imdb"].filter((key) => meta[key] == null);
      if (!getCustomLinks().some((entry) => missing.some((key) => entry.url.includes(`{${key}}`)))) return;
      showRequested = true;
      getShowDetails(route.id).then((show) => setMeta(showTemplateData(show))).catch((error) => {
        if (!cancelled) debugError("show lookup failed", error);
      });
    }
    let currentView = null;
    let returnFocus = null;
    let draft = [];
    let nextDraftId = 0;
    let selectedPresets = /* @__PURE__ */ new Set();
    function closeTools() {
      currentView = null;
      tools.hidden = true;
      editor.hidden = true;
      presetChecklist.hidden = true;
      const target = returnFocus;
      returnFocus = null;
      target?.focus();
    }
    function renderEditor(focusKey) {
      editor.replaceChildren();
      const list = el("div", { class: "ogt-editor-list" });
      for (const [index, entry] of draft.entries()) {
        const labelInput = el("input", {
          class: "ogt-editor-input",
          type: "text",
          value: entry.label,
          "aria-label": "Link label",
          "data-focus": `${entry.id}-label`
        });
        labelInput.addEventListener("input", () => {
          entry.label = labelInput.value;
        });
        const urlInput = el("input", {
          class: "ogt-editor-input",
          type: "text",
          value: entry.url,
          "aria-label": "Link URL",
          "data-focus": `${entry.id}-url`
        });
        urlInput.addEventListener("input", () => {
          entry.url = urlInput.value;
        });
        const up = el("button", {
          class: "ogt-mini-button",
          type: "button",
          text: "↑",
          "aria-label": "Move up",
          disabled: index === 0,
          "data-focus": `${entry.id}-up`
        });
        up.addEventListener("click", () => {
          draft = moveLink(draft, index, -1);
          renderEditor(`${entry.id}-up`);
        });
        const down = el("button", {
          class: "ogt-mini-button",
          type: "button",
          text: "↓",
          "aria-label": "Move down",
          disabled: index === draft.length - 1,
          "data-focus": `${entry.id}-down`
        });
        down.addEventListener("click", () => {
          draft = moveLink(draft, index, 1);
          renderEditor(`${entry.id}-down`);
        });
        const remove = el("button", {
          class: "ogt-mini-button",
          type: "button",
          text: "Delete",
          "aria-label": "Delete link"
        });
        remove.addEventListener("click", () => {
          draft = draft.filter((link) => link.id !== entry.id);
          const nextEntry = draft[Math.min(index, draft.length - 1)];
          renderEditor(nextEntry ? `${nextEntry.id}-label` : "add-link");
        });
        list.append(
          el(
            "div",
            { class: "ogt-editor-row" },
            el("label", { class: "ogt-editor-field" }, "Label", labelInput),
            el("label", { class: "ogt-editor-field" }, "URL", urlInput),
            el("div", { class: "ogt-editor-actions" }, up, down, remove)
          )
        );
      }
      const error = el("p", { class: "ogt-editor-error", role: "alert", hidden: true });
      const add = el("button", {
        class: "ogt-chip",
        type: "button",
        text: "Add link",
        "data-focus": "add-link"
      });
      add.addEventListener("click", () => {
        const entry = { id: nextDraftId++, label: "", url: "" };
        draft.push(entry);
        renderEditor(`${entry.id}-label`);
      });
      const save = el("button", { class: "ogt-chip", type: "button", text: "Save links" });
      save.addEventListener("click", () => {
        const errors = validateCustomLinks(draft);
        if (errors.length) {
          const first = errors[0];
          error.textContent = first.message;
          error.hidden = false;
          const entry = draft[first.index];
          editor.querySelector(`[data-focus="${entry.id}-${first.field}"]`)?.focus();
          return;
        }
        setCustomLinks(draft.map(({ label, url }) => ({ label: label.trim(), url: url.trim() })));
        renderLinks();
        if (meta.kind === "show" && needsSelection()) {
          if (seasons.length) renderControls();
          else loadSeasons();
        } else {
          controlsRow.hidden = true;
        }
        closeTools();
      });
      const cancel = el("button", { class: "ogt-chip", type: "button", text: "Cancel" });
      cancel.addEventListener("click", closeTools);
      editor.append(
        el("div", { class: "ogt-editor-list-wrap" }, list),
        error,
        el("div", { class: "ogt-row ogt-editor-footer" }, add, save, cancel)
      );
      if (focusKey) editor.querySelector(`[data-focus="${focusKey}"]`)?.focus();
    }
    function openEditor() {
      currentView = "editor";
      returnFocus = editButton;
      draft = getCustomLinks().map((link) => ({ ...link, id: nextDraftId++ }));
      tools.hidden = false;
      editor.hidden = false;
      presetChecklist.hidden = true;
      renderEditor(draft.length ? `${draft[0].id}-label` : "add-link");
    }
    function renderPresetChecklist() {
      const links = getCustomLinks();
      const presets = filterPresetsByKind(PRESETS, meta.kind);
      const list = el("div", { class: "ogt-preset-list" });
      selectedPresets = /* @__PURE__ */ new Set();
      for (const [index, preset] of presets.entries()) {
        const added = presetAlreadyAdded(links, preset);
        const checkbox = el("input", {
          type: "checkbox",
          value: preset.url,
          disabled: added,
          "aria-label": preset.label
        });
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selectedPresets.add(preset.url);
          else selectedPresets.delete(preset.url);
        });
        const label = el(
          "label",
          { class: "ogt-preset-item", for: `ogt-preset-${index}` },
          checkbox,
          el("span", { text: preset.label }),
          added ? el("span", { class: "ogt-preset-added", text: "added" }) : null
        );
        checkbox.id = `ogt-preset-${index}`;
        list.append(label);
      }
      const error = el("p", { class: "ogt-hint", text: "Choose the services you want to add." });
      const confirm = el("button", { class: "ogt-chip", type: "button", text: "Add selected" });
      confirm.addEventListener("click", () => {
        const selected = presets.filter((preset) => selectedPresets.has(preset.url));
        if (selected.length) {
          setCustomLinks(addPresets(getCustomLinks(), selected));
          renderLinks();
        }
        closeTools();
      });
      const cancel = el("button", { class: "ogt-chip", type: "button", text: "Cancel" });
      cancel.addEventListener("click", closeTools);
      presetChecklist.replaceChildren(
        el("div", { class: "ogt-preset-list-wrap" }, list),
        error,
        el("div", { class: "ogt-row ogt-editor-footer" }, confirm, cancel)
      );
    }
    function openPresets() {
      currentView = "presets";
      returnFocus = presetsButton;
      tools.hidden = false;
      editor.hidden = true;
      presetChecklist.hidden = false;
      renderPresetChecklist();
      const firstChoice = presetChecklist.querySelector('input[type="checkbox"]:not(:disabled)');
      (firstChoice || presetChecklist.querySelector("button"))?.focus();
    }
    function onKeyDown(event) {
      if (event.key === "Escape" && currentView) {
        event.preventDefault();
        closeTools();
      }
    }
    presetsButton.addEventListener("click", openPresets);
    editButton.addEventListener("click", openEditor);
    node.addEventListener("keydown", onKeyDown);
    function needsSelection() {
      return !fixedSelection && getCustomLinks().some((entry) => /\{(?:season|episode)\}/.test(entry.url));
    }
    function persistSelection() {
      if (!fixedSelection && selection.season != null) setSelection(meta.kind, meta.id, selection);
    }
    const seasonSelect = el("select", { class: "ogt-select", "aria-label": "Season" });
    const episodeSlot = el("span", { class: "ogt-episode" });
    const seasonField = el("label", { class: "ogt-field" }, "Season", seasonSelect);
    const episodeField = el("label", { class: "ogt-field" }, "Episode", episodeSlot);
    let controlsBuilt = false;
    function ensureControls() {
      if (controlsBuilt) return;
      seasonSelect.addEventListener("change", () => {
        selection.season = Number(seasonSelect.value);
        selection.episode = 1;
        persistSelection();
        renderEpisodeField();
        updateLinkHrefs();
      });
      controlsRow.replaceChildren(seasonField, episodeField);
      controlsBuilt = true;
    }
    function renderEpisodeField() {
      const season = seasons.find((entry) => entry.number === selection.season);
      const count2 = season?.episodes || null;
      if (!count2 || count2 < 1) {
        episodeSlot.replaceChildren(el("span", { text: "—" }));
        selection.episode = null;
        return;
      }
      if (selection.episode == null || selection.episode > count2) selection.episode = 1;
      if (count2 > 8) {
        const input = el("input", {
          class: "ogt-input",
          type: "number",
          min: "1",
          max: String(count2),
          value: String(selection.episode),
          "aria-label": "Episode"
        });
        input.addEventListener("change", () => {
          const value = Number(input.value);
          if (Number.isInteger(value) && value >= 1 && value <= count2) {
            selection.episode = value;
            persistSelection();
            updateLinkHrefs();
          } else {
            input.value = String(selection.episode);
          }
        });
        episodeSlot.replaceChildren(input);
        return;
      }
      const select = el("select", { class: "ogt-select", "aria-label": "Episode" });
      for (let i = 1; i <= count2; i++) {
        select.append(el("option", { value: String(i), text: `Episode ${i}` }));
      }
      select.value = String(selection.episode);
      select.addEventListener("change", () => {
        selection.episode = Number(select.value);
        persistSelection();
        updateLinkHrefs();
      });
      episodeSlot.replaceChildren(select);
    }
    function renderControls() {
      const hasSeasons = !fixedSelection && meta.kind === "show" && seasons.length > 0 && needsSelection();
      if (!hasSeasons) {
        controlsRow.hidden = true;
        return;
      }
      ensureControls();
      seasonField.hidden = false;
      episodeField.hidden = false;
      controlsRow.hidden = false;
      const available = seasons.map((season) => season.number);
      if (selection.season == null || !available.includes(selection.season)) {
        selection.season = available.includes(1) ? 1 : available[0];
      }
      if (seasonSelect.options.length !== seasons.length) {
        seasonSelect.replaceChildren(
          ...seasons.map((season) => el("option", { value: String(season.number), text: seasonLabel(season.number) }))
        );
      }
      seasonSelect.value = String(selection.season);
      renderEpisodeField();
      renderLinks();
      updateLinkHrefs();
    }
    function loadSeasons() {
      if (meta.kind !== "show" || fixedSelection) return;
      seasons = readSeasons(document);
      if (seasons.length) renderControls();
      if (!getClientId()) {
        if (!seasons.length) retryFromDom();
        return;
      }
      getSeasons(meta.id).then((list) => {
        if (cancelled || !list.length) return;
        seasons = mergeSeasons(list, seasons);
        renderControls();
      }).catch((error) => {
        debugError("season lookup failed", error);
        if (!cancelled && !seasons.length) retryFromDom();
      });
    }
    function retryFromDom() {
      let attempt = 0;
      const retry = () => {
        if (cancelled) return;
        seasons = readSeasons(document);
        if (seasons.length) {
          renderControls();
          return;
        }
        attempt += 1;
        if (attempt < 4) timers.push(setTimeout(retry, 400 * attempt));
      };
      timers.push(setTimeout(retry, 400));
    }
    function onRefresh() {
      renderLinks();
      if (meta.kind === "show" && needsSelection()) {
        if (seasons.length) renderControls();
        else loadSeasons();
      } else {
        controlsRow.hidden = true;
      }
    }
    function setMeta(next) {
      if (cancelled || !next) return;
      for (const [key, value] of Object.entries(next)) if (value != null) meta[key] = value;
      renderLinks();
    }
    renderLinks();
    if (meta.kind === "show" && needsSelection()) loadSeasons();
    else renderControls();
    document.addEventListener("ogt:refresh", onRefresh);
    return {
      node,
      destroy() {
        cancelled = true;
        for (const timer of timers) clearTimeout(timer);
        timers.length = 0;
        document.removeEventListener("ogt:refresh", onRefresh);
        node.remove();
      }
    };
  }
  var customLinks = {
    id: "custom-links",
    match(route) {
      return route.kind === "movie" || route.kind === "show";
    },
    mount(route) {
      if (document.getElementById(PANEL_ID)) return null;
      const meta = readTitleData(document, route);
      if (!meta.id) return null;
      const mount = findMountPoint();
      if (!mount) return null;
      const panel = createPanel(meta, route);
      mount.parent.insertBefore(panel.node, mount.before);
      return panel;
    }
  };

  // src/features/playback/data.js
  var DAY = 24 * 60 * 60 * 1e3;
  function posterUrl(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value.startsWith("https://") ? value : `https://${value}`);
      return url.protocol === "https:" && url.hostname === "media.trakt.tv" ? url.href : null;
    } catch {
      return null;
    }
  }
  function mapPlayback(rows, kind) {
    const mapped = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const media = kind === "movie" ? row?.movie : row?.show;
      const episode = row?.episode;
      if (!Number.isSafeInteger(row?.id) || row.id <= 0 || !media?.ids || typeof row.progress !== "number" || !Number.isFinite(row.progress) || row.progress < 0 || row.progress > 100 || !Number.isFinite(Date.parse(row.paused_at))) continue;
      if (kind === "episode" && (!Number.isInteger(episode?.season) || episode.season < 0 || !Number.isInteger(episode?.number) || episode.number < 1)) continue;
      const slug = media.ids.slug || media.ids.trakt;
      if (!slug) continue;
      const root2 = `/${kind === "movie" ? "movies" : "shows"}/${encodeURIComponent(slug)}`;
      mapped.push({
        id: row.id,
        kind,
        ids: { ...media.ids },
        season: kind === "episode" ? episode.season : null,
        episode: kind === "episode" ? episode.number : null,
        title: kind === "movie" ? media.title || "Untitled movie" : `${media.title || "Untitled show"} · ${episode.season}×${String(episode.number).padStart(2, "0")} · ${episode.title || "Untitled episode"}`,
        href: kind === "movie" ? root2 : `${root2}/seasons/${episode.season}/episodes/${episode.number}`,
        poster: posterUrl(media.images?.poster?.[0]),
        progress: row.progress,
        pausedAt: row.paused_at,
        pausedMs: Date.parse(row.paused_at)
      });
    }
    return sortPlayback(mapped);
  }
  function sortPlayback(items) {
    return [...items].sort((a, b) => b.pausedMs - a.pausedMs || a.id - b.id);
  }
  function olderThan(items, days, now = Date.now()) {
    if (String(days).trim() === "" || !Number.isFinite(Number(days)) || Number(days) < 0) return [];
    const cutoff = now - Number(days) * DAY;
    return items.filter((item) => Number.isFinite(item.pausedMs) && item.pausedMs < cutoff);
  }
  function matchesRoute(item, route) {
    const kind = route.name === "episode" ? "episode" : route.kind;
    return item.kind === kind && [item.ids.slug, item.ids.trakt].some((id) => id != null && String(id) === route.id) && (kind !== "episode" || item.season === route.season && item.episode === route.episode);
  }

  // src/features/playback/api.js
  var TTL = 6e4;
  function createPlaybackApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
    const cache3 = /* @__PURE__ */ new Map();
    const flights = /* @__PURE__ */ new Map();
    let revision = 0;
    let session = 0;
    function invalidate() {
      revision += 1;
      cache3.clear();
      flights.clear();
    }
    function resetSession() {
      session += 1;
      invalidate();
    }
    async function load(kind, { force = false } = {}) {
      if (!signedIn()) {
        resetSession();
        return [];
      }
      if (force) invalidate();
      const hit = cache3.get(kind);
      if (hit && hit.until > now()) return hit.items;
      if (flights.has(kind)) return flights.get(kind);
      const rev = revision;
      const epoch = session;
      const flight2 = (async () => {
        const rows = await auth("GET", `/sync/playback/${kind === "movie" ? "movies" : "episodes"}`, void 0, { extended: "images" });
        if (epoch !== session || !signedIn()) throw new Error("Playback session changed.");
        if (!Array.isArray(rows)) throw new Error("Invalid playback response.");
        const items = mapPlayback(rows, kind);
        if (rev === revision) cache3.set(kind, { items, until: now() + TTL });
        return items;
      })();
      flights.set(kind, flight2);
      try {
        return await flight2;
      } finally {
        if (flights.get(kind) === flight2) flights.delete(kind);
      }
    }
    async function loadAll({ force = false } = {}) {
      if (force) invalidate();
      const [movies, episodes] = await Promise.all([load("movie"), load("episode")]);
      return sortPlayback([...movies, ...episodes]);
    }
    async function clearItems(ids, confirm) {
      const unique = [...new Set(ids)];
      if (unique.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Invalid playback ID.");
      if (!signedIn()) throw new Error("Sign in to Trakt first.");
      const epoch = session;
      if (!unique.length || !confirm(`Clear paused playback for ${unique.length} item${unique.length === 1 ? "" : "s"}? This cannot be undone.`)) {
        return { cancelled: true, cleared: [], failed: [] };
      }
      let cursor = 0;
      const cleared = [];
      const failed = [];
      try {
        await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
          while (cursor < unique.length) {
            const id = unique[cursor++];
            if (session !== epoch || !signedIn()) {
              failed.push(id);
              continue;
            }
            try {
              await auth("DELETE", `/sync/playback/${id}`);
              cleared.push(id);
            } catch {
              failed.push(id);
            }
          }
        }));
      } finally {
        invalidate();
      }
      return { cancelled: false, cleared, failed };
    }
    return { load, loadAll, clearItems, invalidate, resetSession };
  }
  var playbackApi = createPlaybackApi();
  if (typeof document !== "undefined") document.addEventListener("ogt:authchange", () => playbackApi.resetSession());

  // src/features/playback/styles.js
  var CSS2 = String.raw`
.ogt-playback { color: var(--ogt-fg); }
/* og's Container: full width with half gutters on phones, then fixed 740/960/1160px columns. */
.ogt-playback__column { margin-inline: auto; padding-inline: calc(var(--gutter, 30px) / 2); box-sizing: border-box; }
@media (min-width: 768px) { .ogt-playback__column { inline-size: var(--container-sm, 740px); } }
@media (min-width: 992px) { .ogt-playback__column { inline-size: var(--container-md, 960px); } }
@media (min-width: 1200px) { .ogt-playback__column { inline-size: var(--container-lg, 1160px); } }
.ogt-playback__tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 8px; }
.ogt-playback__list { list-style: none; padding: 0; margin: 0; }
.ogt-playback__item { display: flex; align-items: center; gap: 12px; padding-block: 8px; border-block-end: 1px solid light-dark(#ddd, #444); }
.ogt-playback__poster { inline-size: 42px; block-size: 63px; object-fit: cover; background: light-dark(#eee, #333); flex-shrink: 0; }
.ogt-playback__details { flex: 1; min-inline-size: 0; }
.ogt-playback__date { display: block; font-size: .85em; color: light-dark(#555, #bbb); }
.ogt-playback__meter { inline-size: 90px; accent-color: var(--brand-primary, #ed1c24); }
.ogt-playback__days { inline-size: 5em; }
.ogt-playback [hidden] { display: none; }
`;

  // src/features/playback/index.js
  var ID = "ogt-playback";
  var percent = (value) => `${Number(value.toFixed(1))}%`;
  var button = (label, action) => el("button", { class: "ogt-chip", type: "button", text: label, dataset: { action } });
  function createPanel2(route) {
    const overview = route.name === "progress";
    const kind = route.name === "episode" ? "episode" : "movie";
    let destroyed = false;
    let busy = false;
    let items = [];
    let loaded = false;
    const selected = /* @__PURE__ */ new Set();
    const status = el("p", { class: "ogt-hint", role: "status", "aria-live": "polite" });
    const content = el("div");
    const node = el(
      "section",
      { id: ID, class: "ogt-panel ogt-playback", "aria-labelledby": `${ID}-title`, hidden: !overview },
      el("h2", { class: "ogt-title", id: `${ID}-title`, text: overview ? "Paused playback" : "Playback progress" }),
      ...overview ? [
        el("p", { class: "ogt-hint", text: "Your paused movies and episodes from the toolkit’s Trakt account." }),
        button("Load paused playback", "load")
      ] : [],
      status,
      content
    );
    function alive() {
      return !destroyed && isSignedIn();
    }
    function lock(next) {
      busy = next;
      node.setAttribute("aria-busy", String(next));
      for (const input of node.querySelectorAll("button, input")) input.disabled = next;
    }
    function render() {
      if (!alive()) return;
      content.replaceChildren();
      if (!overview) {
        const item = items.find((row) => matchesRoute(row, route));
        node.hidden = !item;
        if (!item) return;
        const clear2 = button("Clear", "one");
        clear2.dataset.id = String(item.id);
        content.append(el(
          "div",
          { class: "ogt-playback__tools" },
          el("span", { text: `${percent(item.progress)} paused` }),
          el("progress", { class: "ogt-playback__meter", max: 100, value: item.progress, "aria-label": "Saved playback progress" }),
          clear2
        ));
        return;
      }
      node.querySelector('[data-action="load"]').textContent = loaded ? "Refresh paused playback" : "Load paused playback";
      if (!loaded) return;
      for (const id of selected) if (!items.some((row) => row.id === id)) selected.delete(id);
      if (!items.length) {
        content.append(el("p", { class: "ogt-hint", text: "No paused playback." }));
        return;
      }
      const all = el("input", { type: "checkbox", dataset: { action: "all" }, checked: items.every((row) => selected.has(row.id)), "aria-label": "Select all paused items" });
      const tools = el(
        "div",
        { class: "ogt-playback__tools" },
        el("label", {}, all, " Select all"),
        button("Clear selected", "selected"),
        el("label", {}, "Older than ", el("input", { class: "ogt-select ogt-playback__days", type: "number", min: 0, step: 1, value: 30, "aria-label": "Age in days" }), " days"),
        button("Clear older items", "age")
      );
      const list = el("ul", { class: "ogt-playback__list" });
      for (const item of items) {
        const clear2 = button("Clear", "one");
        clear2.dataset.id = String(item.id);
        const poster = item.poster ? el("img", { class: "ogt-playback__poster", src: item.poster, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "ogt-playback__poster", "aria-hidden": true });
        list.append(el(
          "li",
          { class: "ogt-playback__item" },
          el("input", { type: "checkbox", dataset: { id: item.id, action: "select" }, checked: selected.has(item.id), "aria-label": `Select ${item.title}` }),
          poster,
          el(
            "div",
            { class: "ogt-playback__details" },
            el("a", { href: item.href, text: item.title }),
            el("span", { text: ` · ${percent(item.progress)}` }),
            el("time", { class: "ogt-playback__date", datetime: item.pausedAt, text: `Paused ${new Date(item.pausedMs).toLocaleString()}` })
          ),
          clear2
        ));
      }
      content.append(tools, list);
    }
    async function read(force = false) {
      items = overview ? await playbackApi.loadAll({ force }) : await playbackApi.load(kind, { force });
      if (!alive()) return;
      loaded = true;
      render();
    }
    async function clear(ids) {
      if (!ids.length) {
        status.textContent = "No paused items selected.";
        return;
      }
      const result = await playbackApi.clearItems(ids, (message2) => window.confirm(message2));
      if (result.cancelled || !alive()) return;
      selected.clear();
      const summary2 = `${result.cleared.length} cleared${result.failed.length ? `; ${result.failed.length} failed — try again` : ""}.`;
      items = [];
      render();
      let message = summary2;
      try {
        await read(true);
      } catch (error) {
        debugError("playback refresh failed", error);
        message = `${summary2} Could not refresh playback; try Refresh.`;
      }
      if (!alive()) return;
      if (!overview && node.hidden) toast(`Paused playback: ${message}`);
      else status.textContent = message;
    }
    async function onClick(event) {
      const target = event.target.closest("button[data-action]");
      if (!target || !node.contains(target) || busy || !alive()) return;
      const action = target.dataset.action;
      lock(true);
      try {
        if (action === "load") {
          status.textContent = "Loading paused playback…";
          await read(true);
          if (alive()) status.textContent = "";
        } else if (action === "one") await clear([Number(target.dataset.id)]);
        else if (action === "selected") await clear([...selected]);
        else if (action === "age") {
          const days = node.querySelector('[aria-label="Age in days"]').value;
          if (days.trim() === "" || !Number.isInteger(Number(days)) || Number(days) < 0) {
            status.textContent = "Enter a whole number of days, zero or greater.";
          } else await clear(olderThan(items, days).map((row) => row.id));
        }
      } catch (error) {
        debugError("playback request failed", error);
        if (alive()) status.textContent = "Could not load paused playback; try again.";
      } finally {
        if (alive()) lock(false);
      }
    }
    function onChange(event) {
      const input = event.target;
      if (input.dataset.action === "all") {
        selected.clear();
        if (input.checked) for (const row of items) selected.add(row.id);
        for (const box of node.querySelectorAll('[data-action="select"]')) box.checked = input.checked;
      } else if (input.dataset.action === "select") {
        if (input.checked) selected.add(Number(input.dataset.id));
        else selected.delete(Number(input.dataset.id));
        node.querySelector('[data-action="all"]').checked = items.every((row) => selected.has(row.id));
      }
    }
    node.addEventListener("click", onClick);
    node.addEventListener("change", onChange);
    if (!overview) {
      read().catch((error) => {
        if (alive()) debugError("playback badge lookup failed", error);
      });
    }
    return { node, destroy() {
      destroyed = true;
      node.removeEventListener("click", onClick);
      node.removeEventListener("change", onChange);
      node.remove();
    } };
  }
  var playback = {
    id: "playback",
    css: CSS2,
    match(route) {
      return isSignedIn() && (route.name === "progress" || route.kind === "movie" && route.name === "title" || route.name === "episode");
    },
    mount(route) {
      if (document.getElementById(ID)) return null;
      const anchor = route.name === "progress" ? document.querySelector("section.progress") : document.querySelector(".summary-frame #overview .top");
      if (!anchor?.parentElement) return null;
      const panel = createPanel2(route);
      if (route.name !== "progress") {
        anchor.parentElement.insertBefore(panel.node, anchor.nextSibling);
        return panel;
      }
      const column = el("div", { class: "ogt-playback__column" }, panel.node);
      anchor.prepend(column);
      return { node: column, destroy() {
        panel.destroy();
        column.remove();
      } };
    }
  };

  // src/features/pronunciation/data.js
  var DEFAULT_AUDIO_HOST = "audio12.forvo.com";
  var AUDIO_HOST = /^(?:[a-z0-9-]+\.)+forvo\.com$/i;
  var AUDIO_PATH = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;
  var PLAY_ARGUMENT = /'((?:[^'\\]|\\.)*)'/g;
  var MAX_RECORDINGS = 12;
  function readPersonName(doc) {
    return text(doc.querySelector(".summary .summary-title h1")) || null;
  }
  function forvoUrl(name) {
    return `https://forvo.com/search/${encodeURIComponent(name)}/`;
  }
  function forvoAudioHost(html) {
    const match = String(html).match(/_AUDIO_HTTP_HOST\s*=\s*['"]([^'"]+)['"]/);
    return match && AUDIO_HOST.test(match[1]) ? match[1] : DEFAULT_AUDIO_HOST;
  }
  function decodeForvoPath(encoded) {
    if (!encoded) return null;
    try {
      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
      return AUDIO_PATH.test(decoded) ? decoded : null;
    } catch {
      return null;
    }
  }
  function normalizeWord(value) {
    return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  }
  function unescapeString(value) {
    return value.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\(['"\\/bfnrt])/g, (_, char) => {
      const escapes = { b: "\b", f: "\f", n: "\n", r: "\r", t: "	" };
      return escapes[char] ?? char;
    });
  }
  function readPlay(node) {
    const onclick = node.getAttribute("onclick") || "";
    if (!/^\s*Play\s*\(/.test(onclick)) return null;
    const args = [...onclick.matchAll(PLAY_ARGUMENT)].map((match) => unescapeString(match[1]));
    return {
      mp3: decodeForvoPath(args[0]),
      ogg: decodeForvoPath(args[1]),
      highMp3: decodeForvoPath(args[2]),
      highOgg: decodeForvoPath(args[3]),
      word: args[5]?.trim() || "",
      language: args[6]?.trim() || ""
    };
  }
  function readForvoRecordings(doc, host = DEFAULT_AUDIO_HOST, name = "") {
    const recordings = [];
    const seen = /* @__PURE__ */ new Set();
    const wantedWord = normalizeWord(name);
    for (const node of doc.querySelectorAll("[onclick]")) {
      const play = readPlay(node);
      if (!play) continue;
      if (wantedWord && normalizeWord(play.word) !== wantedWord) continue;
      const mp3Path = play.mp3 || play.highMp3;
      const oggPath = play.ogg || play.highOgg;
      if (!mp3Path && !oggPath) continue;
      const mp3 = mp3Path ? `https://${host}/${play.mp3 ? "mp3" : "audios/mp3"}/${mp3Path}` : null;
      const ogg = oggPath ? `https://${host}/${play.ogg ? "ogg" : "audios/ogg"}/${oggPath}` : null;
      const key = mp3 || ogg;
      if (seen.has(key)) continue;
      seen.add(key);
      recordings.push({ mp3, ogg, word: play.word, language: play.language });
      if (recordings.length === MAX_RECORDINGS) break;
    }
    return recordings;
  }
  function parseForvoPage(html, name = "") {
    const source = String(html || "");
    const doc = new DOMParser().parseFromString(source, "text/html");
    return readForvoRecordings(doc, forvoAudioHost(source), name);
  }

  // src/features/pronunciation/api.js
  var CACHE_TTL2 = 10 * 60 * 1e3;
  var MAX_ENTRIES = 20;
  var cache2 = /* @__PURE__ */ new Map();
  function remember(url, recordings) {
    cache2.delete(url);
    cache2.set(url, { expires: Date.now() + CACHE_TTL2, recordings });
    while (cache2.size > MAX_ENTRIES) cache2.delete(cache2.keys().next().value);
  }
  async function getForvoRecordings(name, { signal } = {}) {
    const url = forvoUrl(name);
    const hit = cache2.get(url);
    if (hit && hit.expires > Date.now()) return hit.recordings;
    const response = await request({
      url,
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      timeout: 15e3,
      signal
    });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text);
    }
    const recordings = parseForvoPage(response.text, name);
    remember(url, recordings);
    return recordings;
  }

  // src/features/pronunciation/styles.js
  var CSS3 = String.raw`
.ogt-pronounce__wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-inline-start: 8px;
  vertical-align: middle;
}

.ogt-pronounce {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: light-dark(#767676, #a7a7a7);
  font: inherit;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.ogt-pronounce:hover {
  text-decoration: underline;
}

.ogt-pronounce:focus-visible {
  outline: 2px solid light-dark(#333, #fff);
  outline-offset: 2px;
}

.ogt-pronounce[aria-busy="true"] {
  cursor: progress;
}

.ogt-pronounce__status {
  color: light-dark(#767676, #a7a7a7);
  font-size: 0.75rem;
}

.ogt-pronounce__status a {
  color: inherit;
  text-decoration: underline;
}

.ogt-pronounce__status a:focus-visible {
  outline: 2px solid light-dark(#333, #fff);
  outline-offset: 2px;
}
`;

  // src/features/pronunciation/index.js
  function createWidget(name) {
    let recordings = null;
    let audio = null;
    let controller = null;
    let busy = false;
    let destroyed = false;
    const status = el("span", { class: "ogt-pronounce__status", role: "status", "aria-live": "polite" });
    const button2 = el("button", {
      class: "ogt-pronounce",
      type: "button",
      text: "Pronounce",
      "aria-label": `Pronounce ${name}`
    });
    const node = el("span", { class: "ogt-pronounce__wrap" }, button2, status);
    function setButton(label) {
      button2.textContent = label;
      button2.setAttribute("aria-label", label === "Pause" ? `Pause ${name} pronunciation` : `Pronounce ${name}`);
    }
    function setStatus(message, href = null) {
      status.replaceChildren();
      if (message) status.append(document.createTextNode(message));
      if (href) {
        if (message) status.append(" ");
        status.append(el("a", { href, target: "_blank", rel: "noopener noreferrer", text: "Forvo" }));
      }
    }
    function dropAudio() {
      if (!audio) return;
      const old = audio;
      audio = null;
      old.pause();
      old.replaceChildren();
      old.remove();
    }
    async function startRecording(index) {
      dropAudio();
      const recording = recordings?.[index];
      if (!recording) {
        setStatus("Audio unavailable.", forvoUrl(name));
        return;
      }
      setStatus("");
      const element = createAudio(recording, index);
      audio = element;
      node.append(element);
      try {
        await element.play();
      } catch {
        if (!destroyed && audio === element) setStatus("Tap Pronounce to play.");
      }
    }
    function createAudio(recording, index) {
      const element = el("audio", { class: "ogt-pronounce__audio", preload: "auto", hidden: true });
      const sources = [];
      let sourceErrors = 0;
      let failed = false;
      const fail = () => {
        if (failed || destroyed || audio !== element) return;
        failed = true;
        if (index + 1 < recordings.length) {
          void startRecording(index + 1);
        } else {
          dropAudio();
          setStatus("Audio unavailable.", forvoUrl(name));
        }
      };
      const addSource = (src, type) => {
        const source = el("source", { src, type });
        source.addEventListener("error", () => {
          sourceErrors += 1;
          if (sourceErrors === sources.length) fail();
        });
        sources.push(source);
        element.append(source);
      };
      if (recording.mp3) addSource(recording.mp3, "audio/mpeg");
      if (recording.ogg) addSource(recording.ogg, "audio/ogg; codecs=vorbis");
      element.addEventListener("play", () => {
        if (!destroyed) setButton("Pause");
      });
      element.addEventListener("pause", () => {
        if (!destroyed) setButton("Pronounce");
      });
      element.addEventListener("ended", () => {
        if (!destroyed) {
          element.currentTime = 0;
          setButton("Pronounce");
        }
      });
      element.addEventListener("error", fail);
      return element;
    }
    async function play() {
      if (busy || destroyed) return;
      if (audio) {
        const element = audio;
        if (!element.paused) {
          element.pause();
          return;
        }
        try {
          element.currentTime = 0;
          await element.play();
        } catch {
          if (!destroyed && audio === element) setStatus("Tap Pronounce to play.");
        }
        return;
      }
      busy = true;
      button2.setAttribute("aria-busy", "true");
      setButton("Loading…");
      setStatus("");
      const requestController = new AbortController();
      controller = requestController;
      try {
        if (!recordings) recordings = await getForvoRecordings(name, { signal: requestController.signal });
        if (destroyed) return;
        if (!recordings.length) {
          setStatus("No pronunciation found.", forvoUrl(name));
          return;
        }
        await startRecording(0);
      } catch (error) {
        if (destroyed) return;
        debugError("Forvo lookup failed", error);
        setStatus("Forvo unavailable.", forvoUrl(name));
      } finally {
        busy = false;
        if (!destroyed) {
          button2.removeAttribute("aria-busy");
          setButton(audio && !audio.paused ? "Pause" : "Pronounce");
        }
        if (controller === requestController) controller = null;
      }
    }
    button2.addEventListener("click", play);
    return {
      node,
      destroy() {
        destroyed = true;
        controller?.abort();
        controller = null;
        dropAudio();
        node.remove();
      }
    };
  }
  var pronunciation = {
    id: "pronunciation",
    css: CSS3,
    match(route) {
      return route.name === "person";
    },
    mount() {
      const name = readPersonName(document);
      if (!name) return null;
      const heading = document.querySelector(".summary .summary-title h1");
      if (!heading) return null;
      const widget = createWidget(name);
      heading.after(widget.node);
      return widget;
    }
  };

  // src/features/your-ratings/data.js
  function mapRatings(rows) {
    const items = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const show = row.show?.ids?.trakt;
      const { season, number } = row.episode || {};
      if (!Number.isSafeInteger(show) || show <= 0 || !Number.isInteger(season) || season < 0 || !Number.isInteger(number) || number < 1 || !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 10) continue;
      items.set(`${show}:${season}:${number}`, { show, slug: row.show.ids.slug, season, number, rating: row.rating });
    }
    return [...items.values()];
  }
  function forShow(items, id) {
    const show = /^\d+$/.test(String(id)) ? Number(id) : items.find((item) => item.slug === id)?.show;
    return items.filter((item) => item.show === show);
  }
  function personalAverage(items) {
    return items.length < 2 ? null : items.reduce((sum, item) => sum + item.rating, 0) / items.length;
  }
  function averageLabel(items, total) {
    const average = personalAverage(items);
    return average == null ? "" : `Your average: ${average.toFixed(1)} (${items.length}${total == null ? "" : ` of ${total}`} episodes rated)`;
  }
  function linePath(points) {
    let previous = null;
    return points.map(({ number, x, y }) => {
      const command = previous === number - 1 ? "L" : "M";
      previous = number;
      return `${command}${x},${y}`;
    }).join("");
  }

  // src/features/your-ratings/api.js
  function createRatingsApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
    let cache3 = null;
    let flight2 = null;
    let generation3 = 0;
    function resetSession() {
      generation3++;
      cache3 = null;
      flight2 = null;
    }
    async function load() {
      if (!signedIn()) {
        resetSession();
        return [];
      }
      if (cache3 && cache3.until > now()) return cache3.items;
      if (flight2) return flight2;
      const epoch = generation3;
      const pending = (async () => {
        const rows = await auth("GET", "/sync/ratings/episodes");
        if (epoch !== generation3 || !signedIn()) throw new Error("Ratings session changed.");
        if (!Array.isArray(rows)) throw new Error("Invalid ratings response.");
        const items = mapRatings(rows);
        cache3 = { items, until: now() + 10 * 6e4 };
        return items;
      })();
      flight2 = pending;
      try {
        return await pending;
      } finally {
        if (flight2 === pending) flight2 = null;
      }
    }
    return { load, resetSession };
  }
  var ratingsApi = createRatingsApi();
  if (typeof document !== "undefined") document.addEventListener("ogt:authchange", ratingsApi.resetSession);

  // src/features/your-ratings/styles.js
  var CSS4 = String.raw`
/* Follows a season card's "13 episodes" subtitle: " · ♥ 7.5". */
.ogt-your-average { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
  color: light-dark(#075c86, #83d5ff); font-weight: 600; }
.ogt-your-average::before { content: "·"; margin-inline: 5px 2px; color: light-dark(#767676, #a7a7a7); font-weight: 400; }
.ogt-your-average svg { inline-size: 0.95em; block-size: 0.95em; fill: currentColor; }
.ogt-season-chart__legend-community { color: light-dark(#c4161c, #ff6b6b); }
.ogt-season-chart__personal { stroke: light-dark(#075c86, #83d5ff); fill: none; stroke-width: 2; }
.ogt-season-chart__personal-dot { fill: light-dark(#075c86, #83d5ff); stroke: var(--ogt-surface); stroke-width: 1; }
.ogt-season-chart__legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0; font-size: .85rem; }
.ogt-season-chart__legend-personal { color: light-dark(#075c86, #83d5ff); }
.ogt-season-chart a:focus-visible circle { stroke: light-dark(#111, #fff); stroke-width: 3; }
`;

  // src/features/your-ratings/index.js
  var HEART = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";
  function heart() {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", HEART);
    svg3.append(path);
    return svg3;
  }
  var yourRatings = {
    id: "your-ratings",
    css: CSS4,
    match: (route) => route.kind === "show" && ["title", "seasons"].includes(route.name) && isSignedIn(),
    mount(route) {
      const section = document.querySelector("section.seasons");
      if (!section || document.getElementById("ogt-your-ratings")) return null;
      const node = el("span", { id: "ogt-your-ratings", hidden: true });
      section.prepend(node);
      let cancelled = false;
      let items = [];
      const badges = /* @__PURE__ */ new Set();
      function render() {
        if (cancelled) return;
        for (const card of section.querySelectorAll("article.poster-card")) {
          if (card.querySelector(".ogt-your-average")) continue;
          const href = card.querySelector('a[href*="/seasons/"]')?.getAttribute("href");
          const match = href?.match(/\/seasons\/(\d+)\/?$/);
          if (!match) continue;
          const rows = items.filter((item) => item.season === Number(match[1]));
          const average = personalAverage(rows);
          if (average == null) continue;
          const label = averageLabel(rows);
          const badge = el(
            "span",
            { class: "ogt-your-average", title: label, "aria-label": label },
            heart(),
            el("span", { text: average.toFixed(1) })
          );
          (card.querySelector(".titles-link .subtitle") || card).append(badge);
          badges.add(badge);
        }
      }
      const observer = new MutationObserver(render);
      observer.observe(section, { childList: true, subtree: true });
      ratingsApi.load().then((rows) => {
        items = forShow(rows, route.id);
        render();
      }).catch((error) => debugError("personal ratings lookup failed", error));
      function onAuth() {
        cancelled = true;
        observer.disconnect();
        node.remove();
        for (const badge of badges) badge.remove();
      }
      document.addEventListener("ogt:authchange", onAuth);
      return { node, destroy() {
        onAuth();
        document.removeEventListener("ogt:authchange", onAuth);
      } };
    }
  };

  // src/features/season-chart/data.js
  var CHART_WIDTH = 720;
  var CHART_HEIGHT = 180;
  var PLOT = { left: 38, right: 12, top: 12, bottom: 30 };
  function episodeNumber(value) {
    const match = value.match(/x\s*(\d+)\s*$/i);
    return match ? Number(match[1]) : null;
  }
  function percent2(value) {
    const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  }
  function sortEpisodes(episodes) {
    return episodes.sort((a, b) => a.number - b.number);
  }
  function readSeasonEpisodes(doc) {
    const episodes = [];
    for (const row of doc.querySelectorAll("section.episodes article.row")) {
      const heading = row.querySelector(".titles h3");
      const number = episodeNumber(text(heading?.querySelector(".number")));
      const links = heading?.querySelectorAll("a") || [];
      const titleLink = links[links.length - 1];
      if (number == null || !titleLink) continue;
      episodes.push({
        number,
        title: text(titleLink),
        rating: percent2(text(row.querySelector(".rating-trigger .value"))),
        votes: null,
        href: titleLink.getAttribute("href")
      });
    }
    return sortEpisodes(episodes);
  }
  function mapApiEpisodes(episodes, { showId, season, fallback = [] }) {
    const fallbackByNumber = new Map(fallback.map((item) => [item.number, item]));
    const mapped = [];
    for (const episode of Array.isArray(episodes) ? episodes : []) {
      const number = Number(episode.number);
      if (!Number.isInteger(number)) continue;
      const rendered = fallbackByNumber.get(number);
      const rating = episode.rating == null ? null : Number(episode.rating) * 10;
      const href = rendered?.href || `/shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(season)}/episodes/${number}`;
      mapped.push({
        number,
        title: episode.title || rendered?.title || "",
        rating: Number.isFinite(rating) ? rating : null,
        votes: episode.votes == null ? null : Number(episode.votes),
        href
      });
    }
    return sortEpisodes(mapped);
  }
  function ratedEpisodes(episodes) {
    return episodes.filter((episode) => Number.isFinite(episode.rating) && episode.rating > 0).sort((a, b) => a.number - b.number);
  }
  function averageRating(episodes) {
    const included = ratedEpisodes(episodes).filter((episode) => episode.votes == null || episode.votes >= 10);
    if (!included.length) return null;
    if (included.every((episode) => Number.isFinite(episode.votes))) {
      const votes = included.reduce((sum, episode) => sum + episode.votes, 0);
      if (votes) {
        return included.reduce((sum, episode) => sum + episode.rating * episode.votes, 0) / votes;
      }
    }
    return included.reduce((sum, episode) => sum + episode.rating, 0) / included.length;
  }
  function axisBottom(episodes) {
    const rated = ratedEpisodes(episodes);
    if (!rated.length) return 50;
    const lowest = Math.min(...rated.map((episode) => episode.rating));
    return Math.min(50, Math.floor(lowest / 10) * 10);
  }
  function chartGeometry(episodes, allEpisodes = episodes, average = averageRating(episodes), width = CHART_WIDTH, scaleEpisodes = episodes) {
    const rated = ratedEpisodes(episodes);
    const allNumbers = allEpisodes.map((episode) => episode.number).filter(Number.isFinite);
    const first = allNumbers.length ? Math.min(...allNumbers) : 1;
    const last = allNumbers.length ? Math.max(...allNumbers) : first;
    const bottom = axisBottom(scaleEpisodes);
    const plotWidth = width - PLOT.left - PLOT.right;
    const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
    const slot = plotWidth / (last - first + 1);
    const x = (number) => PLOT.left + (number - first + 0.5) * slot;
    const y = (rating) => PLOT.top + (100 - rating) / (100 - bottom) * plotHeight;
    return {
      width,
      height: CHART_HEIGHT,
      plot: { ...PLOT },
      axisBottom: bottom,
      slot,
      baseY: y(bottom),
      ticks: Array.from({ length: (100 - bottom) / 10 + 1 }, (_, i) => bottom + i * 10),
      points: rated.map((episode) => ({ episode, x: x(episode.number), y: y(episode.rating) })),
      averageY: average == null ? null : y(average)
    };
  }
  function ratingLevel(percent3) {
    return Math.min(Math.max(Math.trunc(percent3 / 10), 1), 10);
  }
  function barPath(x, top, width, base, radius = 4) {
    const r = Math.max(0, Math.min(radius, width / 2, base - top));
    const left = x - width / 2;
    const right = x + width / 2;
    return `M${left},${base}V${top + r}Q${left},${top} ${left + r},${top}H${right - r}Q${right},${top} ${right},${top + r}V${base}Z`;
  }

  // src/features/season-chart/personal.js
  var NS2 = "http://www.w3.org/2000/svg";
  function svg(tag, attributes, text2) {
    const node = document.createElementNS(NS2, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text2) node.textContent = text2;
    return node;
  }
  function drawPersonal(chart, episodes, geometry, personal) {
    const { plot, height, slot, axisBottom: axisBottom2 } = geometry;
    const first = Math.min(...episodes.map((episode) => episode.number));
    const x = (number) => plot.left + (number - first + 0.5) * slot;
    const y = (rating) => plot.top + (100 - rating) / (100 - axisBottom2) * (height - plot.top - plot.bottom);
    const points = episodes.filter((episode) => personal.some((rating) => rating.number === episode.number)).map((episode) => ({
      ...episode,
      x: x(episode.number),
      y: y(personal.find((rating) => rating.number === episode.number).rating * 10)
    }));
    chart.append(svg("path", { class: "ogt-season-chart__personal", d: linePath(points) }));
    for (const point of points) {
      const rating = personal.find((entry) => entry.number === point.number).rating;
      const label = `Your rating, Episode ${point.number}: ${rating} of 10`;
      const link = svg("a", { href: point.href, tabindex: "0", "aria-label": label });
      link.append(
        svg("title", {}, label),
        svg("circle", { class: "ogt-season-chart__personal-dot", cx: point.x, cy: point.y, r: 4 })
      );
      chart.append(link);
    }
  }

  // src/features/season-chart/api.js
  async function getSeasonEpisodes(id, season) {
    const episodes = await apiGet(
      `/shows/${encodeURIComponent(id)}/seasons/${encodeURIComponent(season)}?extended=full`
    );
    return Array.isArray(episodes) ? episodes : [];
  }

  // src/features/season-chart/styles.js
  var CSS5 = String.raw`
.ogt-season-chart__summary {
  margin: 0 0 8px;
  color: var(--ogt-fg);
}

.ogt-season-chart__svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
  overflow: visible;
}

.ogt-season-chart__gridline {
  stroke: light-dark(#dedede, #484848);
  stroke-width: 1;
}

.ogt-season-chart__axis,
.ogt-season-chart__episode-number {
  fill: light-dark(#767676, #a7a7a7);
  font: 11px system-ui, sans-serif;
}

.ogt-season-chart__episode-number {
  text-anchor: middle;
}

.ogt-season-chart__average {
  stroke: light-dark(#767676, #a7a7a7);
  stroke-dasharray: 5 4;
  stroke-width: 1.5;
}

.ogt-season-chart__bar {
  fill: var(--ogt-bar);
}

.ogt-season-chart__bar--low-votes {
  fill: var(--ogt-surface);
  stroke: var(--ogt-bar);
  stroke-width: 2;
}

.ogt-season-chart__target {
  fill: transparent;
}

.ogt-season-chart a:hover .ogt-season-chart__bar {
  filter: brightness(1.25);
}

.ogt-season-chart__value {
  fill: var(--ogt-fg);
  font: 600 11px system-ui, sans-serif;
  text-anchor: middle;
  /* A halo in the panel colour keeps the label readable over the average line. */
  paint-order: stroke;
  stroke: var(--ogt-surface);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.ogt-season-chart a:focus-visible {
  outline: none;
}

.ogt-season-chart a:focus-visible .ogt-season-chart__bar {
  stroke: light-dark(#111111, #ffffff);
  stroke-width: 2;
}
`;

  // src/features/season-chart/index.js
  var PANEL_ID2 = "ogt-season-chart";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var DEFAULT_WIDTH = 720;
  var MIN_WIDTH = 320;
  var MAX_BAR = 24;
  function svg2(tag, attributes = {}, content = "") {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (content) node.textContent = content;
    return node;
  }
  function formatPercent(value) {
    return `${Number(value.toFixed(1))}%`;
  }
  function episodeName(episode) {
    return `Episode ${episode.number}: ${episode.title}, ${formatPercent(episode.rating)}`;
  }
  function voteLabel(votes) {
    return votes == null ? "votes unknown" : `${new Intl.NumberFormat("en-US").format(votes)} votes`;
  }
  function summary(episodes, average) {
    const rated = ratedEpisodes(episodes);
    if (!rated.length) return `Season average: ${average == null ? "—" : formatPercent(average)}`;
    const best = rated.reduce((current, episode) => episode.rating > current.rating ? episode : current);
    const worst = rated.reduce((current, episode) => episode.rating < current.rating ? episode : current);
    const averageText = average == null ? "—" : formatPercent(average);
    return `Season average: ${averageText} · Best: ${episodeName(best)} · Worst: ${episodeName(worst)}`;
  }
  function drawChart(chart, episodes, average, targetWidth, personal = []) {
    const scale = [...episodes, ...personal.map((p) => ({ ...p, rating: p.rating * 10 }))];
    const geometry = chartGeometry(episodes, episodes, average, targetWidth, scale);
    const { width, height, plot, ticks, points, averageY } = geometry;
    chart.replaceChildren();
    chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    for (const tick of ticks) {
      const y = plot.top + (100 - tick) / (100 - geometry.axisBottom) * (height - plot.top - plot.bottom);
      chart.append(
        svg2("line", {
          class: "ogt-season-chart__gridline",
          x1: plot.left,
          x2: width - plot.right,
          y1: y,
          y2: y
        }),
        svg2("text", { class: "ogt-season-chart__axis", x: plot.left - 7, y: y + 4, "text-anchor": "end" }, `${tick}%`)
      );
    }
    const barWidth = Math.min(MAX_BAR, geometry.slot * 0.6);
    const rated = points.map(({ episode }) => episode.rating);
    const best = Math.max(...rated);
    const worst = Math.min(...rated);
    let bestLabelled = false;
    let worstLabelled = false;
    const values = [];
    for (const { episode, x, y } of points) {
      const label = `${episodeName(episode)}, ${voteLabel(episode.votes)}`;
      const lowVotes = episode.votes != null && episode.votes < 10;
      const link = svg2("a", { href: episode.href || "#", tabindex: "0", "aria-label": label });
      const bar = svg2("path", {
        class: `ogt-season-chart__bar${lowVotes ? " ogt-season-chart__bar--low-votes" : ""}`,
        d: barPath(x, y, barWidth, geometry.baseY),
        style: `--ogt-bar: var(--rating-${ratingLevel(episode.rating)}, var(--brand-primary, #ed1c24))`
      });
      const target = svg2("rect", {
        class: "ogt-season-chart__target",
        x: x - geometry.slot / 2,
        y: plot.top,
        width: geometry.slot,
        height: geometry.baseY - plot.top
      });
      link.append(svg2("title", {}, label), target, bar);
      chart.append(link, svg2("text", { class: "ogt-season-chart__episode-number", x, y: height - 7 }, String(episode.number)));
      const isBest = episode.rating === best && !bestLabelled && best !== worst;
      const isWorst = episode.rating === worst && !worstLabelled && best !== worst;
      if (isBest || isWorst) {
        if (isBest) bestLabelled = true;
        else worstLabelled = true;
        values.push(svg2("text", { class: "ogt-season-chart__value", x, y: y - 6 }, formatPercent(episode.rating)));
      }
    }
    if (averageY != null) {
      chart.append(
        svg2("line", {
          class: "ogt-season-chart__average",
          x1: plot.left,
          x2: width - plot.right,
          y1: averageY,
          y2: averageY
        })
      );
    }
    chart.append(...values);
    drawPersonal(chart, episodes, geometry, personal);
  }
  function createPanel3(episodes, route) {
    let personal = [];
    let authRevision = 0;
    let cancelled = false;
    let currentEpisodes = episodes;
    const headingId = `${PANEL_ID2}-title`;
    const summaryLine = el("p", { class: "ogt-season-chart__summary" });
    const chart = svg2("svg", {
      class: "ogt-season-chart__svg",
      role: "group",
      "aria-label": "Episode ratings by episode number"
    });
    const plot = el("div", { class: "ogt-season-chart__plot" }, chart);
    const node = el(
      "section",
      { class: "ogt-panel ogt-season-chart", id: PANEL_ID2, "aria-labelledby": headingId },
      el("div", { class: "ogt-head" }, el("h2", { class: "ogt-title", id: headingId, text: "Episode ratings" })),
      summaryLine,
      plot
    );
    const legend = el("div", { class: "ogt-season-chart__legend", hidden: true });
    node.append(legend);
    async function loadPersonal() {
      const revision = ++authRevision;
      personal = [];
      render(currentEpisodes);
      if (!isSignedIn()) return;
      try {
        const rows = await ratingsApi.load();
        if (cancelled || revision !== authRevision) return;
        personal = forShow(rows, route.id).filter((item) => item.season === route.season);
        render(currentEpisodes);
      } catch (error) {
        if (!cancelled) debugError("personal season ratings failed", error);
      }
    }
    document.addEventListener("ogt:authchange", loadPersonal);
    function render(nextEpisodes) {
      if (cancelled) return;
      currentEpisodes = nextEpisodes;
      const rated = ratedEpisodes(currentEpisodes);
      const average = averageRating(currentEpisodes);
      node.hidden = rated.length < 2 && personal.length < 2;
      const visiblePersonal = personal.filter((p) => currentEpisodes.some((e) => e.number === p.number));
      summaryLine.textContent = [summary(currentEpisodes, average), averageLabel(visiblePersonal, currentEpisodes.length)].filter(Boolean).join(" · ");
      legend.replaceChildren(el("span", { class: "ogt-season-chart__legend-community", text: "Trakt community (bars)" }));
      if (visiblePersonal.length) legend.append(el("span", { class: "ogt-season-chart__legend-personal", text: "Your ratings (blue line)" }));
      legend.hidden = !visiblePersonal.length;
      drawChart(chart, currentEpisodes, average, chartWidth(), visiblePersonal);
    }
    let drawnWidth = 0;
    function chartWidth() {
      drawnWidth = Math.max(MIN_WIDTH, Math.round(plot.getBoundingClientRect().width) || DEFAULT_WIDTH);
      return drawnWidth;
    }
    const resize2 = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (cancelled || node.hidden) return;
      if (Math.abs(Math.round(plot.getBoundingClientRect().width) - drawnWidth) > 1) render(currentEpisodes);
    }) : null;
    resize2?.observe(plot);
    render(currentEpisodes);
    loadPersonal();
    return {
      node,
      render,
      destroy() {
        cancelled = true;
        resize2?.disconnect();
        authRevision++;
        document.removeEventListener("ogt:authchange", loadPersonal);
        node.remove();
      }
    };
  }
  var seasonChart = {
    id: "season-chart",
    css: CSS5,
    match(route) {
      return route.kind === "show" && route.name === "season";
    },
    mount(route) {
      if (document.getElementById(PANEL_ID2)) return null;
      const episodesSection = document.querySelector("section.episodes");
      if (!episodesSection) return null;
      const fallback = readSeasonEpisodes(document);
      const panel = createPanel3(fallback, route);
      episodesSection.parentElement.insertBefore(panel.node, episodesSection);
      if (getClientId()) {
        getSeasonEpisodes(route.id, route.season).then((episodes) => {
          if (episodes.length) {
            panel.render(mapApiEpisodes(episodes, {
              showId: route.id,
              season: route.season,
              fallback
            }));
          }
        }).catch((error) => {
          if (!panel.node.isConnected) return;
          debugError("season episode lookup failed", error);
        });
      }
      return {
        node: panel.node,
        destroy() {
          panel.destroy();
        }
      };
    }
  };

  // src/features/month-review/data.js
  function lastMonth(now = /* @__PURE__ */ new Date()) {
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const start2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      start: start2.toISOString(),
      end: end.toISOString(),
      year: start2.getFullYear(),
      month: start2.getMonth() + 1,
      key: `${start2.getFullYear()}-${String(start2.getMonth() + 1).padStart(2, "0")}`,
      // og is English-only; match it whatever the browser language.
      label: start2.toLocaleString("en-US", { month: "long" })
    };
  }
  function inMonth(value, span) {
    const time = Date.parse(value);
    return time >= Date.parse(span.start) && time < Date.parse(span.end);
  }
  function summarize(history2, ratings, comments, span) {
    const plays = history2.filter((row) => inMonth(row.watched_at, span));
    const first = plays.reduce((a, b) => !a || Date.parse(b.watched_at) < Date.parse(a.watched_at) ? b : a, null);
    const minutes = plays.reduce((sum, row) => {
      const runtime = (row.episode || row.movie)?.runtime;
      return sum + (Number.isFinite(runtime) && runtime > 0 ? runtime : 0);
    }, 0);
    return {
      plays: plays.length,
      hours: Math.round(minutes / 60),
      ratings: ratings.filter((row) => inMonth(row.rated_at, span)).length,
      comments: comments.filter((row) => inMonth(row.comment?.created_at ?? row.created_at, span)).length,
      first
    };
  }
  function fanart(first) {
    const raw = (first?.show || first?.movie)?.images?.fanart?.[0];
    if (typeof raw !== "string") return null;
    try {
      const url = new URL(raw.startsWith("https://") ? raw : `https://${raw}`);
      if (url.protocol !== "https:" || url.hostname !== "media.trakt.tv") return null;
      url.pathname = url.pathname.replace("/fanarts/medium/", "/fanarts/full/");
      return url.href;
    } catch {
      return null;
    }
  }
  function freshCache(entry, now) {
    return entry && (now.getDate() > 7 || now.getTime() - entry.savedAt < 864e5);
  }

  // src/features/month-review/api.js
  async function paginate(pageRequest, path, options = {}) {
    const rows = [];
    for (let page = 1; ; page++) {
      const result = await pageRequest(path, { ...options, page, limit: 100 });
      if (!Array.isArray(result.data)) throw new Error("Invalid review response.");
      rows.push(...result.data);
      if (result.pages !== null ? page >= result.pages : result.data.length < 100) return rows;
      if (page >= 1e4) throw new Error("Review pagination limit reached.");
    }
  }
  var generation2 = 0;
  var flight;
  if (typeof document !== "undefined") document.addEventListener("ogt:authchange", () => {
    generation2++;
    flight = null;
  });
  function loadReview(now = /* @__PURE__ */ new Date()) {
    if (flight) return flight;
    const epoch = generation2;
    const alive = () => {
      if (generation2 !== epoch || !isSignedIn()) throw new Error("Review session changed.");
    };
    const task = (async () => {
      const profile = await apiAuth("GET", "/users/me");
      alive();
      const user = profile?.ids?.slug || profile?.username;
      if (!user) throw new Error("Missing review user.");
      const span = lastMonth(now);
      if (getPrivateValue(STORAGE.dismissedReview(user)) === span.key) return null;
      const key = STORAGE.monthReview(user, span.key);
      const cached = getPrivateValue(key);
      if (freshCache(cached, now)) return { ...cached.summary, user, span };
      const history2 = await paginate(apiAuthPage, "/sync/history", { start_at: span.start, end_at: span.end, extended: "full,images" });
      alive();
      let summary2 = { plays: 0 };
      if (history2.some((row) => Date.parse(row.watched_at) >= Date.parse(span.start) && Date.parse(row.watched_at) < Date.parse(span.end))) {
        const [ratings, comments] = await Promise.all([
          apiAuth("GET", "/sync/ratings"),
          paginate(apiAuthPage, "/users/me/comments")
        ]);
        if (!Array.isArray(ratings)) throw new Error("Invalid review response.");
        alive();
        summary2 = summarize(history2, ratings, comments, span);
      }
      setPrivateValue(key, { savedAt: now.getTime(), summary: summary2 });
      return { ...summary2, user, span };
    })();
    flight = task;
    task.finally(() => {
      if (flight === task) flight = null;
    }).catch(() => {
    });
    return task;
  }

  // src/features/month-review/styles.js
  var CSS6 = `
.ogt-review { position:relative; isolation:isolate; color:white; background:#181012; font-family:var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif); overflow:hidden; }
.ogt-review[hidden] { display:none; }
.ogt-review__art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
.ogt-review::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(10,8,10,.92),rgba(10,8,10,.45)); z-index:-1; }
/* Match og's Container so review content lines up with the month ribbon and Up Next. */
.ogt-review__inner { margin-inline:auto; padding-block:32px; padding-inline:calc(var(--gutter,20px) / 2); box-sizing:border-box; }
@media(min-width:768px) { .ogt-review__inner { inline-size:var(--container-sm,740px); } }
@media(min-width:992px) { .ogt-review__inner { inline-size:var(--container-md,960px); } }
@media(min-width:1200px) { .ogt-review__inner { inline-size:var(--container-lg,1160px); } }
.ogt-review h2 { font-size:clamp(32px,4vw,48px); font-family:var(--font-headings, inherit); font-weight:700; letter-spacing:-.025em; line-height:1.1; margin:0 0 28px; color:white; }
.ogt-review em { color:var(--brand-primary,#ed1c24); font-style:normal; }
.ogt-review__grid { display:grid; /* The first-play box hugs its title, like classic's, up to 480px. */ grid-template-columns:144px 144px fit-content(480px); gap:10px; }
.ogt-review__tile,.ogt-review__first { background:rgba(120,24,30,.38); border-radius:var(--radius-dashboard-panel,var(--radius-container,12px)); padding:10px 12px; }
.ogt-review__tile { display:grid; grid-template-columns:36px minmax(0,1fr); align-items:center; column-gap:10px; min-width:0; min-height:64px; box-sizing:border-box; }
.ogt-review__icon { width:36px; height:36px; display:block; align-self:center; }
.ogt-review__value { min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.ogt-review__tile strong { font-family:var(--font-headings, inherit); font-weight:700; font-size:28px; line-height:1; letter-spacing:-.025em; display:block; }
.ogt-review__tile span { display:block; text-transform:uppercase; font-size:11px; line-height:1; color:#ddd; }
.ogt-review__first small { display:block; text-transform:uppercase; font-size:14px; font-weight:400; line-height:1.15; color:#ddd; }
.ogt-review__first small span { display:block; color:white; font-weight:400; }
.ogt-review__episode { display:block; margin-top:4px; font-size:16px; font-weight:400; line-height:1.25; }
.ogt-review__first { grid-column:3; grid-row:1 / 3; min-width:180px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; gap:24px; padding:12px; }
.ogt-review__title { font-family:var(--font-headings, inherit); font-size:30px; font-weight:700; letter-spacing:-.025em; line-height:1.1; display:block; }
.ogt-review__first b { font-family:inherit; font-size:inherit; font-weight:700; }
.ogt-review__link { font-size:15px; display:inline-block; margin-top:26px; padding:10px 14px; background:var(--brand-primary,#ed1c24); text-decoration:none; color:white!important; border-radius:var(--radius-action-button,var(--radius-object,8px)); font-weight:bold; }
.ogt-review__link:hover { background:var(--brand-primary-darken,#c61017); }
.ogt-review__link:focus-visible,.ogt-review__hide:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__hide { position:absolute; right:12px; top:8px; border:0; background:transparent; color:white; font:inherit; font-size:14px; cursor:pointer; }
.ogt-review-hint { padding:12px 24px; color:light-dark(#555,#bbb); }
@media(max-width:600px) { .ogt-review__grid { grid-template-columns:1fr 1fr; } .ogt-review__first { grid-column:1 / 3; grid-row:3; } }
`;

  // src/features/month-review/index.js
  function tileIcon(kind) {
    const paths = {
      plays: ["M7 3 22 12 7 21Z"],
      hours: ["M10 2h4M12 5v2M19 6l2-2", "M12 8v5l3 2", "M21 14a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
      ratings: ["M8 10 12 3c1-2 3-1 3 1v5h5c2 0 2 2 2 3l-2 7c0 1-1 2-3 2H8Z", "M3 10h5v11H3Z"],
      comments: ["M22 11c0 5-4 8-10 8H8l-6 4 2-7a8 8 0 0 1-2-5c0-5 4-9 10-9s10 4 10 9Z"]
    };
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, value] of Object.entries({
      viewBox: "0 0 24 24",
      class: "ogt-review__icon",
      "aria-hidden": "true",
      focusable: "false",
      fill: ["ratings", "comments"].includes(kind) ? "currentColor" : "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    })) svg3.setAttribute(key, value);
    for (const d of paths[kind]) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg3.append(path);
    }
    return svg3;
  }
  var monthReview = {
    id: "month-review",
    css: CSS6,
    match: (route) => route.name === "dashboard" && isSignedIn(),
    mount() {
      const anchor = document.querySelector("nav.ribbon");
      if (!anchor) return null;
      let destroyed = false;
      const node = el("section", { class: "ogt-review", id: "ogt-month-review", hidden: true, "aria-label": "Last month in review" });
      anchor.after(node);
      const hide = () => {
        if (review) setPrivateValue(STORAGE.dismissedReview(review.user), review.span.key);
        node.hidden = true;
      };
      let review;
      loadReview().then((data) => {
        if (destroyed || !isSignedIn() || !data?.plays) return;
        review = data;
        const { span, first } = data;
        const media = first.show || first.movie;
        const art = fanart(first);
        const grid = el("div", { class: "ogt-review__grid" });
        for (const key of ["plays", "hours", "ratings", "comments"]) grid.append(el(
          "div",
          { class: "ogt-review__tile" },
          tileIcon(key),
          el(
            "div",
            { class: "ogt-review__value" },
            el("strong", { text: data[key].toLocaleString() }),
            el("span", { text: key })
          )
        ));
        grid.append(el(
          "div",
          { class: "ogt-review__first" },
          el("small", {}, "First play", el("span", {}, "of ", el("b", { text: span.label }))),
          el(
            "div",
            {},
            el("strong", { class: "ogt-review__title", text: media?.title || "Untitled" }),
            first.episode ? el(
              "span",
              { class: "ogt-review__episode" },
              el("b", { text: `${first.episode.season}x${String(first.episode.number).padStart(2, "0")}` }),
              ` “${first.episode.title || "Untitled episode"}”`
            ) : null
          )
        ));
        const image = art ? el("img", { class: "ogt-review__art", src: art, alt: "", referrerpolicy: "no-referrer" }) : null;
        image?.addEventListener("error", () => image.remove(), { once: true });
        node.append(
          ...image ? [image] : [],
          el("button", { type: "button", class: "ogt-review__hide", text: "× Hide", on: { click: hide } }),
          el(
            "div",
            { class: "ogt-review__inner" },
            el("h2", {}, "your ", el("em", { text: span.label.toLocaleLowerCase() }), " in review"),
            grid,
            el("a", { class: "ogt-review__link", text: "Month in Review →", href: `https://app.trakt.tv/users/${encodeURIComponent(data.user)}/mir/${span.year}/${span.month}`, target: "_blank", rel: "noopener noreferrer" })
          )
        );
        node.hidden = false;
      }).catch((error) => {
        if (destroyed || !isSignedIn()) return;
        debugError("month review failed", error);
        node.className = "ogt-review-hint";
        node.textContent = "Could not load last month’s review; try again later.";
        node.hidden = false;
      });
      return { node, destroy() {
        destroyed = true;
        node.querySelector("button")?.removeEventListener("click", hide);
        node.remove();
      } };
    }
  };

  // src/ui/native-modules.js
  var earlyResources = [];
  function rememberNativeResources(names) {
    earlyResources = [...names];
  }
  var chunkUrl = (value, base) => {
    try {
      const url = new URL(value, base);
      return url.origin === new URL(base).origin && /^\/_app\/immutable\/chunks\/[\w.-]+\.js$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
    } catch {
      return null;
    }
  };
  function nativeRootImports(source, layoutUrl, loaded, uses) {
    const result = [];
    for (const match of source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
      const url = chunkUrl(match[2], layoutUrl);
      if (!url || !loaded.includes(url)) continue;
      for (const spec of match[1].split(",")) {
        const alias = spec.trim().split(/\s+as\s+/).at(-1);
        if (/^[\w$]+$/.test(alias) && uses(alias)) result.push(url);
      }
    }
    return [...new Set(result)];
  }
  async function discoverNativeModule(imports, validate) {
    const names = [.../* @__PURE__ */ new Set([...earlyResources, ...(performance.getEntriesByType?.("resource") ?? []).map((entry) => entry.name)])];
    const layout = names.find((name) => {
      try {
        const url = new URL(name);
        return url.origin === location.origin && /^\/_app\/immutable\/nodes\/0\.[\w-]+\.js$/.test(url.pathname);
      } catch {
        return false;
      }
    });
    if (!layout) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2e3);
    const read = async (url) => {
      const response = await fetch(url, { cache: "force-cache", credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("Native module unavailable.");
      return response.text();
    };
    try {
      const source = await read(layout);
      for (const url of imports(source, layout, names)) if (validate(await read(url))) return url;
    } catch (error) {
      debugError("native module discovery failed", error);
    } finally {
      clearTimeout(timer);
    }
    return null;
  }

  // src/ui/native-toast.js
  var discovery;
  function nativeToastImports(source, layoutUrl, loaded) {
    return nativeRootImports(source, layoutUrl, loaded, (alias) => source.includes(`${alias}.dismiss(`) && source.includes(`${alias}.list`));
  }
  function isNativeToastStore(source) {
    return source.length < 16e3 && /\bget\s+list\s*\(/.test(source) && /\bsuccess\s*:/.test(source) && /\berror\s*:/.test(source) && /\bdismiss\s*:/.test(source);
  }
  async function discover() {
    return document.querySelector(".toaster") ? discoverNativeModule(nativeToastImports, isNativeToastStore) : null;
  }
  async function tryNativeToast(message, active2 = () => true) {
    if (!active2()) return false;
    const url = await (discovery ??= discover());
    if (!url || !active2() || !document.querySelector(".toaster")) return false;
    return new Promise((resolve) => {
      const eventName = `ogt:watchlist-toast:${crypto.randomUUID()}`;
      const script = document.createElement("script");
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        document.removeEventListener(eventName, answered);
        script.remove();
        resolve(ok);
      };
      const answered = (event) => finish(event.detail === "shown");
      const timer = setTimeout(() => finish(false), 1e3);
      document.addEventListener(eventName, answered);
      script.type = "module";
      script.onerror = () => finish(false);
      script.textContent = `(async () => {
      let result = 'unavailable';
      try {
        const module = await import(${JSON.stringify(url)});
        const store = Object.values(module).find(value => value && typeof value.success === 'function' &&
          typeof value.dismiss === 'function' && Array.isArray(value.list));
        if (store && document.querySelector('.toaster')) { store.success(${JSON.stringify(message).replace(/</g, "\\u003c")}); result = 'shown'; }
      } catch {}
      document.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)}, { detail: result }));
    })();`;
      document.head.append(script);
    });
  }

  // src/ui/success-notification.js
  var root;
  var observed;
  var resize;
  var notices = [];
  function icon(path, circle = false) {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("aria-hidden", "true");
    if (circle) {
      const node2 = document.createElementNS(svg3.namespaceURI, "circle");
      node2.setAttribute("cx", "12");
      node2.setAttribute("cy", "12");
      node2.setAttribute("r", "11");
      node2.setAttribute("fill", "currentColor");
      svg3.append(node2);
    }
    const node = document.createElementNS(svg3.namespaceURI, "path");
    for (const [key, value] of Object.entries({ d: path, fill: "none", stroke: circle ? "#163516" : "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })) node.setAttribute(key, value);
    svg3.append(node);
    return svg3;
  }
  function showSuccessToast(message = "You added this title to your watchlist.", { onUndo, active: active2 = () => true } = {}) {
    if (!root?.isConnected) {
      resize?.disconnect();
      root = el("div", { class: "ogt-toast ogt-watchlist-toasts" });
      document.body.append(root);
    }
    const native = document.querySelector(".toaster");
    const position = () => root?.style.setProperty("--ogt-native-toast-height", `${native?.isConnected && native.children.length ? native.getBoundingClientRect().height + 8 : 0}px`);
    if (native !== observed) {
      resize?.disconnect();
      observed = native;
      if (native && typeof ResizeObserver === "function") {
        resize = new ResizeObserver(position);
        resize.observe(native);
      }
    }
    position();
    const close = el("button", { type: "button", class: "ogt-watchlist-toast__close", "aria-label": "Close" }, icon("M6 6l12 12M18 6 6 18"));
    const line = el("span", { class: "ogt-watchlist-toast__timer", "aria-hidden": "true" });
    const actions = el("div", { class: "ogt-watchlist-toast__actions" });
    const undo = typeof onUndo === "function" ? el("button", { type: "button", class: "ogt-watchlist-toast__undo", text: "Undo" }) : null;
    if (undo) actions.append(undo);
    actions.append(close);
    const error = el("p", { class: "ogt-watchlist-toast__error", "aria-live": "polite" });
    const node = el(
      "div",
      { class: "ogt-watchlist-toast", role: "status", "aria-atomic": "true" },
      el("span", { class: "ogt-watchlist-toast__icon" }, icon("m7 12 3 3 7-7", true)),
      el("p", { class: "ogt-watchlist-toast__message", text: message }),
      actions,
      error,
      line
    );
    root.prepend(node);
    let timer, animation, fraction = 1, started, duration, removed = false, undoing = false;
    const holds = /* @__PURE__ */ new Set();
    const remove = () => {
      if (removed) return;
      removed = true;
      clearTimeout(timer);
      animation?.cancel();
      node.remove();
      const index = notices.indexOf(remove);
      if (index >= 0) notices.splice(index, 1);
      if (!notices.length) {
        resize?.disconnect();
        observed = null;
        root?.remove();
        root = null;
      }
    };
    const start2 = (ms) => {
      duration = ms;
      started = Date.now();
      animation?.cancel();
      animation = line.animate?.([{ transform: `scaleX(${fraction})` }, { transform: "scaleX(0)" }], { duration: ms, fill: "forwards" });
      animation?.finished?.catch(() => {
      });
      timer = setTimeout(remove, ms);
    };
    const hold = (kind) => {
      if (holds.has(kind)) return;
      if (!holds.size) {
        fraction *= Math.max(0, 1 - (Date.now() - started) / duration);
        clearTimeout(timer);
        animation?.pause();
      }
      holds.add(kind);
    };
    const release2 = (kind) => {
      if (holds.delete(kind) && !holds.size) start2(1e3);
    };
    const runUndo = async () => {
      if (!undo || undoing || removed) return;
      if (!active2()) {
        undo.remove();
        error.textContent = "Undo is only available on the page you saved from.";
        return;
      }
      undoing = true;
      hold("undo");
      undo.disabled = true;
      undo.textContent = "Undoing…";
      error.textContent = "";
      try {
        if (await onUndo() === false) throw new Error("Undo was not confirmed.");
        remove();
      } catch (undoError) {
        debugError("success notice undo failed", undoError);
        if (removed) return;
        error.textContent = "Could not undo. Try again.";
        undoing = false;
        undo.disabled = false;
        undo.textContent = "Undo";
        release2("undo");
      }
    };
    close.addEventListener("click", remove);
    undo?.addEventListener("click", runUndo);
    node.addEventListener("pointerenter", () => hold("pointer"));
    node.addEventListener("pointerleave", () => release2("pointer"));
    node.addEventListener("focusin", () => hold("focus"));
    node.addEventListener("focusout", (event) => {
      if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) release2("focus");
    });
    notices.unshift(remove);
    while (notices.length > 3) notices.at(-1)();
    start2(5e3);
    return { node, destroy: remove };
  }
  async function notifySuccess(message, active2 = () => true, { undo } = {}) {
    if (typeof undo === "function") {
      if (!active2()) return { native: false, handle: null };
      return { native: false, handle: showSuccessToast(message, { onUndo: undo, active: active2 }) };
    }
    try {
      if (await tryNativeToast(message, active2)) return { native: true };
    } catch (error) {
      debugError("native success toast unavailable", error);
    }
    if (!active2()) return { native: false, handle: null };
    return { native: false, handle: showSuccessToast(message) };
  }

  // src/features/all-lists/data.js
  function posterUrl2(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value.startsWith("https://") ? value : `https://${value}`);
      return url.protocol === "https:" && url.hostname === "media.trakt.tv" ? url.href : null;
    } catch {
      return null;
    }
  }
  function count(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  function ownerName(user) {
    return typeof user?.name === "string" && user.name.trim() ? user.name.trim() : user?.ids?.slug || user?.username || null;
  }
  function vipBadge(user) {
    if (user?.director === true) return { label: "Director", tag: null };
    if (user?.vip !== true) return null;
    return { label: "VIP", tag: user.vip_og === true ? "OG" : user.vip_ep === true ? "EP" : null };
  }
  function normalizeList(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const id = count(raw.ids?.trakt);
    const slug = typeof raw.ids?.slug === "string" ? raw.ids.slug : "";
    const ownerSlug = raw.user?.ids?.slug || raw.user?.username;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!id || !slug || typeof ownerSlug !== "string" || !ownerSlug || !name) return null;
    const images = Array.isArray(raw.images?.posters) ? raw.images.posters : [];
    return {
      id,
      slug,
      name,
      description: typeof raw.description === "string" ? raw.description.trim() : "",
      owner: { slug: ownerSlug, name: ownerName(raw.user), avatar: posterUrl2(raw.user?.images?.avatar?.full), vip: vipBadge(raw.user) },
      itemCount: count(raw.item_count),
      commentCount: raw.allow_comments === true ? count(raw.comment_count) : null,
      likes: count(raw.likes),
      allowComments: raw.allow_comments === true,
      privacy: typeof raw.privacy === "string" ? raw.privacy : null,
      kind: raw.type === "official" ? "official" : "personal",
      // OG fetches up to five posters from each list summary for its fan row.
      posters: images.slice(0, 5).map(posterUrl2).filter(Boolean)
    };
  }
  function collaborationLists(payload) {
    if (!Array.isArray(payload)) return [];
    return payload.map(normalizeList).filter(Boolean);
  }
  function likedLists(payload) {
    if (!Array.isArray(payload)) return [];
    return payload.map((entry) => normalizeList(entry?.list)).filter(Boolean);
  }
  function listHref(list) {
    if (list.kind === "official") return `/lists/official/${encodeURIComponent(list.slug)}`;
    return `/users/${encodeURIComponent(list.owner.slug)}/lists/${encodeURIComponent(list.slug)}`;
  }
  function listProgressHref(list, viewerSlug) {
    if (!viewerSlug || list.kind === "official") return null;
    return `/users/${encodeURIComponent(viewerSlug)}/progress?list=${encodeURIComponent(list.id)}`;
  }
  function listPills(entry) {
    if (entry.kind === "official") return ["Official List"];
    if (entry.privacy === "private") return ["Private"];
    if (entry.privacy === "friends") return ["Following"];
    if (entry.privacy === "link") return ["Link"];
    return [];
  }

  // src/features/all-lists/api.js
  var LIMIT = 250;
  var MAX_PAGES = 10;
  function userPath(id) {
    return `/users/${encodeURIComponent(id)}`;
  }
  function getCollaborationLists(id) {
    const path = `${userPath(id)}/lists/collaborations`;
    return isSignedIn() ? apiAuth("GET", path, void 0, { extended: "images" }) : apiGet(`${path}?extended=images`);
  }
  async function getLikedLists(id) {
    const path = `${userPath(id)}/likes/lists`;
    if (isSignedIn()) {
      const page = (n) => apiAuthPage(path, { extended: "images", page: n, limit: LIMIT });
      const first = await page(1);
      const count2 = Math.min(first.pages ?? 1, MAX_PAGES);
      const rest = await Promise.all(Array.from({ length: count2 - 1 }, (_, i) => page(i + 2)));
      return [first, ...rest].flatMap((result) => Array.isArray(result.data) ? result.data : []);
    }
    const rows = [];
    for (let n = 1; n <= MAX_PAGES; n++) {
      const page = await apiGet(`${path}?extended=images&page=${n}&limit=${LIMIT}`);
      if (!Array.isArray(page)) break;
      rows.push(...page);
      if (page.length < LIMIT) break;
    }
    return rows;
  }
  function getListSummary(id) {
    return apiGet(`/lists/${encodeURIComponent(id)}?extended=images`);
  }
  function getViewer() {
    return apiAuth("GET", "/users/me");
  }

  // src/features/all-lists/styles.js
  var CSS7 = String.raw`
/* The view takes section.lists' own classes; rows take og's ListRow classes when the page has a native row.
   The --fallback rules copy ListRow.svelte for a profile with no personal lists to borrow from. */
/* og paints every section with --color-surface; the view is a div, so it needs the same, or the darker page shows
   between the groups and under the last row. flow-root keeps the groups' margins inside it. */
.ogt-all-lists { display: flow-root; margin: 0; padding-bottom: var(--gutter, 32px); background-color: var(--color-surface, #1d1d1d); }

.ogt-all-lists__group { margin: 0; padding-top: var(--list-card-spacing, 24px); border: 0; }
.ogt-all-lists__group + .ogt-all-lists__group { margin-top: 0; }
.ogt-all-lists__group h2, .ogt-all-lists__personal-heading { margin: 0 0 var(--list-card-spacing, 24px); }
.ogt-all-lists__personal-heading { padding-block-start: var(--list-card-spacing, 24px); }
.ogt-all-lists__empty, .ogt-all-lists__loading, .ogt-all-lists__error { color: var(--color-text-secondary, #aaa); }

.ogt-all-lists--fallback .list-row { container-type: inline-size; padding-block-start: var(--list-card-spacing, 24px); }
.ogt-all-lists--fallback .card {
  --poster-width: var(--list-card-poster-width, 160px);
  --poster-height: var(--list-card-poster-height, 180px);
  --sliver: var(--list-card-sliver, 24px);
  display: grid;
  grid-template-columns: calc(var(--poster-width) + (var(--sliver) * 4)) minmax(0, 1fr);
  position: relative;
  isolation: isolate;
  column-gap: var(--list-card-gap, 24px);
  row-gap: var(--list-card-row-gap, 12px);
  color: var(--color-text, #fff);
  --list-card-body-gap: var(--list-card-body-gap, 8px);
}

.ogt-all-lists--fallback .fan-frame { --rank-anchor-width: var(--poster-width); position: relative; align-self: start; }
.ogt-all-lists--fallback .fan {
  display: flex;
  block-size: var(--poster-height);
  overflow: hidden;
  border-radius: var(--radius-list-card-fan, 6px);
  background-color: var(--color-list-card-placeholder, #303030);
}
.ogt-all-lists--fallback .slot {
  position: relative;
  flex: none;
  inline-size: var(--sliver);
  block-size: var(--poster-height);
  overflow: hidden;
  transition: inline-size var(--transition-list-card-fan, .2s);
}
.ogt-all-lists--fallback .slot:not(:first-child) { box-shadow: var(--shadow-list-card-sliver); }
.ogt-all-lists--fallback .slot:first-child { flex-basis: var(--poster-width); }
.ogt-all-lists--fallback .poster { position: absolute; inset-block: 0; inset-inline-start: 0; display: block; inline-size: var(--poster-width); block-size: var(--poster-height); background: var(--color-card-bg, #252525); object-fit: cover; }
.ogt-all-lists--fallback .placeholder { background-image: var(--image-placeholder-poster, repeating-linear-gradient(135deg, #303030 0 6px, transparent 6px 12px)); background-size: cover; }
.ogt-all-lists--fallback .placeholder.empty, .ogt-all-lists--fallback .fan.empty { background: repeating-linear-gradient(135deg, var(--color-list-card-placeholder-line, #383838) 0 6px, transparent 6px 12px), var(--color-list-card-placeholder, #303030); }
.ogt-all-lists--fallback .no-items { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; color: var(--color-stat-noun, #aaa); font-family: var(--font-headings); font-size: var(--font-size-list-card-empty, 14px); pointer-events: none; }
.ogt-all-lists--fallback .no-items::before { content: '▤'; margin-bottom: 6px; font-size: var(--font-size-list-card-empty-icon, 20px); }
.ogt-all-lists .poster.loading { background: linear-gradient(90deg, #303030, #414141, #303030); }
@container (min-width: 520px) {
  .ogt-all-lists--fallback .fan:hover .slot { inline-size: var(--sliver); }
  .ogt-all-lists--fallback .fan:hover .slot:hover { inline-size: var(--poster-width); }
}

.ogt-all-lists--fallback .body { display: flex; min-inline-size: 0; flex-direction: column; gap: var(--list-card-body-gap, 8px); }
.ogt-all-lists--fallback .head { display: flex; flex-wrap: wrap; inline-size: 100%; min-inline-size: 0; align-items: center; justify-content: space-between; gap: var(--list-card-body-gap, 8px) var(--list-card-foot-gap, 12px); }
.ogt-all-lists--fallback .name-link { min-inline-size: 0; color: var(--color-text, #fff); }
.ogt-all-lists--fallback .name-link:hover, .ogt-all-lists--fallback .card:hover .name-link { color: var(--color-link, #f31f35); }
.ogt-all-lists--fallback .name-link h3 { margin: 0; font-weight: var(--font-weight-headings, 600); font-size: var(--font-size-h4, 18px); }
.ogt-all-lists--fallback .chips { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--comment-tags-gap, 4px); margin-inline-start: auto; }
.ogt-all-lists__tag { display: inline-flex; block-size: var(--comment-chip-height, 24px); align-items: center; gap: var(--list-card-chip-gap, 5px); padding-inline: var(--comment-chip-padding, 8px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--ogt-list-tag-color) var(--list-card-chip-line, 40%), transparent); border-radius: var(--radius-list-card-chip, 5px); background: color-mix(in srgb, var(--ogt-list-tag-color) var(--list-card-chip-tint, 10%), transparent); color: color-mix(in srgb, var(--ogt-list-tag-color), var(--color-list-card-chip-lift, white) var(--list-card-chip-lift, 10%)); font-family: var(--font-headings); font-size: var(--font-size-comment-tag, 12px); white-space: nowrap; }
/* og's VipLabel (compact pill), for owners on pages without a native label to copy. */
.ogt-vip { display: inline-flex; align-items: stretch; overflow: hidden; block-size: var(--label-vip-height-small, 18px);
  margin-inline-start: 5px; border-radius: calc(var(--label-vip-height-small, 18px) / 2); background-color: var(--brand-primary, #ed1c24);
  color: var(--color-text-inverse, #fff); font-family: var(--font-headings); font-size: var(--font-size-label-vip-small, 11px);
  font-weight: var(--font-weight-headings-heavy, 700); letter-spacing: var(--label-vip-tracking, .04em); line-height: 1;
  text-transform: uppercase; text-shadow: none; vertical-align: middle; white-space: nowrap; }
.ogt-vip__name, .ogt-vip__tag { display: inline-flex; align-items: center; }
.ogt-vip__name { gap: var(--label-vip-gap-small, 3px); padding: var(--label-vip-name-padding-small, 0 7px 0 4px); }
.ogt-vip__mark { display: flex; font-size: var(--label-vip-mark-small, 12px); }
.ogt-vip__mark svg { block-size: 1em; inline-size: auto; translate: 0 var(--label-vip-mark-shift, 0); }
.ogt-vip__tag { padding: var(--label-vip-segment-padding-small, 0 6px); background-color: var(--color-label-ep, #8e44ad); text-decoration: none; }

.ogt-all-lists__icon { display: block; flex: none; width: 16px; height: 16px; }
.ogt-all-lists__tag .ogt-all-lists__icon { width: 12px; height: 12px; }
.ogt-all-lists--fallback .by { display: flex; flex-wrap: wrap; align-items: center; row-gap: var(--list-card-body-gap, 8px); margin: 0; color: var(--color-stat-noun, #aaa); font-family: var(--font-headings); font-size: var(--font-size-list-row-meta, 14px); }
.ogt-all-lists--fallback .owner { display: inline-flex; align-items: center; gap: var(--space-stat, 6px); color: var(--color-text, #fff); text-decoration: none; }
.ogt-all-lists--fallback .avatar { display: inline-flex; inline-size: var(--list-card-avatar-size, 24px); block-size: var(--list-card-avatar-size, 24px); flex: 0 0 var(--list-card-avatar-size, 24px); overflow: hidden; border-radius: 50%; background: var(--color-avatar-border, #353535); }
.ogt-all-lists--fallback .avatar img { inline-size: 100%; block-size: 100%; object-fit: cover; }
.ogt-all-lists--fallback .overview { max-inline-size: 80ch; margin-block-start: var(--list-card-bubble-gap, 8px); color: var(--color-list-card-description, var(--color-text-secondary, #aaa)); overflow-wrap: break-word; }
.ogt-all-lists--fallback .clamp { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.ogt-all-lists--fallback .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--list-card-foot-gap, 8px) var(--space-stats, 12px); margin-block-start: auto; padding-block-start: var(--list-card-foot-gap, 8px); font-family: var(--font-headings); font-size: var(--font-size-list-row-meta, 14px); white-space: nowrap; }
.ogt-all-lists--fallback .counts, .ogt-all-lists--fallback .tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--list-counts-gap, 8px); }
.ogt-all-lists__count { display: inline-flex; block-size: var(--control-height, 36px); align-items: center; gap: var(--glass-action-gap-card, 8px); padding-inline: var(--glass-action-padding-card, 12px); border: 1px solid var(--color-control-border, #444); border-radius: var(--radius-control, 6px); background: var(--color-control-bg, transparent); color: var(--color-control-text, #ddd); font-family: var(--font-body); font-size: var(--font-size-glass-action, 14px); text-decoration: none; white-space: nowrap; }
.ogt-all-lists__count strong { font-weight: 700; }
.ogt-all-lists__count-icon { inline-size: 14px; block-size: 14px; color: var(--color-action-share, #00baff); }
.ogt-all-lists__count-icon { display: block; flex: none; }
.ogt-all-lists__count.comments .ogt-all-lists__count-icon { color: var(--color-stat-noun, #aaa); }
.ogt-all-lists--fallback .action { display: inline-grid; inline-size: var(--comment-tool-size, 28px); block-size: var(--comment-tool-size, 28px); place-items: center; border-radius: var(--radius-comment-tool, 4px); color: var(--color-stat-noun, #aaa); text-decoration: none; }
.ogt-all-lists--fallback button.action { padding: 0; border: 0; background: transparent; font: inherit; cursor: pointer; }
.ogt-all-lists--fallback .action:hover { background: var(--color-comment-chip, #333); }
.ogt-all-lists--fallback .progress { color: var(--color-text, #fff); }
.ogt-all-lists--fallback .share { color: var(--color-action-share, #00baff); }

@container (max-width: 600px) {
  .ogt-all-lists--fallback .card { grid-template-columns: minmax(0, 1fr); }
  .ogt-all-lists--fallback .fan { gap: var(--list-card-poster-gap-narrow, 8px); block-size: auto; overflow: visible; background: none; }
  .ogt-all-lists--fallback .fan.empty { block-size: var(--poster-height); }
  .ogt-all-lists--fallback .slot, .ogt-all-lists--fallback .slot:first-child { flex: 1; inline-size: auto; border-radius: var(--radius-list-card-poster-narrow, 4px); box-shadow: none; }
  .ogt-all-lists--fallback .slot { block-size: auto; }
  .ogt-all-lists--fallback .poster { position: relative; inline-size: 100%; block-size: auto; aspect-ratio: var(--ratio-poster, 2 / 3); }
}
`;

  // src/features/all-lists/index.js
  var ROOT_ID = "ogt-all-lists";
  var OPTION_ID = "ogt-all-lists-option";
  var HASH = "#ogt-all-lists";
  var ROUTES = ["lists", "smart-lists", "lists-collaborations", "liked-lists"];
  var posterRequests = /* @__PURE__ */ new Map();
  var ICONS = {
    Private: ["--color-list-chip-private", "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3"],
    Following: ["--color-list-chip-following", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0Z"],
    Link: ["--color-list-chip-link", "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"],
    "Official List": ["--color-list-chip-official", "M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"],
    likes: "M7 10v10H4V10h3Zm2 10h8a2 2 0 0 0 2-1.6l1-6A2 2 0 0 0 18 10h-4l.6-3.2A2.5 2.5 0 0 0 12 4l-3 6v10Z",
    items: "M6 3h8l4 4v14H6V3Zm8 0v5h4",
    comments: "M21 11a7 7 0 0 1-7 7H9l-4 3v-4a7 7 0 1 1 16-6Z",
    progress: "M4 5h16v5H4z M4 14h16v5H4z M7 7.5h.01 M7 16.5h.01",
    share: "M12 16V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
  };
  var VIP_MARK = "M104 363Q133 394 172 412Q211 430 256 430Q279 430 300.50 425Q322 420 342 411L199 269L104 363M198 182L90 290L76 276L323 29Q307 24 290 21Q273 18 256 18Q213 18 176 34Q138 50 110 78Q82 106 66 144Q50 181 50 224Q50 259 61 290.50Q72 322 91 348L199 240L206 247L361 401Q363 400 365.50 398.50Q368 397 370 396L199 225L95 329L81 314L199 196L206 203L387 383Q389 382 391 380Q393 378 395 377L200 182L198 182M360 64L242 182L228 167L346 49L360 64M263 204L249 190L351 88L366 102L263 204M409 362Q434 335 448 299.50Q462 264 462 224Q462 162 429 112Q396 62 343 37L214 167L409 362M256-6Q208-6 166 12Q124 30 93 61Q62 92 44 134Q26 176 26 224Q26 272 44 314Q62 356 93 387Q124 418 166 436Q208 454 256 454Q304 454 346 436Q388 418 419 387Q450 356 468 314Q486 272 486 224Q486 176 468 134Q450 92 419 61Q388 30 346 12Q304-6 256-6M256 480Q203 480 156 460Q110 440 75 405Q40 370 20 324Q0 277 0 224Q0 171 20 124Q40 78 75 43Q110 8 156-12Q203-32 256-32Q309-32 356-12Q402 8 437 43Q472 78 492 124Q512 171 512 224Q512 277 492 324Q472 370 437 405Q402 440 356 460Q309 480 256 480";
  var LIKED_ICON = ["0 0 512 512", "M313 33Q333 37 344 53Q355 69 351 89L349 101Q341 141 320 176L464 176Q484 177 498 190Q511 204 512 224Q511 253 486 267Q503 281 504 304Q504 322 493 335Q482 348 465 351Q472 362 472 376Q470 410 439 422Q440 427 440 432Q439 452 426 466Q412 479 392 480L295 480Q265 480 241 464L203 438Q161 409 160 358L160 320L160 272L160 247Q161 201 196 172L203 166Q244 133 255 82L257 71Q261 51 277 40Q293 29 313 33M32 192L96 192L32 192L96 192Q110 192 119 201Q128 210 128 224L128 448Q128 462 119 471Q110 480 96 480L32 480Q18 480 9 471Q0 462 0 448L0 224Q0 210 9 201Q18 192 32 192"];
  function icon2(pathData, className = "ogt-all-lists__icon") {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("class", className);
    svg3.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    for (const [name, value] of Object.entries({
      d: pathData,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    })) path.setAttribute(name, value);
    svg3.append(path);
    return svg3;
  }
  function findDropdown() {
    for (const trigger of document.querySelectorAll("button[popovertarget]")) {
      if (!/^(?:Lists|Liked):/i.test(text(trigger.querySelector(".section")))) continue;
      const menu = document.getElementById(trigger.getAttribute("popovertarget"));
      if (menu) return { trigger, menu };
    }
    return null;
  }
  function nativeParts(lists) {
    const row = lists.querySelector("article.list-row");
    if (!row) return null;
    const scoped = (node) => [...node?.classList ?? []].filter((name) => name.startsWith("svelte-")).join(" ");
    const counts = [...lists.querySelectorAll(".list-row .counts a.count")];
    return {
      row: scoped(row),
      icon: scoped(lists.querySelector(".list-row svg.icon")),
      likes: lists.querySelector(".list-row .counts > .glass-action"),
      items: counts.find((count2) => !count2.getAttribute("href")?.endsWith("/comments")),
      comments: counts.find((count2) => count2.getAttribute("href")?.endsWith("/comments")),
      tag: lists.querySelector(".list-row .chips .tag.tint"),
      text: scoped(lists.querySelector(".list-row .comment-text")),
      share: lists.querySelector(".list-row .tools > span.share"),
      vip: lists.querySelector(".list-row .by .label-vip"),
      progress: lists.querySelector(".list-row .tools a.progress")
    };
  }
  function createRows(native) {
    const part = (tag2, name, props = {}, ...children) => el(tag2, { ...props, class: [name, native?.row].filter(Boolean).join(" ") }, ...children);
    const ownIcon = (path) => icon2(path, ["icon", native?.icon].filter(Boolean).join(" "));
    function count2(kind, value, href, word, liked = false) {
      if (value == null) return null;
      const words = value === 1 ? word : `${word}s`;
      const template = native?.[kind];
      if (kind === "likes" && template) {
        const classes = template.className.split(" ").filter((name) => !liked || name !== "glass");
        if (liked) classes.push("tinted", "selected");
        const node = el(
          "span",
          {
            class: classes.join(" "),
            style: liked ? "--action: var(--color-list-card-like)" : template.getAttribute("style"),
            title: `${value.toLocaleString("en-US")} ${words}${liked ? " · you liked this list" : ""}`
          },
          ...[...template.childNodes].map((child) => child.cloneNode(true))
        );
        const svg3 = liked && node.querySelector(".icon svg");
        if (svg3) {
          svg3.setAttribute("viewBox", LIKED_ICON[0]);
          svg3.querySelector("path")?.setAttribute("d", LIKED_ICON[1]);
        }
        const number = node.querySelector(".number");
        if (number) number.textContent = value.toLocaleString("en-US");
        const label = node.querySelector(".count-text");
        if (label) label.textContent = ` ${words}`;
        return node;
      }
      if (template) {
        const node = template.cloneNode(true);
        node.removeAttribute("aria-describedby");
        node.setAttribute("href", href);
        node.querySelector("strong").textContent = value.toLocaleString("en-US");
        node.querySelector(".count-text").textContent = words;
        return node;
      }
      return el(
        "a",
        { class: `ogt-all-lists__count ${kind}`, href },
        icon2(ICONS[kind], "ogt-all-lists__count-icon"),
        el("strong", { text: value.toLocaleString("en-US") }),
        el("span", { text: ` ${words}` })
      );
    }
    function tag(label) {
      const [color, path] = ICONS[label];
      if (native?.tag) {
        return el("span", { class: native.tag.className, style: `--tone: var(${color})` }, ownIcon(path), label);
      }
      return el("span", { class: "ogt-all-lists__tag", style: `--ogt-list-tag-color: var(${color}, #888)` }, icon2(path), label);
    }
    function share(entry) {
      const url = new URL(listHref(entry), location.origin).href;
      const copy = () => void shareList(entry.name, url);
      if (native?.share) {
        const node = native.share.cloneNode(true);
        node.querySelector("[popover]")?.remove();
        const button2 = node.querySelector("button");
        button2?.removeAttribute("aria-describedby");
        button2?.setAttribute("title", "Copy Link");
        button2?.addEventListener("click", copy);
        return node;
      }
      return el(
        "button",
        { type: "button", class: "action share", title: "Copy Link", "aria-label": "Copy Link", on: { click: copy } },
        icon2(ICONS.share)
      );
    }
    function progress(href) {
      if (!href) return null;
      if (native?.progress) {
        const node = native.progress.cloneNode(true);
        node.removeAttribute("aria-describedby");
        node.setAttribute("href", href);
        node.setAttribute("title", "View watched progress");
        return node;
      }
      return part(
        "a",
        "action progress",
        { href, title: "View watched progress", "aria-label": "View watched progress" },
        ownIcon(ICONS.progress)
      );
    }
    function fan(entry, posters, loading) {
      const node = part("a", `fan${entry.itemCount === 0 ? " empty" : ""}`, { href: listHref(entry), tabindex: "-1", "aria-hidden": "true" });
      if (entry.itemCount === 0) return node;
      for (let i = 0; i < 5; i++) {
        const poster = posters[i];
        node.append(part("span", "slot", {}, poster ? part("img", "poster", { src: poster, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }) : part("span", loading ? "poster loading" : `poster placeholder${posters.length ? " empty" : ""}`)));
      }
      return node;
    }
    function vip(badge) {
      if (!badge) return null;
      const title = badge.tag === "OG" ? "Original VIP Member" : "Executive Producer";
      if (native?.vip) {
        const node = native.vip.cloneNode(true);
        node.querySelectorAll("[popover], .tag, .years").forEach((extra) => extra.remove());
        const name = node.querySelector(".name");
        const mark = name?.querySelector(".mark");
        if (name && mark) {
          name.replaceChildren(mark, badge.label);
          const scope = [...name.classList].filter((c) => c.startsWith("svelte-"));
          if (badge.tag) node.append(el("abbr", { class: ["tag", ...scope].join(" "), text: badge.tag, title }));
          return node;
        }
      }
      const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg3.setAttribute("class", ["icon", native?.icon].filter(Boolean).join(" "));
      svg3.setAttribute("viewBox", "0 0 512 512");
      svg3.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "currentColor");
      path.setAttribute("d", VIP_MARK);
      svg3.append(path);
      return el(
        "span",
        { class: "ogt-vip" },
        el("span", { class: "ogt-vip__name" }, el("span", { class: "ogt-vip__mark" }, svg3), badge.label),
        badge.tag ? el("abbr", { class: "ogt-vip__tag", text: badge.tag, title }) : null
      );
    }
    function description(value) {
      if (!value) return null;
      const paragraphs = value.split(/\n\s*\n/).map((paragraph) => el(
        "p",
        { class: native?.text || null },
        paragraph.trim().split("\n").flatMap((line, i) => i ? [el("br"), line] : [line])
      ));
      return part("div", "overview", {}, part(
        "div",
        "clamp",
        {},
        native?.text ? el("div", { class: `comment-text ${native.text}` }, ...paragraphs) : paragraphs
      ));
    }
    return function row(entry, { viewerSlug, loading, liked = false }) {
      const href = listHref(entry);
      const pills = listPills(entry);
      const avatar = entry.kind === "official" ? null : entry.owner.avatar;
      const frame = part("div", "fan-frame", {}, fan(entry, entry.posters, loading));
      if (entry.itemCount === 0) frame.append(part("span", "no-items", { text: "No items yet" }));
      const node = part(
        "article",
        "list-row",
        { dataset: { listId: entry.id } },
        part(
          "div",
          "card",
          {},
          frame,
          part(
            "div",
            "body",
            {},
            part(
              "div",
              "head",
              {},
              part("a", "name-link", { href }, part("h3", "", { text: entry.name })),
              pills.length ? part("span", "chips", {}, pills.map(tag)) : null
            ),
            part(
              "p",
              "by",
              {},
              part(
                "a",
                "owner",
                { href: `/users/${encodeURIComponent(entry.owner.slug)}` },
                part("span", "avatar", {}, avatar ? part("img", "", { src: avatar, alt: "" }) : null),
                entry.owner.name
              ),
              vip(entry.owner.vip)
            ),
            description(entry.description),
            part(
              "footer",
              "foot",
              {},
              part(
                "div",
                "counts",
                {},
                count2("likes", entry.likes, href, "like", liked),
                count2("items", entry.itemCount, href, "item"),
                entry.allowComments ? count2("comments", entry.commentCount, `${href}/comments`, "comment") : null
              ),
              part(
                "div",
                "tools",
                {},
                progress(listProgressHref(entry, viewerSlug)),
                native?.share ? share(entry) : part("span", "share", {}, share(entry))
              )
            )
          )
        )
      );
      node.setPosters = (posters) => node.querySelector(".fan").replaceWith(fan(entry, posters, false));
      return node;
    };
  }
  async function shareList(title, url) {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      void notifySuccess("Link copied to your clipboard!");
    } catch (error) {
      debugError("could not copy the list link", error);
    }
  }
  function postersFor(id) {
    if (!posterRequests.has(id)) {
      posterRequests.set(id, getListSummary(id).then((summary2) => (Array.isArray(summary2?.images?.posters) ? summary2.images.posters : []).map(posterUrl2).filter(Boolean).slice(0, 5)).catch((error) => {
        posterRequests.delete(id);
        debugError(`could not load posters for list ${id}`, error);
        return [];
      }));
    }
    return posterRequests.get(id);
  }
  function createView(profile, lists) {
    const container = lists.querySelector(":scope > .container");
    const node = el("div", { id: ROOT_ID, class: `${lists.className} ogt-all-lists` });
    let cancelled = false;
    let loading = null;
    let observer = null;
    function group(name, title, rows, empty) {
      return el(
        "div",
        { role: "region", class: `ogt-all-lists__group ogt-all-lists__group--${name}`, "aria-label": title },
        el(
          "div",
          { class: container?.className || "container" },
          el("h2", { class: "ogt-all-lists__heading", text: title }),
          rows.length ? el("div", { class: "rows" }, rows) : el("p", { class: "ogt-all-lists__empty", text: empty })
        )
      );
    }
    async function load() {
      node.replaceChildren(el("p", { class: "ogt-all-lists__loading", text: "Loading collaborations and liked lists…" }));
      const results = await Promise.allSettled([
        getCollaborationLists(profile),
        getLikedLists(profile),
        isSignedIn() ? getViewer() : Promise.resolve(null)
      ]);
      if (cancelled) return;
      for (const result of results) if (result.status === "rejected") debugError("all-lists lookup failed", result.reason);
      const [collaborations, liked, viewer] = results.map((result) => result.status === "fulfilled" ? result.value : null);
      const viewerSlug = viewer?.ids?.slug || viewer?.username || null;
      const likedRows = likedLists(liked);
      let likedIds = /* @__PURE__ */ new Set();
      if (viewerSlug === profile) likedIds = new Set(likedRows.map((entry) => entry.id));
      else if (viewerSlug) {
        try {
          likedIds = new Set(likedLists(await getLikedLists(viewerSlug)).map((entry) => entry.id));
        } catch (error) {
          debugError("viewer liked lists lookup failed", error);
        }
        if (cancelled) return;
      }
      const native = nativeParts(lists);
      node.classList.toggle("ogt-all-lists--fallback", !native);
      const row = createRows(native);
      const waiting2 = /* @__PURE__ */ new Map();
      const likedNodes = likedRows.map((entry) => {
        const pending = entry.itemCount > 0 && !entry.posters.length;
        const rowNode = row(entry, { viewerSlug, loading: pending, liked: likedIds.has(entry.id) });
        if (pending) waiting2.set(rowNode, entry);
        return rowNode;
      });
      node.replaceChildren(
        group("collaborations", "Collaborations", collaborationLists(collaborations).map((entry) => row(entry, { viewerSlug, liked: likedIds.has(entry.id) })), "No collaborations."),
        group("liked", "Liked", likedNodes, "No liked lists.")
      );
      const failed = results.slice(0, 2).filter((result) => result.status === "rejected");
      if (failed.length) {
        const missingId = failed.some((result) => result.reason instanceof MissingClientIdError);
        node.prepend(el("p", { class: "ogt-all-lists__error", role: "status", text: missingId ? "Set a Trakt API client ID in the toolkit menu to load collaborations and liked lists." : "Some lists could not be loaded. Try again later." }));
      }
      const fill = (rowNode) => {
        const entry = waiting2.get(rowNode);
        waiting2.delete(rowNode);
        void postersFor(entry.id).then((posters) => {
          if (!cancelled) rowNode.setPosters(posters);
        });
      };
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver((changes) => {
          for (const change of changes) {
            if (!change.isIntersecting || !waiting2.has(change.target)) continue;
            observer.unobserve(change.target);
            fill(change.target);
          }
        }, { rootMargin: "300px" });
        for (const rowNode of waiting2.keys()) observer.observe(rowNode);
      } else {
        for (const rowNode of [...waiting2.keys()]) fill(rowNode);
      }
    }
    return {
      node,
      load() {
        loading ??= load().catch((error) => debugError("all-lists render failed", error));
        return loading;
      },
      destroy() {
        cancelled = true;
        observer?.disconnect();
        node.remove();
      }
    };
  }
  var allLists = {
    id: "all-lists",
    css: CSS7,
    match: (route) => ROUTES.includes(route.name),
    mount(route) {
      const dropdown = findDropdown();
      const lists = document.querySelector("section.lists");
      const source = dropdown && [...dropdown.menu.querySelectorAll("a[href]")].find((link) => link.getAttribute("href").endsWith("/lists/collaborations"));
      if (!source || !lists || document.getElementById(OPTION_ID)) return null;
      const { trigger, menu } = dropdown;
      const profile = decodeURIComponent(route.id);
      const option = source.cloneNode(false);
      option.textContent = "All lists";
      option.setAttribute("href", `/users/${route.id}/lists${HASH}`);
      option.removeAttribute("aria-current");
      option.removeAttribute("aria-label");
      const item = el("li", { id: OPTION_ID }, option);
      source.closest("li").after(item);
      const view = createView(profile, lists);
      const heading = el("h2", { class: "ogt-all-lists__personal-heading", text: "Personal" });
      const label = [...trigger.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
      const originalLabel = label?.textContent;
      const current = [...menu.querySelectorAll("a[aria-current]")];
      let active2 = false;
      function show() {
        menu.hidePopover?.();
        if (active2) return;
        active2 = true;
        for (const link of current) link.removeAttribute("aria-current");
        option.setAttribute("aria-current", "page");
        if (label) label.textContent = originalLabel.replace(originalLabel.trim(), "All lists");
        const container = lists.querySelector(":scope > .container") || lists;
        container.prepend(heading);
        lists.after(view.node);
        void view.load();
      }
      function hide() {
        if (!active2) return;
        active2 = false;
        option.removeAttribute("aria-current");
        for (const link of current) link.setAttribute("aria-current", "page");
        if (label) label.textContent = originalLabel;
        heading.remove();
        view.node.remove();
      }
      function choose(event) {
        if (route.name !== "lists") return;
        event.preventDefault();
        show();
      }
      function chooseNative(event) {
        if (!option.contains(event.target) && event.target.closest?.("a[href]")) hide();
      }
      option.addEventListener("click", choose);
      menu.addEventListener("click", chooseNative);
      if (route.name === "lists" && location.hash === HASH) {
        history.replaceState(history.state, "", location.pathname + location.search);
        show();
      }
      return {
        node: item,
        destroy() {
          menu.removeEventListener("click", chooseNative);
          hide();
          view.destroy();
          item.remove();
        }
      };
    }
  };

  // src/features/library/api.js
  var validId = (id) => Number.isSafeInteger(id) && id > 0;
  function createLibraryApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
    return {
      async add(route, { confirm = () => true, active: active2 = () => true } = {}) {
        if (!signedIn()) throw new Error("Sign in through the toolkit menu first.");
        const id = encodeURIComponent(route.id);
        const at = now();
        const collected_at = new Date(at).toISOString();
        let body;
        if (route.kind === "movie" && route.name === "title") {
          const movie = await get(`/movies/${id}`);
          if (!validId(movie?.ids?.trakt)) throw new Error("Could not identify this movie.");
          body = { movies: [{ ids: { trakt: movie.ids.trakt }, collected_at }] };
        } else if (route.kind === "show" && ["title", "season", "episode"].includes(route.name)) {
          const seasons = route.name === "title" ? await get(`/shows/${id}/seasons?extended=full,episodes`, { ttl: 0 }) : [{ number: route.season }];
          if (!Array.isArray(seasons)) throw new Error("Could not load seasons.");
          const episodes = [];
          for (const season of seasons) {
            if (!active2() || !signedIn()) return { cancelled: true };
            if (!Number.isSafeInteger(season.number) || season.number < 0) continue;
            if (route.name === "title" && season.number === 0) continue;
            const path = `/shows/${id}/seasons/${season.number}`;
            const rows = route.name === "title" ? season.episodes : route.name === "episode" ? [await get(`${path}/episodes/${route.episode}?extended=full`)] : await get(`${path}?extended=full`);
            if (!Array.isArray(rows)) throw new Error("Could not load episodes.");
            for (const episode of rows) {
              if (validId(episode?.ids?.trakt) && Number.isFinite(Date.parse(episode.first_aired)) && Date.parse(episode.first_aired) <= at) {
                episodes.push({ ids: { trakt: episode.ids.trakt }, collected_at });
              }
            }
          }
          body = { episodes: [...new Map(episodes.map((ep) => [ep.ids.trakt, ep])).values()] };
          if (!body.episodes.length) throw new Error("No aired episodes to add.");
          if (!active2() || !signedIn()) return { cancelled: true };
          if (route.name !== "episode" && !confirm(`Add ${body.episodes.length} aired episode${body.episodes.length === 1 ? "" : "s"} to your toolkit Trakt account’s library?${route.name === "title" ? " Specials are excluded." : ""}`)) {
            return { cancelled: true };
          }
        } else throw new Error("Unsupported library page.");
        if (!active2() || !signedIn()) return { cancelled: true };
        const result = await auth("POST", "/sync/collection", body);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find some items; the addition may be incomplete.");
        }
        const counts = [result?.added?.movies, result?.added?.episodes, result?.updated?.movies, result?.updated?.episodes];
        if (!counts.some((count2) => Number.isInteger(count2) && count2 > 0)) throw new Error("Trakt did not confirm a library addition.");
        const total = (counts2) => (Number(counts2?.movies) || 0) + (Number(counts2?.episodes) || 0);
        const undoable = total(result?.added) > 0 && total(result?.updated) === 0 && total(result?.existing) === 0;
        return { cancelled: false, body, undoable };
      },
      /** Undo an addition with the exact body that was sent. */
      async remove(body, { active: active2 = () => true } = {}) {
        if (!signedIn()) throw new Error("Sign in through the toolkit menu first.");
        if (!body || typeof body !== "object" || !active2()) return { cancelled: true };
        const result = await auth("POST", "/sync/collection/remove", body);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find some items.");
        }
        return { cancelled: false };
      }
    };
  }
  var libraryApi = createLibraryApi();

  // src/features/library/native-refresh.js
  var discovery2;
  function nativeLibraryImports(source, layoutUrl, loaded) {
    return nativeRootImports(source, layoutUrl, loaded, (alias) => ["start", "stop", "recheck"].every((method) => source.includes(`${alias}.${method}(`)));
  }
  function isNativeLibraryStore(source) {
    return source.length < 5e4 && ["state", "collectionCounts", "refresh", "recheck", "patch"].every((name) => new RegExp(`\\b${name}\\s*:`).test(source));
  }
  function createNativeLibraryRefresh() {
    const pending = /* @__PURE__ */ new Set();
    const prepare = async (route, { active: active2 = () => true } = {}) => {
      if (route.name !== "title" || !["movie", "show"].includes(route.kind) || !active2() || !document.querySelector("header.top-nav .profile")) return null;
      const url = await (discovery2 ??= discoverNativeModule(nativeLibraryImports, isNativeLibraryStore));
      return active2() && document.querySelector("header.top-nav .profile") ? url : null;
    };
    return {
      // Resolve cached public modules during the save; native account reads still start only after success.
      prepare,
      async refresh(route, { active: active2 = () => true } = {}) {
        const url = await prepare(route, { active: active2 });
        if (!url) return false;
        return new Promise((resolve) => {
          const id = `ogt:library-refresh:${crypto.randomUUID()}`;
          const script = document.createElement("script");
          const pagePath = location.pathname;
          script.id = id;
          let settled = false;
          const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            document.removeEventListener(id, answered);
            document.removeEventListener("ogt:authchange", cancel);
            window.removeEventListener("popstate", cancel);
            script.remove();
            pending.delete(cancel);
            resolve(result && active2());
          };
          const cancel = () => finish(false);
          const answered = (event) => finish(event.detail === "refreshed");
          const timer = setTimeout(cancel, 1e4);
          pending.add(cancel);
          document.addEventListener(id, answered);
          document.addEventListener("ogt:authchange", cancel);
          window.addEventListener("popstate", cancel);
          script.type = "module";
          script.onerror = cancel;
          script.textContent = `(async () => {
          let result = 'unavailable';
          try {
            const module = await import(${JSON.stringify(url)});
            const store = Object.values(module).find(value => value &&
              ['state', 'collectionCounts', 'refresh', 'recheck', 'patch'].every(key => typeof value[key] === 'function'));
            if (store && document.getElementById(${JSON.stringify(id)}) &&
                location.pathname === ${JSON.stringify(pagePath).replace(/</g, "\\u003c")} &&
                document.querySelector('header.top-nav .profile')) {
              await store.refresh();
              result = 'refreshed';
            }
          } catch {}
          document.dispatchEvent(new CustomEvent(${JSON.stringify(id)}, { detail: result }));
        })();`;
          document.head.append(script);
        });
      },
      destroy() {
        for (const cancel of [...pending]) cancel();
      }
    };
  }

  // src/features/library/data.js
  function readLibraryTitle(doc) {
    const heading = doc.querySelector(".fanart-header .summary-title h1");
    return [...heading?.childNodes ?? []].filter((node) => node.nodeType === 3).map((node) => node.textContent).join("").trim() || "this title";
  }

  // src/ui/action-button.js
  function findActionStack(doc = document) {
    return doc.querySelector(".summary-frame #overview .top .actions .action-buttons") || doc.querySelector(".summary-frame #overview .top .actions");
  }
  function actionButtonCss(prefix, color) {
    return `
    .${prefix} { --action-color: ${color}; margin: 0; }
    .${prefix}[hidden] { display: none !important; }
    /* Use OG's design values without inheriting its component state selectors. */
    .${prefix}__button { display: flex; align-items: center; width: 100%;
      height: var(--summary-action-height, 60px); padding: 0; border: 0;
      border-radius: var(--radius-summary-action, 6px);
      background: color-mix(in srgb, var(--action-color) var(--summary-action-tint, 3%), var(--color-action-bg, #202020));
      box-shadow: inset 0 0 0 var(--summary-action-outline, 1px) color-mix(in srgb, var(--action-color) var(--summary-action-outline-mix, 65%), transparent);
      color: var(--action-color); font: inherit; text-align: start; cursor: pointer;
      transition: background-color var(--transition-summary-action, 150ms), color var(--transition-summary-action, 150ms); }
    .${prefix}__button:is(:hover, :focus-visible):not(:disabled) { background: var(--action-color); color: var(--color-text-inverse, white); box-shadow: none; }
    .${prefix}__glyph { display: grid; place-items: center; flex-shrink: 0; align-self: stretch; width: var(--action-icon-width, 48px); }
    .${prefix}__glyph svg { width: 24px; height: 28px; }
    .${prefix}__text { flex: 1; min-width: 0; font-family: var(--font-headings, inherit); }
    .${prefix}__title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: var(--font-size-action, 13px); font-weight: var(--font-weight-headings-heavy, 700);
      letter-spacing: var(--summary-action-tracking, .04em); line-height: var(--summary-action-title-line, 1.3); text-transform: uppercase; }
    .${prefix}__button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
    .${prefix}__button:disabled { opacity: .6; cursor: default; }
    .${prefix}__status { font: 12px/1.4 system-ui; margin: 6px 0 0; }
    .${prefix}__status:empty { display: none; }
  `;
  }

  // src/features/library/index.js
  var ID2 = "ogt-library";
  var library = {
    id: "library",
    css: actionButtonCss("ogt-library", "var(--brand-quaternary, #129982)"),
    match: (route) => route.kind === "movie" && route.name === "title" || route.kind === "show" && ["title", "season", "episode"].includes(route.name),
    mount(route) {
      const anchor = findActionStack();
      if (!anchor || document.getElementById(ID2)) return null;
      let destroyed = false;
      let busy = false;
      let undoing = false;
      let session = 0;
      let operation = 0;
      let added = false;
      let refreshing = false;
      let wasCollected = false;
      const nativeRefresh = createNativeLibraryRefresh();
      const doc = anchor.ownerDocument;
      const pagePath = doc.location.pathname;
      const label = el("span", { class: "ogt-library__title", text: "Add to library" });
      const glyph = el("span", { class: "ogt-library__glyph", "aria-hidden": "true" });
      const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [name, value] of Object.entries({ viewBox: "0 0 24 28", fill: "none", stroke: "currentColor", "stroke-width": "1" })) svg3.setAttribute(name, value);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M5 2h17v24H3V4a2 2 0 0 1 2-2Z M3 5H1V2a2 2 0 0 1 2-2h17v2 M14 2v8l3-2 3 2V2");
      svg3.append(path);
      glyph.append(svg3);
      const button2 = el("button", {
        type: "button",
        class: "ogt-library__button",
        title: "Add using the toolkit’s Trakt account"
      });
      button2.append(glyph, el("span", { class: "ogt-library__text" }, label));
      const status = el("p", { class: "ogt-library__status", role: "status", "aria-live": "polite" });
      const node = el("div", { id: ID2, class: "ogt-library" }, button2, status);
      function syncVisibility() {
        const titles = [...anchor.querySelectorAll(".summary-action .title")].filter((title) => !node.contains(title));
        const collected = titles.some((title) => /\bin library\b/i.test(title.textContent));
        if (wasCollected && !collected) added = false;
        wasCollected = collected;
        const nativeLibrary = collected || titles.some((title) => /\badd to library\b/i.test(title.textContent));
        node.hidden = nativeLibrary || added && !refreshing;
      }
      async function add() {
        if (busy || undoing || node.hidden) return;
        if (!isSignedIn()) {
          status.textContent = "Sign in to Trakt through the toolkit menu first.";
          return;
        }
        busy = true;
        const epoch = session;
        const operationId = ++operation;
        button2.disabled = true;
        label.textContent = "Adding to library…";
        status.textContent = "";
        const active2 = () => !destroyed && epoch === session && node.isConnected && doc.location.pathname === pagePath;
        const title = readLibraryTitle(doc);
        void nativeRefresh.prepare(route, { active: active2 }).catch((error) => debugError("native library preparation unavailable", error));
        try {
          const result = await libraryApi.add(route, { confirm: (message) => window.confirm(message), active: active2 });
          if (!active2()) return;
          if (!result.cancelled) {
            added = true;
            refreshing = route.name === "title";
            label.textContent = "Updating library…";
            syncVisibility();
            void notifySuccess(`You added ${title} to your library.`, active2, {
              undo: result.undoable ? () => undo(result.body) : void 0
            });
            try {
              await nativeRefresh.refresh(route, { active: active2 });
            } catch (error) {
              debugError("native library refresh unavailable", error);
            }
            return;
          }
        } catch (error) {
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not add to library. Check your toolkit sign-in and try again." : error.message;
        } finally {
          if (active2() && operation === operationId) {
            busy = false;
            refreshing = false;
            syncVisibility();
            button2.disabled = false;
            label.textContent = "Add to library";
          }
        }
      }
      async function undo(body) {
        if (undoing || !body) return false;
        if (!isSignedIn()) {
          status.textContent = "Sign in to Trakt through the toolkit menu first.";
          return false;
        }
        undoing = true;
        busy = false;
        const epoch = session;
        const operationId = ++operation;
        button2.disabled = true;
        label.textContent = "Undoing…";
        status.textContent = "";
        const active2 = () => !destroyed && epoch === session && node.isConnected && doc.location.pathname === pagePath;
        try {
          await libraryApi.remove(body, { active: active2 });
          if (!active2()) return false;
          added = false;
          refreshing = false;
          syncVisibility();
          await nativeRefresh.refresh(route, { active: active2 });
          return true;
        } catch (error) {
          debugError("library undo failed", error);
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not undo. Check your toolkit sign-in and try again." : error.message;
          return false;
        } finally {
          if (active2() && operation === operationId) {
            undoing = false;
            busy = false;
            refreshing = false;
            syncVisibility();
            button2.disabled = false;
            label.textContent = "Add to library";
          }
        }
      }
      function authChanged() {
        session++;
        operation++;
        nativeRefresh.destroy();
        busy = false;
        undoing = false;
        refreshing = false;
        button2.disabled = false;
        added = false;
        wasCollected = false;
        label.textContent = "Add to library";
        status.textContent = "";
        syncVisibility();
      }
      button2.addEventListener("click", add);
      document.addEventListener("ogt:authchange", authChanged);
      const history2 = anchor.querySelector(".stacked");
      if (history2) history2.after(node);
      else anchor.append(node);
      const observer = new MutationObserver(syncVisibility);
      observer.observe(anchor, { childList: true, subtree: true, characterData: true });
      syncVisibility();
      return { node, destroy() {
        destroyed = true;
        nativeRefresh.destroy();
        observer.disconnect();
        button2.removeEventListener("click", add);
        document.removeEventListener("ogt:authchange", authChanged);
        node.remove();
      } };
    }
  };

  // src/features/watchlist/data.js
  function watchlistLookup(route) {
    if (!route?.id) return null;
    const id = encodeURIComponent(route.id);
    if (route.kind === "movie" && route.name === "title") return { type: "movies", path: `/movies/${id}` };
    if (route.kind !== "show") return null;
    if (route.name === "title") return { type: "shows", path: `/shows/${id}` };
    if (!Number.isSafeInteger(route.season) || route.season < 0) return null;
    if (route.name === "season") return { type: "seasons", path: `/shows/${id}/seasons`, season: route.season };
    if (route.name === "episode" && Number.isSafeInteger(route.episode) && route.episode > 0) {
      return { type: "episodes", path: `/shows/${id}/seasons/${route.season}/episodes/${route.episode}` };
    }
    return null;
  }
  function watchlistBody(lookup, data) {
    const item = lookup?.type === "seasons" ? Array.isArray(data) ? data.find((season) => season?.number === lookup.season) : null : data;
    const id = item?.ids?.trakt;
    if (!lookup || !Number.isSafeInteger(id) || id <= 0) throw new Error("Could not identify this title.");
    return { [lookup.type]: [{ ids: { trakt: id } }] };
  }
  function readWatchlisted(anchor) {
    return [...anchor.querySelectorAll(".summary-action")].some((action) => /^listed on$/i.test(action.querySelector(".title")?.textContent.trim() ?? "") && /^watchlist(?:\s*\+|$)/i.test(action.querySelector(".detail")?.textContent.trim() ?? ""));
  }
  function readCardRoute(card) {
    const link = card.querySelector("a.poster[href], a.image-link[href]");
    if (!link) return null;
    try {
      const url = new URL(link.getAttribute("href"), card.ownerDocument.location.href);
      if (url.origin !== card.ownerDocument.location.origin) return null;
      const route = parseRoute(url.pathname);
      return route.name === "title" && watchlistLookup(route) ? route : null;
    } catch {
      return null;
    }
  }
  function readCreditRoute(row) {
    return row?.matches?.("article.credit-row") ? readCardRoute(row) : null;
  }
  function readCreditControl(row) {
    return row?.querySelector?.(".quick-icons .list-control.card, .quick-icons button.action.list") ?? null;
  }
  function readCardWatchlisted(control) {
    const trigger = control.matches("button") ? control : control.querySelector("button.trigger");
    const ids = trigger?.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    return ids.some((id) => [...control.ownerDocument.getElementById(id)?.querySelectorAll(".listed-tip a[href]") ?? []].some((link) => {
      try {
        const url = new URL(link.getAttribute("href"), control.ownerDocument.location.href);
        return url.origin === control.ownerDocument.location.origin && /^\/users\/[^/]+\/watchlist\/?$/.test(url.pathname);
      } catch {
        return false;
      }
    }));
  }

  // src/features/watchlist/api.js
  function createWatchlistApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn } = {}) {
    return {
      async add(route, { active: active2 = () => true } = {}) {
        if (!signedIn()) throw new Error("Sign in through the toolkit menu first.");
        const lookup = watchlistLookup(route);
        if (!lookup) throw new Error("Unsupported watchlist page.");
        if (!active2()) return { cancelled: true };
        const data = await get(lookup.path);
        const body = watchlistBody(lookup, data);
        const item = lookup.type === "seasons" ? data.find((season) => season?.number === lookup.season) : data;
        const title = typeof item?.title === "string" && item.title.trim() ? item.title.trim() : lookup.type === "seasons" ? `Season ${lookup.season}` : "this title";
        if (!active2() || !signedIn()) return { cancelled: true };
        const result = await auth("POST", "/sync/watchlist", body);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find this title.");
        }
        const counts = [result?.added?.[lookup.type], result?.existing?.[lookup.type]];
        if (!counts.some((count2) => Number.isSafeInteger(count2) && count2 > 0)) {
          throw new Error("Trakt did not confirm a watchlist addition.");
        }
        return { cancelled: false, title, body, undoable: Number.isSafeInteger(result?.added?.[lookup.type]) && result.added[lookup.type] > 0 };
      },
      /** Undo an addition with the exact body that was sent. */
      async remove(body, { active: active2 = () => true } = {}) {
        if (!signedIn()) throw new Error("Sign in through the toolkit menu first.");
        if (!body || typeof body !== "object" || !active2()) return { cancelled: true };
        const result = await auth("POST", "/sync/watchlist/remove", body);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find this title.");
        }
        return { cancelled: false };
      }
    };
  }
  var watchlistApi = createWatchlistApi();

  // src/features/watchlist/styles.js
  var css = actionButtonCss("ogt-watchlist", "var(--brand-secondary, light-dark(#2474ae, #59a9e2))");

  // src/features/watchlist/icon.js
  function watchlistIcon() {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [name, value] of Object.entries({ viewBox: "0 0 24 28", fill: "none", stroke: "currentColor", "stroke-width": "1", "aria-hidden": "true" })) {
      svg3.setAttribute(name, value);
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5 2h14v24l-7-5-7 5Z");
    svg3.append(path);
    return svg3;
  }

  // src/features/watchlist/native-refresh.js
  function createNativeWatchlistRefresh() {
    const pending = /* @__PURE__ */ new Set();
    return {
      refresh(control, route, { active: active2 = () => true, timeout = 1e4 } = {}) {
        if (route.name !== "title" || !["movie", "show"].includes(route.kind) || !control?.isConnected || !active2()) {
          return Promise.resolve(false);
        }
        const doc = control.ownerDocument;
        if (!doc.querySelector("header.top-nav .profile")) return Promise.resolve(false);
        const trigger = control.querySelector('button[aria-controls][aria-keyshortcuts~="ArrowDown"]');
        const picker = doc.getElementById(trigger?.getAttribute("aria-controls"));
        if (!trigger || trigger.disabled || trigger.getAttribute("aria-busy") === "true" || trigger.getAttribute("aria-expanded") === "true" || !picker?.matches(".picker[popover]")) {
          return Promise.resolve(false);
        }
        const view = doc.defaultView;
        return new Promise((resolve) => {
          let settled = false, began = false;
          const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            observer.disconnect();
            picker.removeEventListener("beforetoggle", beforeToggle);
            doc.removeEventListener("ogt:authchange", cancel);
            view.removeEventListener("popstate", cancel);
            pending.delete(cancel);
            resolve(result && active2() && control.isConnected);
          };
          const cancel = () => finish(false);
          const timer = setTimeout(cancel, timeout);
          const beforeToggle = (event) => {
            if (event.newState !== "open") return;
            event.preventDefault();
            finish(event.defaultPrevented);
          };
          const observer = new view.MutationObserver((records) => {
            if (!active2() || !control.isConnected) {
              finish(false);
              return;
            }
            const busy = trigger.disabled || trigger.getAttribute("aria-busy") === "true";
            const wasBusy = records.some((record) => record.target === trigger && (record.attributeName === "disabled" && record.oldValue !== null || record.attributeName === "aria-busy" && record.oldValue === "true"));
            if (busy) began = true;
            else if (began || wasBusy) finish(false);
          });
          pending.add(cancel);
          picker.addEventListener("beforetoggle", beforeToggle);
          doc.addEventListener("ogt:authchange", cancel);
          view.addEventListener("popstate", cancel);
          observer.observe(control, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ["disabled", "aria-busy"] });
          trigger.dispatchEvent(new view.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
        });
      },
      destroy() {
        for (const cancel of [...pending]) cancel();
      }
    };
  }

  // src/features/watchlist/notification.js
  function notifyWatchlistAdded({ title = "this title", active: active2 = () => true, onUndo } = {}) {
    return notifySuccess(`You added ${title} to your watchlist.`, active2, { undo: onUndo });
  }

  // src/features/watchlist/index.js
  var ID3 = "ogt-watchlist";
  var watchlist = {
    id: "watchlist",
    css,
    match: (route) => Boolean(watchlistLookup(route)),
    mount(route) {
      const anchor = findActionStack();
      if (!anchor || document.getElementById(ID3)) return null;
      let destroyed = false;
      let busy = false;
      let undoing = false;
      let session = 0;
      let operation = 0;
      let added = false;
      let wasWatchlisted = false;
      const nativeRefresh = createNativeWatchlistRefresh();
      const pagePath = location.pathname;
      const label = el("span", { class: "ogt-watchlist__title", text: "Add to watchlist" });
      const glyph = el("span", { class: "ogt-watchlist__glyph", "aria-hidden": "true" });
      glyph.append(watchlistIcon());
      const button2 = el("button", {
        type: "button",
        class: "ogt-watchlist__button",
        title: "Add using the toolkit’s Trakt account"
      });
      button2.append(glyph, el("span", { class: "ogt-watchlist__text" }, label));
      const status = el("p", { class: "ogt-watchlist__status", role: "status", "aria-live": "polite" });
      const node = el("div", { id: ID3, class: "ogt-watchlist" }, button2, status);
      function syncVisibility() {
        const watchlisted = readWatchlisted(anchor);
        if (wasWatchlisted && !watchlisted) added = false;
        wasWatchlisted = watchlisted;
        node.hidden = added || watchlisted;
      }
      async function add() {
        if (busy || undoing || node.hidden) return;
        if (!isSignedIn()) {
          status.textContent = "Sign in to Trakt through the toolkit menu first.";
          return;
        }
        busy = true;
        const epoch = session;
        const operationId = ++operation;
        button2.disabled = true;
        label.textContent = "Adding to watchlist…";
        status.textContent = "";
        const active2 = () => !destroyed && epoch === session && location.pathname === pagePath;
        try {
          const result = await watchlistApi.add(route, { active: active2 });
          if (!active2()) return;
          if (!result.cancelled) {
            added = true;
            syncVisibility();
            void notifyWatchlistAdded({
              title: result.title,
              active: active2,
              onUndo: result.undoable ? () => undo(result.body) : void 0
            });
            await nativeRefresh.refresh(anchor.querySelector(".list-control.summary"), route, { active: active2 });
            return;
          }
        } catch (error) {
          debugError("watchlist addition failed", error);
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not add to watchlist. Check your toolkit sign-in and try again." : error.message;
        } finally {
          if (active2() && operation === operationId) {
            busy = false;
            button2.disabled = false;
            label.textContent = "Add to watchlist";
          }
        }
      }
      async function undo(body) {
        if (undoing || !body) return false;
        if (!isSignedIn()) {
          status.textContent = "Sign in to Trakt through the toolkit menu first.";
          return false;
        }
        undoing = true;
        busy = false;
        const epoch = session;
        const operationId = ++operation;
        button2.disabled = true;
        label.textContent = "Undoing…";
        status.textContent = "";
        const active2 = () => !destroyed && epoch === session && location.pathname === pagePath;
        try {
          await watchlistApi.remove(body, { active: active2 });
          if (!active2()) return false;
          added = false;
          syncVisibility();
          await nativeRefresh.refresh(anchor.querySelector(".list-control.summary"), route, { active: active2 });
          return true;
        } catch (error) {
          debugError("watchlist undo failed", error);
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not undo. Check your toolkit sign-in and try again." : error.message;
          return false;
        } finally {
          if (active2() && operation === operationId) {
            undoing = false;
            busy = false;
            button2.disabled = false;
            label.textContent = "Add to watchlist";
          }
        }
      }
      function authChanged() {
        session++;
        operation++;
        nativeRefresh.destroy();
        busy = false;
        undoing = false;
        button2.disabled = false;
        added = false;
        wasWatchlisted = false;
        label.textContent = "Add to watchlist";
        status.textContent = "";
        syncVisibility();
      }
      button2.addEventListener("click", add);
      document.addEventListener("ogt:authchange", authChanged);
      const history2 = anchor.querySelector(".stacked");
      if (history2) history2.after(node);
      else anchor.append(node);
      const observer = new MutationObserver(syncVisibility);
      observer.observe(anchor, { childList: true, subtree: true, characterData: true });
      syncVisibility();
      return { node, destroy() {
        destroyed = true;
        nativeRefresh.destroy();
        observer.disconnect();
        button2.removeEventListener("click", add);
        document.removeEventListener("ogt:authchange", authChanged);
        node.remove();
      } };
    }
  };

  // src/features/watchlist/cards.js
  var ID4 = "ogt-watchlist-cards";
  var CARD = ".poster-card, .fanart-card";
  var CONTROL = ".quick-icons .list-control.card, .quick-icons button.action.list";
  var watchlistCards = {
    id: "watchlist-cards",
    match: () => true,
    css: `
    .ogt-watchlist-card { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 40px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-card[hidden] { display: none !important; }
    /* On a 1x desktop display, this is the troublesome 150–170% page-zoom band.
       Resolution includes display scaling; it is not a universal browser zoom API. */
    @media (1.5dppx <= resolution < 1.8dppx) {
      .poster-card .ogt-watchlist-card { display: none !important; }
    }
    .ogt-watchlist-card svg { width: 20px; height: 24px; stroke-linejoin: round; }
    .quick-icons.small .ogt-watchlist-card { block-size: calc(var(--bar, 35px) - 1px); }
    .quick-icons.small .ogt-watchlist-card svg { width: 16px; height: 20px; }
    .ogt-watchlist-card:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-card:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-card:disabled { opacity: .6; cursor: default; }
  `,
    mount() {
      if (!document.body || document.getElementById(ID4)) return null;
      const node = el("span", { id: ID4, hidden: true });
      document.body.append(node);
      const entries = /* @__PURE__ */ new Map();
      const states = /* @__PURE__ */ new Map();
      const nativeRefresh = createNativeWatchlistRefresh();
      let destroyed = false, session = 0, scheduled = false;
      function stateFor(key) {
        if (!states.has(key)) states.set(key, {
          busy: false,
          undoing: false,
          operation: 0,
          added: false,
          wasWatchlisted: false
        });
        return states.get(key);
      }
      function remove(entry) {
        entry.button.removeEventListener("click", entry.click);
        entry.button.remove();
        entries.delete(entry.control);
      }
      function updateButton(entry, state) {
        entry.button.hidden = state.added || state.wasWatchlisted;
        entry.button.disabled = state.busy || state.undoing;
        const busy = String(state.busy || state.undoing);
        if (entry.button.getAttribute("aria-busy") !== busy) entry.button.setAttribute("aria-busy", busy);
      }
      async function add(entry, event) {
        event.preventDefault();
        event.stopPropagation();
        const state = stateFor(entry.key);
        if (state.busy || state.undoing || entry.button.hidden) return;
        if (!isSignedIn()) {
          toast("Sign in to Trakt through the toolkit menu first.");
          return;
        }
        const epoch = session;
        const operation = ++state.operation;
        const pagePath = location.pathname;
        const active2 = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some((e) => e.key === entry.key && e.control.isConnected && readCardRoute(e.card)?.key === entry.key);
        state.busy = true;
        scan();
        try {
          const result = await watchlistApi.add(entry.route, { active: active2 });
          if (!active2() || result.cancelled) return;
          state.added = true;
          scan();
          void notifyWatchlistAdded({
            title: result.title,
            active: active2,
            onUndo: result.undoable ? () => undo(entry, result.body) : void 0
          });
          await nativeRefresh.refresh(entry.control, entry.route, { active: active2 });
        } catch (error) {
          debugError("card watchlist addition failed", error);
          if (active2()) toast(error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not add to watchlist. Check your toolkit sign-in and try again." : error.message);
        } finally {
          if (!destroyed && epoch === session && state.operation === operation) {
            state.busy = false;
            scan();
          }
        }
      }
      async function undo(entry, body) {
        const state = stateFor(entry.key);
        if (state.undoing || !body) return false;
        if (!isSignedIn()) {
          toast("Sign in to Trakt through the toolkit menu first.");
          return false;
        }
        const epoch = session;
        const operation = ++state.operation;
        const pagePath = location.pathname;
        const active2 = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some((e) => e.key === entry.key && e.control.isConnected && readCardRoute(e.card)?.key === entry.key);
        state.undoing = true;
        state.busy = false;
        scan();
        try {
          await watchlistApi.remove(body, { active: active2 });
          if (!active2()) return false;
          state.added = false;
          scan();
          await nativeRefresh.refresh(entry.control, entry.route, { active: active2 });
          return true;
        } catch (error) {
          debugError("card watchlist undo failed", error);
          if (active2()) toast(error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not undo. Check your toolkit sign-in and try again." : error.message);
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
          if (!entry.control.isConnected || !entry.button.isConnected || readCardRoute(entry.card)?.key !== entry.key) remove(entry);
        }
        for (const control of document.querySelectorAll(CONTROL)) {
          if (entries.has(control)) continue;
          const card = control.closest(CARD);
          const route = card && readCardRoute(card);
          if (!route) continue;
          const button2 = el("button", {
            type: "button",
            class: "ogt-watchlist-card",
            "aria-label": "Add to watchlist",
            title: "Add to watchlist using the toolkit’s Trakt account"
          }, watchlistIcon());
          const entry = { control, card, route, key: route.key, button: button2 };
          entry.click = (event) => add(entry, event);
          button2.addEventListener("click", entry.click);
          control.after(button2);
          entries.set(control, entry);
        }
        const native = /* @__PURE__ */ new Map();
        for (const entry of entries.values()) {
          native.set(entry.key, Boolean(native.get(entry.key) || readCardWatchlisted(entry.control)));
        }
        for (const [key, watchlisted] of native) {
          const state = stateFor(key);
          if (state.wasWatchlisted && !watchlisted) state.added = false;
          state.wasWatchlisted = watchlisted;
        }
        for (const entry of entries.values()) updateButton(entry, stateFor(entry.key));
      }
      function schedule() {
        if (scheduled || destroyed) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          scan();
        });
      }
      function authChanged() {
        session++;
        nativeRefresh.destroy();
        states.clear();
        scan();
      }
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["href", "aria-describedby"]
      });
      document.addEventListener("ogt:authchange", authChanged);
      scan();
      return { node, destroy() {
        destroyed = true;
        nativeRefresh.destroy();
        observer.disconnect();
        document.removeEventListener("ogt:authchange", authChanged);
        for (const entry of entries.values()) remove(entry);
        states.clear();
        node.remove();
      } };
    }
  };

  // src/features/watchlist/credits.js
  var ID5 = "ogt-watchlist-credits";
  var ROW = "article.credit-row";
  var watchlistCredits = {
    id: "watchlist-credits",
    match: (route) => route?.name === "person",
    css: `
    .ogt-watchlist-credit { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 32px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-credit[hidden] { display: none !important; }
    .ogt-watchlist-credit svg { width: 16px; height: 20px; stroke-linejoin: round; }
    .ogt-watchlist-credit:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-credit:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-credit:disabled { opacity: .6; cursor: default; }
  `,
    mount() {
      if (!document.body || document.getElementById(ID5)) return null;
      const node = el("span", { id: ID5, hidden: true });
      document.body.append(node);
      const entries = /* @__PURE__ */ new Map();
      const states = /* @__PURE__ */ new Map();
      const nativeRefresh = createNativeWatchlistRefresh();
      let destroyed = false, session = 0, scheduled = false;
      function stateFor(key) {
        if (!states.has(key)) states.set(key, {
          busy: false,
          undoing: false,
          operation: 0,
          added: false,
          wasWatchlisted: false
        });
        return states.get(key);
      }
      function remove(entry) {
        entry.button.removeEventListener("click", entry.click);
        entry.button.remove();
        entries.delete(entry.control);
      }
      function updateButton(entry, state) {
        entry.button.hidden = state.added || state.wasWatchlisted;
        entry.button.disabled = state.busy || state.undoing;
        const busy = String(state.busy || state.undoing);
        if (entry.button.getAttribute("aria-busy") !== busy) entry.button.setAttribute("aria-busy", busy);
      }
      async function add(entry, event) {
        event.preventDefault();
        event.stopPropagation();
        const state = stateFor(entry.key);
        if (state.busy || state.undoing || entry.button.hidden) return;
        if (!isSignedIn()) {
          toast("Sign in to Trakt through the toolkit menu first.");
          return;
        }
        const epoch = session;
        const operation = ++state.operation;
        const pagePath = location.pathname;
        const active2 = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some((e) => e.key === entry.key && e.control.isConnected && readCreditRoute(e.row)?.key === entry.key);
        state.busy = true;
        scan();
        try {
          const result = await watchlistApi.add(entry.route, { active: active2 });
          if (!active2() || result.cancelled) return;
          state.added = true;
          scan();
          void notifyWatchlistAdded({
            title: result.title,
            active: active2,
            onUndo: result.undoable ? () => undo(entry, result.body) : void 0
          });
          await nativeRefresh.refresh(entry.control, entry.route, { active: active2 });
        } catch (error) {
          debugError("credit watchlist addition failed", error);
          if (active2()) toast(error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not add to watchlist. Check your toolkit sign-in and try again." : error.message);
        } finally {
          if (!destroyed && epoch === session && state.operation === operation) {
            state.busy = false;
            scan();
          }
        }
      }
      async function undo(entry, body) {
        const state = stateFor(entry.key);
        if (state.undoing || !body) return false;
        if (!isSignedIn()) {
          toast("Sign in to Trakt through the toolkit menu first.");
          return false;
        }
        const epoch = session;
        const operation = ++state.operation;
        const pagePath = location.pathname;
        const active2 = () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some((e) => e.key === entry.key && e.control.isConnected && readCreditRoute(e.row)?.key === entry.key);
        state.undoing = true;
        state.busy = false;
        scan();
        try {
          await watchlistApi.remove(body, { active: active2 });
          if (!active2()) return false;
          state.added = false;
          scan();
          await nativeRefresh.refresh(entry.control, entry.route, { active: active2 });
          return true;
        } catch (error) {
          debugError("credit watchlist undo failed", error);
          if (active2()) toast(error.status === 429 ? "Trakt rate limited this request; try again later." : error.status ? "Could not undo. Check your toolkit sign-in and try again." : error.message);
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
          if (!entry.control.isConnected || !entry.button.isConnected || readCreditRoute(entry.row)?.key !== entry.key) remove(entry);
        }
        for (const row of document.querySelectorAll(ROW)) {
          const control = readCreditControl(row);
          const route = readCreditRoute(row);
          if (!control || !route || entries.has(control)) continue;
          const button2 = el("button", {
            type: "button",
            class: "ogt-watchlist-credit",
            "aria-label": "Add to watchlist",
            title: "Add to watchlist using the toolkit’s Trakt account"
          }, watchlistIcon());
          const entry = { row, control, route, key: route.key, button: button2 };
          entry.click = (event) => add(entry, event);
          button2.addEventListener("click", entry.click);
          control.after(button2);
          entries.set(control, entry);
        }
        const native = /* @__PURE__ */ new Map();
        for (const entry of entries.values()) {
          native.set(entry.key, Boolean(native.get(entry.key) || readCardWatchlisted(entry.control)));
        }
        for (const [key, watchlisted] of native) {
          const state = stateFor(key);
          if (state.wasWatchlisted && !watchlisted) state.added = false;
          state.wasWatchlisted = watchlisted;
        }
        for (const entry of entries.values()) updateButton(entry, stateFor(entry.key));
      }
      function schedule() {
        if (scheduled || destroyed) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          scan();
        });
      }
      function authChanged() {
        session++;
        nativeRefresh.destroy();
        states.clear();
        scan();
      }
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["href", "aria-describedby"]
      });
      document.addEventListener("ogt:authchange", authChanged);
      scan();
      return { node, destroy() {
        destroyed = true;
        nativeRefresh.destroy();
        observer.disconnect();
        document.removeEventListener("ogt:authchange", authChanged);
        for (const entry of entries.values()) remove(entry);
        states.clear();
        node.remove();
      } };
    }
  };

  // src/actions.js
  var PLACEHOLDER_HELP = "Placeholders: {title} {year} {tmdb} {imdb} {type} {season} {episode} {id} {plural}";
  function promptAddCustomLink() {
    const answer = window.prompt(
      `Add a custom link as "Label | URL".

${PLACEHOLDER_HELP}`,
      "My service | https://example.com/watch/{tmdb}?s={season}&e={episode}"
    );
    if (!answer) return null;
    const separator = answer.indexOf("|");
    if (separator < 0) {
      toast('Use "Label | URL" — the | separator is missing.');
      return null;
    }
    const label = answer.slice(0, separator).trim();
    const url = answer.slice(separator + 1).trim();
    if (!label || !url) {
      toast("Both a label and a URL are required.");
      return null;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast("The URL must start with http:// or https://.");
      return null;
    }
    addCustomLink({ label, url });
    toast(`Link "${label}" added.`);
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
    return { label, url };
  }
  function promptRemoveCustomLink() {
    const links = getCustomLinks();
    if (!links.length) {
      toast("No custom links to remove.");
      return;
    }
    const answer = window.prompt(
      `Type the label of the link to remove:

${links.map((entry) => `• ${entry.label}`).join("\n")}`,
      links[0].label
    );
    if (!answer) return;
    const next = removeCustomLink(answer.trim());
    if (next.length === links.length) toast(`No link labelled "${answer.trim()}".`);
    else toast("Link removed.");
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
  }
  function promptClientId() {
    const answer = window.prompt(
      "Paste your Trakt API client ID.\n\nCreate a free app at https://app.trakt.tv/settings/apps — the redirect URI can be anything, since this script only calls public endpoints.\n\nCurrent: " + (getClientId() || "(none)"),
      getClientId()
    );
    if (answer === null) return;
    const clean = setClientId(answer);
    toast(clean ? "Client ID saved." : "Client ID cleared.");
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
  }

  // src/oauth-menu.js
  var CODE_TOAST_MS = 10 * 60 * 1e3;
  var QUIET = /* @__PURE__ */ new Set([DEVICE_MESSAGES[400], DEVICE_MESSAGES[429]]);
  function copyText(text2) {
    if (typeof GM_setClipboard !== "function") return false;
    try {
      GM_setClipboard(text2, "text");
      return true;
    } catch {
      return false;
    }
  }
  function openTab(url) {
    if (typeof GM_openInTab !== "function") return false;
    try {
      GM_openInTab(url, { active: true, insert: true });
      return true;
    } catch {
      return false;
    }
  }
  function registerAuthMenu() {
    GM_registerMenuCommand("Trakt OG Toolkit: sign in", async () => {
      if (!getClientId()) {
        toast("Set your Trakt client ID first.");
        return;
      }
      if (isSignedIn()) {
        toast("Already signed in; sign out before changing accounts.");
        return;
      }
      const uri = window.prompt(
        "Enter the redirect URI registered for your Trakt app (used for token refresh).",
        getPrivateValue(STORAGE.redirectUri) || "http://localhost:5173/callback"
      );
      if (uri === null) return;
      if (!uri.trim()) {
        toast("Enter the redirect URI registered for your Trakt app.");
        return;
      }
      try {
        setPrivateValue(STORAGE.redirectUri, uri.trim());
        await signIn({
          // A long toast instead of a native prompt, so the page keeps working while polling.
          // The next sign-in message (signed in, cancelled, expired, …) replaces it.
          onCode: ({ user_code, verification_url }) => {
            const copied = copyText(user_code);
            const opened = openTab(verification_url);
            toast(
              `${copied ? `Code ${user_code} copied; paste it` : `Enter ${user_code}`} at ${verification_url}${opened ? " (opened in a new tab)" : ""}, then come back. Use "cancel sign-in" in the menu to stop.`,
              { duration: CODE_TOAST_MS }
            );
          },
          // Pending and slow-down are expected while waiting; keep the code on screen.
          onMessage: (message) => {
            if (!QUIET.has(message)) toast(message);
          }
        });
      } catch {
        toast("Sign-in requires userscript GM storage.");
      }
    });
    GM_registerMenuCommand("Trakt OG Toolkit: cancel sign-in", cancelSignIn);
    GM_registerMenuCommand("Trakt OG Toolkit: sign out", async () => {
      try {
        await signOut();
        toast("Signed out of Trakt.");
      } catch {
        toast("Signed out locally; revoke this app in Trakt settings if needed.");
      }
    });
    GM_registerMenuCommand("Trakt OG Toolkit: show signed-in user", async () => {
      if (!isSignedIn()) {
        toast("Signed out of Trakt.");
        return;
      }
      try {
        const user = await apiAuth("GET", "/users/me");
        toast(`Signed in to Trakt as ${user.username || "a Trakt user"}.`);
      } catch {
        toast(isSignedIn() ? "Could not load your Trakt profile." : "Trakt session expired; sign in again.");
      }
    });
  }

  // src/menu.js
  var ATTRIBUTION = `${NAME} uses Trakt but is not endorsed or certified by Trakt.`;
  var FEATURE_LABELS = {
    "custom-links": "Custom links",
    "season-chart": "Season chart",
    "your-ratings": "Your ratings",
    playback: "Paused playback",
    pronunciation: "Name pronunciation",
    library: "Add to library",
    watchlist: "Add to watchlist",
    "watchlist-cards": "Watchlist card shortcuts",
    "watchlist-credits": "Watchlist credit shortcuts",
    "month-review": "Last month in review",
    "all-lists": "All lists"
  };
  function registerMenu(getRouteKey = () => location.pathname, features = []) {
    if (typeof GM_registerMenuCommand !== "function") return;
    GM_registerMenuCommand("Trakt OG Toolkit: about", () => {
      toast(`${NAME} v${VERSION}`, { duration: 5e3 });
      console.info(`[OGT] ${NAME} v${VERSION}
${ATTRIBUTION}
MIT licensed.`);
    });
    GM_registerMenuCommand("Trakt OG Toolkit: set API client ID", promptClientId);
    GM_registerMenuCommand("Trakt OG Toolkit: test API connection", async () => {
      if (!getClientId()) {
        toast('No client ID yet — use "set API client ID" first.');
        return;
      }
      toast("Testing the Trakt API…", { duration: 1500 });
      try {
        const ms = await ping();
        toast(`Trakt API OK — ${ms} ms.`);
        console.info(`[OGT] Trakt API OK in ${ms} ms`);
      } catch (error) {
        const reason = error?.status === 401 || error?.status === 403 ? "the client ID was rejected" : error?.status ? `HTTP ${error.status}` : error?.message || "network error";
        toast(`Trakt API failed — ${reason}.`);
        console.warn("[OGT] Trakt API failed", error);
      }
    });
    registerAuthMenu();
    GM_registerMenuCommand("Trakt OG Toolkit: add custom link", promptAddCustomLink);
    GM_registerMenuCommand("Trakt OG Toolkit: remove custom link", promptRemoveCustomLink);
    GM_registerMenuCommand("Trakt OG Toolkit: toggle debug logging", () => {
      const next = setDebug(!isDebug());
      applyDebugSetting();
      toast(next ? "Debug logging on — check the console." : "Debug logging off.");
    });
    GM_registerMenuCommand("Trakt OG Toolkit: diagnostics", () => {
      const summary2 = `v${VERSION} · ${getRouteKey()} · client ID ${getClientId() ? "set" : "missing"} · ${getCustomLinks().length} custom links · ${cacheSize()} cached responses`;
      toast(summary2);
      console.info("[OGT]", summary2);
    });
    GM_registerMenuCommand("Trakt OG Toolkit: clear API cache", () => {
      clearCache();
      toast("API cache cleared.");
    });
    for (const feature of features) {
      const label = FEATURE_LABELS[feature.id] || feature.id.replace(/-/g, " ");
      GM_registerMenuCommand(`Trakt OG Toolkit: toggle ${label}`, () => {
        const enabled = setFeatureEnabled(feature.id, !isFeatureEnabled(feature.id));
        toast(`${label} ${enabled ? "on" : "off"}.`);
        document.dispatchEvent(new CustomEvent("ogt:featurechange", { detail: { id: feature.id, enabled } }));
      });
    }
  }

  // src/main.js
  var FEATURES = [customLinks, seasonChart, yourRatings, playback, pronunciation, library, watchlist, watchlistCards, watchlistCredits, monthReview, allLists];
  function isSvelteKit() {
    return Boolean(
      document.body?.hasAttribute("data-sveltekit-preload-data") || document.body?.hasAttribute("data-sveltekit-preload-code") || Object.keys(window).some((key) => key.startsWith("__sveltekit_"))
    );
  }
  function start() {
    const moduleWatch = watchModuleResources();
    applyDebugSetting();
    let route = parseRoute();
    let host = null;
    let canMount = false;
    const sync = () => {
      if (canMount && host) host(route);
    };
    document.addEventListener("ogt:authchange", sync);
    document.addEventListener("ogt:featurechange", sync);
    const openGate = () => {
      if (canMount) return;
      canMount = true;
      rememberNativeResources(moduleWatch.entries.keys());
      moduleWatch.stop();
      injectStyles([successNotificationCss, ...FEATURES.map((feature) => feature.css).filter(Boolean)]);
      host = createFeatureHost(FEATURES, { isEnabled: isFeatureEnabled });
      createRouter({
        onRoute(next) {
          route = next;
          sync();
        },
        // Every settled DOM change: re-mounts anything the app re-rendered away.
        onSettle: sync
      });
      sync();
    };
    const scheduleMount = () => {
      if (!isSvelteKit()) {
        openGate();
        return;
      }
      const startGate = () => waitForPageReady({
        earlyEntries: moduleWatch.entries,
        onReady(reason) {
          info(`initial mount after hydration (${reason})`);
          openGate();
        },
        onTimeout(reason) {
          warn(`hydration wait: ${reason}; mounting anyway`);
          openGate();
        }
      });
      if (document.readyState === "complete") startGate();
      else window.addEventListener("load", startGate, { once: true });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleMount, { once: true });
    } else {
      scheduleMount();
    }
    registerMenu(() => route.key, FEATURES);
    window.__OGT__ = {
      version: VERSION,
      route: () => parseRoute(),
      cacheSize
    };
    info(`v${VERSION} loaded on ${location.host}`);
  }
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
      document.removeEventListener("DOMContentLoaded", run);
    };
    const observer = new MutationObserver(() => {
      if (document.head) run();
    });
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", run, { once: true });
  }
  whenHeadReady(start);
})();
