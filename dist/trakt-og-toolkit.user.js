// ==UserScript==
// @name         Trakt OG Toolkit
// @namespace    https://github.com/trakt-og-toolkit
// @version      0.1.0
// @description  Watch links, trailers and (soon) ratings helpers for og.trakt.tv.
// @author       Trakt OG Toolkit contributors
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
// @connect      www.youtube-nocookie.com
// @noframes
// ==/UserScript==

(() => {
  // src/meta.js
  var NAME = "Trakt OG Toolkit";
  var VERSION = "0.1.0";

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

.ogt-chip--primary {
  border-color: var(--ogt-accent);
  background: var(--ogt-accent);
  color: #fff;
}

.ogt-chip--primary:hover,
.ogt-chip--primary:focus-visible {
  background: light-dark(#c61017, #ff3b42);
  color: #fff;
}

.ogt-chip[data-ogt-missing] {
  display: none;
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

.ogt-hint {
  margin: 0;
  color: var(--ogt-muted);
  font-size: 12px;
}

.ogt-hint button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ogt-accent);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
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

.ogt-modal {
  position: fixed;
  inset: 0;
  z-index: 2147483002;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(0 0 0 / 82%);
}

.ogt-modal__box {
  position: relative;
  inline-size: min(100%, 1100px);
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: #000;
  box-shadow: 0 12px 48px rgb(0 0 0 / 55%);
  overflow: hidden;
}

.ogt-modal__box iframe {
  inline-size: 100%;
  block-size: 100%;
  border: 0;
}

.ogt-modal__close {
  position: absolute;
  inset-block-start: -40px;
  inset-inline-end: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: 4px;
  background: rgb(255 255 255 / 14%);
  color: #fff;
  font: 500 13px/1 system-ui, sans-serif;
  cursor: pointer;
}

.ogt-modal__close:hover,
.ogt-modal__close:focus-visible {
  background: rgb(255 255 255 / 26%);
  outline: 2px solid #fff;
}

@media (max-width: 768px) {
  .ogt-panel {
    margin: 16px 0;
    padding: 14px;
  }

  .ogt-modal__box {
    aspect-ratio: auto;
    block-size: min(70vh, 420px);
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
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    if (typeof GM_addStyle === "function") {
      try {
        GM_addStyle(CSS);
        return;
      } catch {
      }
    }
    const style = el("style", { id: STYLE_ID, text: CSS });
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
  function showModal({ label, content, onClose }) {
    const previouslyFocused = document.activeElement;
    const box = el("div", { class: "ogt-modal__box", role: "dialog", "aria-modal": "true", "aria-label": label }, content);
    const close = el("button", { class: "ogt-modal__close", type: "button", text: "Close" });
    box.append(close);
    const root = el("div", { class: "ogt-modal" }, box);
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        teardown();
      }
    };
    function teardown() {
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      onClose?.();
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
    }
    root.addEventListener("mousedown", (event) => {
      if (event.target === root) teardown();
    });
    close.addEventListener("click", teardown);
    document.addEventListener("keydown", onKey, true);
    document.body.append(root);
    close.focus({ preventScroll: true });
    return teardown;
  }
  function showTrailer({ key, title }) {
    if (!key) return null;
    const frame = el("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0`,
      title: title || "Trailer",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowfullscreen: true
    });
    return showModal({ label: title || "Trailer", content: frame });
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
  function youtubeId(url) {
    const match = String(url || "").match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return match ? match[1] : null;
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
  var DEFAULT_LINKS = [
    {
      id: "tmdb",
      label: "TMDb",
      url: "https://www.themoviedb.org/{type}/{tmdb}",
      needs: "tmdb"
    },
    {
      id: "imdb",
      label: "IMDb",
      url: "https://www.imdb.com/title/{imdb}/",
      needs: "imdb"
    },
    {
      id: "justwatch",
      label: "JustWatch",
      url: "https://www.justwatch.com/us/search?q={title}",
      needs: "title"
    },
    {
      id: "trakt",
      label: "Trakt",
      url: "https://trakt.tv/{plural}/{id}",
      needs: "id"
    }
  ];

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
  async function getTrailer(kind, id) {
    const plural = kind === "show" ? "shows" : "movies";
    const videos = await apiGet(`/${plural}/${encodeURIComponent(id)}/videos`);
    if (!Array.isArray(videos)) return null;
    const youtube = videos.filter((video) => String(video.site).toLowerCase() === "youtube" && youtubeId(video.url));
    const pick = youtube.find((v) => /trailer/i.test(v.type) && v.official) || youtube.find((v) => /trailer/i.test(v.type)) || youtube[0];
    if (!pick) return null;
    return { key: youtubeId(pick.url), title: pick.title || "Trailer" };
  }
  async function getSeasons(id) {
    const seasons = await apiGet(`/shows/${encodeURIComponent(id)}/seasons`);
    if (!Array.isArray(seasons)) return [];
    return seasons.filter((season) => Number.isInteger(season.number)).map((season) => ({
      number: season.number,
      episodes: Number.isInteger(season.aired_episodes) ? season.aired_episodes : null
    })).sort((a, b) => a.number - b.number);
  }
  function isAuthError(error) {
    return error instanceof MissingClientIdError || error instanceof HttpError && error.status === 401;
  }

  // src/actions.js
  var PLACEHOLDER_HELP = "Placeholders: {title} {year} {tmdb} {imdb} {type} {season} {episode} {id}";
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

  // src/features/watch-now/data.js
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

  // src/features/watch-now/index.js
  var PANEL_ID = "ogt-watch-now";
  var TITLE_ID = "ogt-watch-now-title";
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
  function chip({ label, href, template, primary = false }) {
    const link = el("a", {
      class: primary ? "ogt-chip ogt-chip--primary" : "ogt-chip",
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
        el("h2", { class: "ogt-title", id: TITLE_ID, text: "Watch & links" }),
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
      for (const entry of DEFAULT_LINKS) {
        if (entry.needs && (values[entry.needs] === void 0 || values[entry.needs] === null || values[entry.needs] === "")) continue;
        if (missingPlaceholders(entry.url, values).length) continue;
        linksRow.append(
          chip({
            label: entry.label,
            href: fillTemplate(entry.url, values),
            template: entry.url,
            primary: entry.id === "justwatch"
          })
        );
      }
      for (const entry of getCustomLinks()) {
        if (!/^https?:\/\//i.test(entry.url)) continue;
        if (missingPlaceholders(entry.url, values).length) continue;
        linksRow.append(chip({ label: entry.label, href: fillTemplate(entry.url, values), template: entry.url }));
      }
      const add = el("button", { class: "ogt-chip", type: "button", text: "+ Add link" });
      add.addEventListener("click", () => promptAddCustomLink());
      linksRow.append(add);
    }
    function persistSelection() {
      if (selection.season != null) setSelection(meta.kind, meta.id, selection);
    }
    const seasonSelect = el("select", { class: "ogt-select", "aria-label": "Season" });
    const episodeSlot = el("span", { class: "ogt-episode" });
    const seasonField = el("label", { class: "ogt-field" }, "Season", seasonSelect);
    const episodeField = el("label", { class: "ogt-field" }, "Episode", episodeSlot);
    const trailerButton = el("button", { class: "ogt-chip", type: "button", text: "Watch trailer" });
    trailerButton.addEventListener("click", () => openTrailer(trailerButton));
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
      controlsRow.replaceChildren(seasonField, episodeField, trailerButton);
      controlsBuilt = true;
    }
    function renderEpisodeField() {
      const season = seasons.find((entry) => entry.number === selection.season);
      const count = season?.episodes || null;
      if (selection.episode == null || count && selection.episode > count) selection.episode = 1;
      if (count) {
        const select = el(
          "select",
          { class: "ogt-select", "aria-label": "Episode" },
          Array.from(
            { length: count },
            (_, index) => el("option", {
              value: String(index + 1),
              text: `Episode ${index + 1}`,
              selected: index + 1 === selection.episode
            })
          )
        );
        select.addEventListener("change", () => {
          selection.episode = Number(select.value) || 1;
          persistSelection();
          updateLinkHrefs();
        });
        episodeSlot.replaceChildren(select);
        return;
      }
      const input = el("input", {
        class: "ogt-select",
        type: "number",
        min: "1",
        value: String(selection.episode || 1),
        "aria-label": "Episode",
        style: "inline-size: 5.5rem"
      });
      input.addEventListener("change", () => {
        selection.episode = Math.max(1, Number(input.value) || 1);
        persistSelection();
        updateLinkHrefs();
      });
      episodeSlot.replaceChildren(input);
    }
    function renderControls() {
      ensureControls();
      const hasSeasons = meta.kind === "show" && seasons.length > 0;
      seasonField.hidden = !hasSeasons;
      episodeField.hidden = !hasSeasons;
      controlsRow.hidden = false;
      if (!hasSeasons) return;
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
    async function openTrailer(button) {
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Loading…";
      try {
        if (!getClientId()) {
          const entered = window.prompt(
            "Trailers use the free Trakt API and need a client ID.\n\nCreate an app at https://app.trakt.tv/settings/apps (any redirect URI), then paste its Client ID here.",
            ""
          );
          if (!entered) return;
          setClientId(entered);
        }
        const trailer = await getTrailer(meta.kind, meta.id);
        if (cancelled) return;
        if (!trailer) {
          toast("No trailer found for this title.");
          return;
        }
        showTrailer(trailer);
      } catch (error) {
        if (cancelled) return;
        if (isAuthError(error)) toast("Trakt rejected that client ID. Set a valid one from the userscript menu.");
        else toast("Could not load the trailer.");
        debugError("trailer failed", error);
      } finally {
        if (!cancelled && button.isConnected) {
          button.disabled = false;
          button.textContent = label;
        }
      }
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
        seasons = list;
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
    }
    renderLinks();
    renderControls();
    loadSeasons();
    document.addEventListener("ogt:refresh", onRefresh);
    return {
      node,
      destroy() {
        cancelled = true;
        for (const timer of timers) clearTimeout(timer);
        document.removeEventListener("ogt:refresh", onRefresh);
        node.remove();
      }
    };
  }
  var watchNow = {
    id: "watch-now",
    match: (route) => route.name === "title",
    mount(route) {
      if (document.getElementById(PANEL_ID)) return null;
      const point = findMountPoint();
      if (!point) return null;
      const meta = readTitleData(document, route);
      if (!meta.title && !meta.tmdb && !meta.imdb) return null;
      const panel = createPanel(meta);
      if (point.before) point.parent.insertBefore(panel.node, point.before);
      else point.parent.append(panel.node);
      return panel;
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
    GM_registerMenuCommand("Trakt OG Toolkit: add custom link", promptAddCustomLink);
    GM_registerMenuCommand("Trakt OG Toolkit: remove custom link", promptRemoveCustomLink);
    GM_registerMenuCommand("Trakt OG Toolkit: toggle debug logging", () => {
      const next = setDebug(!isDebug());
      applyDebugSetting();
      toast(next ? "Debug logging on — check the console." : "Debug logging off.");
    });
    GM_registerMenuCommand("Trakt OG Toolkit: diagnostics", () => {
      const summary = `v${VERSION} · ${getRouteKey()} · client ID ${getClientId() ? "set" : "missing"} · ${getCustomLinks().length} custom links · ${cacheSize()} cached responses`;
      toast(summary);
      console.info("[OGT]", summary);
    });
    GM_registerMenuCommand("Trakt OG Toolkit: clear API cache", () => {
      clearCache();
      toast("API cache cleared.");
    });
  }

  // src/main.js
  var FEATURES = [watchNow];
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
      }
    });
    registerMenu(() => route.key);
    window.__OGT__ = {
      version: VERSION,
      route: () => parseRoute(),
      cacheSize
    };
    info(`v${VERSION} loaded on ${location.host}`);
  }
  start();
})();
