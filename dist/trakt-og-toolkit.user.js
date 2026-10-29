// ==UserScript==
// @name         Trakt OG Toolkit
// @namespace    https://github.com/trakt-og-toolkit
// @version      0.1.4
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
// @connect      api.trakt.tv
// @noframes
// ==/UserScript==

(() => {
  // src/meta.js
  var NAME = "Trakt OG Toolkit";
  var VERSION = "0.1.4";

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
    const css = [CSS, ...extra].join("\n");
    if (typeof GM_addStyle === "function") {
      try {
        GM_addStyle(css);
        return;
      } catch {
      }
    }
    const style = el("style", { id: STYLE_ID, text: css });
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
        name = "seasons";
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
  function createFeatureHost(features) {
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
    clientId: "trakt.clientId",
    customLinks: "watch.customLinks",
    debug: "debug",
    selection: (kind, id) => `selection.${kind}.${id}`
  };

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

  // src/features/custom-links/data.js
  var TMDB_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/;
  var IMDB_RE = /imdb\.com\/title\/(tt\d+)/;
  var SEASON_HREF_RE = /\/seasons\/(\d+)(?:\/|$)/;
  function readTitleData(doc, route) {
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
  function readSeasons(doc) {
    const found = /* @__PURE__ */ new Map();
    for (const subtitle of doc.querySelectorAll('a[href*="/seasons/"] span.subtitle')) {
      const link = subtitle.closest("a");
      const match = link?.getAttribute("href")?.match(SEASON_HREF_RE);
      if (!match) continue;
      const number = Number(match[1]);
      const count = Number(text(subtitle).match(/(\d+)/)?.[1]) || null;
      const existing = found.get(number);
      if (!existing || count && (!existing.episodes || count > existing.episodes)) {
        found.set(number, { number, episodes: count });
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
  function rawRequest({ method = "GET", url, headers = {}, body = null, timeout = DEFAULT_TIMEOUT }) {
    const gmRequest = typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest : null;
    if (!gmRequest) {
      return fetch(url, { method, headers, body }).then(async (response) => ({
        status: response.status,
        headers: response.headers,
        text: await response.text()
      }));
    }
    return new Promise((resolve, reject) => {
      gmRequest({
        method,
        url,
        headers,
        data: body,
        timeout,
        onload: (response) => resolve({ status: response.status, headers: response.responseHeaders, text: response.responseText }),
        onerror: () => reject(new HttpError(`Network error for ${url}`, 0, null)),
        ontimeout: () => reject(new HttpError(`Timed out for ${url}`, 0, null)),
        onabort: () => reject(new HttpError(`Aborted ${url}`, 0, null))
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
        if (!retryable || attempt >= MAX_RETRIES) return response;
        const retryAfter = Number(headerValue(response.headers, "retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1e3, 1e4) : 1e3 * (attempt + 1);
        attempt += 1;
        await sleep(delay);
      }
    } finally {
      release();
    }
  }
  function headerValue(headers, name) {
    if (!headers) return null;
    if (typeof headers.get === "function") return headers.get(name);
    const line = String(headers).split(/\r?\n/).find((row) => row.toLowerCase().startsWith(`${name}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : null;
  }
  var cache = /* @__PURE__ */ new Map();
  async function getJSON(url, { headers = {}, ttl = 0 } = {}) {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expires > now) return hit.value;
    const response = await request({ url, headers, method: "GET" });
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
  function createPanel(meta) {
    let cancelled = false;
    let seasons = [];
    const timers = [];
    let selection = getSelection(meta.kind, meta.id) || { season: null, episode: null };
    const linksRow = el("div", { class: "ogt-row" });
    const controlsRow = el("div", { class: "ogt-row", hidden: true });
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
      controlsRow
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
      const add = el("button", { class: "ogt-chip", type: "button", text: "+ Add link" });
      add.addEventListener("click", () => promptAddCustomLink());
      linksRow.append(add);
    }
    function needsSelection() {
      return getCustomLinks().some((entry) => /\{(?:season|episode)\}/.test(entry.url));
    }
    function persistSelection() {
      if (selection.season != null) setSelection(meta.kind, meta.id, selection);
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
      const count = season?.episodes || null;
      if (!count || count < 1) {
        episodeSlot.replaceChildren(el("span", { text: "—" }));
        selection.episode = null;
        return;
      }
      if (selection.episode == null || selection.episode > count) selection.episode = 1;
      if (count > 8) {
        const input = el("input", {
          class: "ogt-input",
          type: "number",
          min: "1",
          max: String(count),
          value: String(selection.episode),
          "aria-label": "Episode"
        });
        input.addEventListener("change", () => {
          const value = Number(input.value);
          if (Number.isInteger(value) && value >= 1 && value <= count) {
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
      for (let i = 1; i <= count; i++) {
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
      const hasSeasons = meta.kind === "show" && seasons.length > 0 && needsSelection();
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
      if (meta.kind !== "show") return;
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
      const panel = createPanel(meta);
      mount.parent.insertBefore(panel.node, mount.before);
      return panel;
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
  function percent(value) {
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
        rating: percent(text(row.querySelector(".rating-trigger .value"))),
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
  function chartGeometry(episodes, allEpisodes = episodes, average = averageRating(episodes)) {
    const rated = ratedEpisodes(episodes);
    const allNumbers = allEpisodes.map((episode) => episode.number).filter(Number.isFinite);
    const first = allNumbers.length ? Math.min(...allNumbers) : 1;
    const last = allNumbers.length ? Math.max(...allNumbers) : first;
    const bottom = axisBottom(rated);
    const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
    const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
    const x = (number) => PLOT.left + (last === first ? plotWidth / 2 : (number - first) / (last - first) * plotWidth);
    const y = (rating) => PLOT.top + (100 - rating) / (100 - bottom) * plotHeight;
    return {
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      plot: PLOT,
      axisBottom: bottom,
      ticks: Array.from({ length: (100 - bottom) / 10 + 1 }, (_, i) => bottom + i * 10),
      points: rated.map((episode) => ({ episode, x: x(episode.number), y: y(episode.rating) })),
      averageY: average == null ? null : y(average)
    };
  }

  // src/features/season-chart/api.js
  async function getSeasonEpisodes(id, season) {
    const episodes = await apiGet(
      `/shows/${encodeURIComponent(id)}/seasons/${encodeURIComponent(season)}?extended=full`
    );
    return Array.isArray(episodes) ? episodes : [];
  }

  // src/features/season-chart/styles.js
  var CSS2 = String.raw`
.ogt-season-chart__summary {
  margin: 0 0 8px;
  color: var(--ogt-fg);
}

.ogt-season-chart__svg {
  display: block;
  inline-size: 100%;
  max-inline-size: 720px;
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

.ogt-season-chart__line {
  fill: none;
  stroke: var(--brand-primary, #ed1c24);
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-width: 2.5;
}

.ogt-season-chart__point {
  fill: var(--brand-primary, #ed1c24);
  stroke: var(--brand-primary, #ed1c24);
  stroke-width: 2;
}

.ogt-season-chart__point--low-votes {
  fill: var(--ogt-surface);
}

.ogt-season-chart a:focus-visible {
  outline: none;
}

.ogt-season-chart a:focus-visible .ogt-season-chart__point {
  stroke: light-dark(#111111, #ffffff);
  stroke-width: 4;
}
`;

  // src/features/season-chart/index.js
  var PANEL_ID2 = "ogt-season-chart";
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attributes = {}, content = "") {
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
  function drawChart(chart, episodes, average) {
    const geometry = chartGeometry(episodes, episodes, average);
    const { width, height, plot, ticks, points, averageY } = geometry;
    chart.replaceChildren();
    chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    for (const tick of ticks) {
      const y = plot.top + (100 - tick) / (100 - geometry.axisBottom) * (height - plot.top - plot.bottom);
      chart.append(
        svg("line", {
          class: "ogt-season-chart__gridline",
          x1: plot.left,
          x2: width - plot.right,
          y1: y,
          y2: y
        }),
        svg("text", { class: "ogt-season-chart__axis", x: plot.left - 7, y: y + 4, "text-anchor": "end" }, `${tick}%`)
      );
    }
    if (averageY != null) {
      chart.append(
        svg("line", {
          class: "ogt-season-chart__average",
          x1: plot.left,
          x2: width - plot.right,
          y1: averageY,
          y2: averageY
        })
      );
    }
    if (points.length > 1) {
      chart.append(
        svg("polyline", {
          class: "ogt-season-chart__line",
          points: points.map(({ x, y }) => `${x},${y}`).join(" ")
        })
      );
    }
    for (const { episode, x, y } of points) {
      const label = `${episodeName(episode)}, ${voteLabel(episode.votes)}`;
      const link = svg("a", { href: episode.href || "#", tabindex: "0", "aria-label": label });
      const dot = svg("circle", {
        class: `ogt-season-chart__point${episode.votes != null && episode.votes < 10 ? " ogt-season-chart__point--low-votes" : ""}`,
        cx: x,
        cy: y,
        r: 5
      });
      link.append(svg("title", {}, label), dot);
      chart.append(link, svg("text", { class: "ogt-season-chart__episode-number", x, y: height - 7 }, String(episode.number)));
    }
  }
  function createPanel2(episodes) {
    let cancelled = false;
    let currentEpisodes = episodes;
    const headingId = `${PANEL_ID2}-title`;
    const summaryLine = el("p", { class: "ogt-season-chart__summary" });
    const chart = svg("svg", {
      class: "ogt-season-chart__svg",
      role: "group",
      "aria-label": "Episode ratings by episode number"
    });
    const node = el(
      "section",
      { class: "ogt-panel ogt-season-chart", id: PANEL_ID2, "aria-labelledby": headingId },
      el("div", { class: "ogt-head" }, el("h2", { class: "ogt-title", id: headingId, text: "Episode ratings" })),
      summaryLine,
      chart
    );
    function render(nextEpisodes) {
      if (cancelled) return;
      currentEpisodes = nextEpisodes;
      const rated = ratedEpisodes(currentEpisodes);
      const average = averageRating(currentEpisodes);
      node.hidden = rated.length < 2;
      summaryLine.textContent = summary(currentEpisodes, average);
      drawChart(chart, currentEpisodes, average);
    }
    render(currentEpisodes);
    return {
      node,
      render,
      destroy() {
        cancelled = true;
        node.remove();
      }
    };
  }
  var seasonChart = {
    id: "season-chart",
    css: CSS2,
    match(route) {
      return route.kind === "show" && route.name === "season";
    },
    mount(route) {
      if (document.getElementById(PANEL_ID2)) return null;
      const episodesSection = document.querySelector("section.episodes");
      if (!episodesSection) return null;
      const fallback = readSeasonEpisodes(document);
      const panel = createPanel2(fallback);
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

  // src/menu.js
  var ATTRIBUTION = `${NAME} uses Trakt but is not endorsed or certified by Trakt.`;
  function registerMenu(getRouteKey = () => location.pathname) {
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
  }

  // src/main.js
  var FEATURES = [customLinks, seasonChart];
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
    const openGate = () => {
      if (canMount) return;
      canMount = true;
      moduleWatch.stop();
      injectStyles(FEATURES.map((feature) => feature.css).filter(Boolean));
      host = createFeatureHost(FEATURES);
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
    registerMenu(() => route.key);
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
