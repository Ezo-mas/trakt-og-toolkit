/** User settings and small per-title memories, all backed by GM storage. */
import { DEFAULT_CLIENT_ID } from './config.js';
import { getValue, setValue, removeValue, STORAGE } from './core/store.js';
import { isVerbose, setVerbose } from './core/log.js';

export function getClientId() {
  const stored = getValue(STORAGE.clientId, '');
  return (stored || DEFAULT_CLIENT_ID || '').trim();
}

export function setClientId(value) {
  const clean = String(value || '').trim();
  if (clean) setValue(STORAGE.clientId, clean);
  else removeValue(STORAGE.clientId);
  return clean;
}

export function hasClientId() {
  return getClientId().length > 0;
}

export const SERVER_KEYS = ['jellyfin', 'emby', 'radarr', 'sonarr', 'seerr'];

/** True only for templates that begin with one of the configured server keys. */
export function isServerTemplateUrl(value) {
  const match = String(value || '').trim().match(/^\{([a-z][a-z0-9_-]*)\}\//);
  return Boolean(match && SERVER_KEYS.includes(match[1]));
}

/** Custom links may be ordinary HTTP(S) URLs or server-template URLs. */
export function isCustomLinkUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) || isServerTemplateUrl(url);
}

/**
 * Server base URLs are stored with a scheme and without a trailing slash. A bare host gets
 * `http://` because these services usually live on a LAN; users can paste `https://` for a
 * reverse proxy. Paths are kept so a Jellyfin/Emby base URL such as `/jellyfin` still works.
 * Unsupported schemes, credentials, query strings and fragments are rejected rather than
 * silently dropped.
 */
export function normalizeServerUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  // A bare host:port also matches the scheme shape, so only treat the leading `name:` as a
  // scheme when it is not followed by a port number. Other schemes (mailto:, file:, ftp:)
  // must be rejected, not reinterpreted as an HTTP host.
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme) {
    const rest = raw.slice(scheme[0].length);
    const bareHostPort = /^\d+(?:[/?#]|$)/.test(rest);
    if (!bareHostPort && !/^https?:\/\//i.test(raw)) return null;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/i.test(url.protocol) || !url.hostname) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function getServers() {
  const stored = getValue(STORAGE.servers, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const servers = {};
  for (const key of SERVER_KEYS) {
    const value = normalizeServerUrl(stored[key]);
    if (value) servers[key] = value;
  }
  return servers;
}

/** Save only recognised, valid server URLs; clear the storage key when none remain. */
export function setServers(values) {
  const servers = {};
  if (values && typeof values === 'object') {
    for (const key of SERVER_KEYS) {
      const value = normalizeServerUrl(values[key]);
      if (value) servers[key] = value;
    }
  }
  if (Object.keys(servers).length) setValue(STORAGE.servers, servers);
  else removeValue(STORAGE.servers);
  return servers;
}

export function getCustomLinks() {
  const stored = getValue(STORAGE.customLinks, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((entry) => entry && typeof entry.label === 'string' && typeof entry.url === 'string')
    .map((entry) => ({ label: entry.label, url: entry.url }));
}

export function setCustomLinks(links) {
  setValue(STORAGE.customLinks, Array.isArray(links) ? links : []);
}

export function addCustomLink(link) {
  const links = getCustomLinks();
  const clean = { label: String(link.label || '').trim(), url: String(link.url || '').trim() };
  if (!clean.label || !clean.url) return links;
  const withoutDuplicate = links.filter((entry) => entry.label.toLowerCase() !== clean.label.toLowerCase());
  const next = [...withoutDuplicate, clean];
  setCustomLinks(next);
  return next;
}

export function removeCustomLink(label) {
  const next = getCustomLinks().filter((entry) => entry.label.toLowerCase() !== String(label).toLowerCase());
  setCustomLinks(next);
  return next;
}

/** Last season/episode a user picked for a show, so the panel reopens where they left off. */
export function getSelection(kind, id) {
  const stored = getValue(STORAGE.selection(kind, id), null);
  if (!stored || typeof stored !== 'object') return null;
  return { season: Number(stored.season) || null, episode: Number(stored.episode) || null };
}

export function setSelection(kind, id, { season, episode }) {
  setValue(STORAGE.selection(kind, id), { season, episode });
}

export function isDebug() {
  return Boolean(getValue(STORAGE.debug, false));
}

export function setDebug(value) {
  setValue(STORAGE.debug, Boolean(value));
  setVerbose(Boolean(value));
  return Boolean(value);
}

export function applyDebugSetting() {
  setVerbose(isDebug());
  return isVerbose();
}

/** New features are enabled unless their id is explicitly stored as disabled. */
export function getDisabledFeatures() {
  const stored = getValue(STORAGE.features, []);
  if (!Array.isArray(stored)) return [];
  return [...new Set(stored.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
}

export function isFeatureEnabled(id) {
  return !getDisabledFeatures().includes(String(id));
}

/** Returns the feature's state after saving. */
export function setFeatureEnabled(id, enabled) {
  const featureId = String(id || '').trim();
  if (!featureId) return true;
  const disabled = new Set(getDisabledFeatures());
  if (enabled) disabled.delete(featureId);
  else disabled.add(featureId);
  setValue(STORAGE.features, [...disabled]);
  return !disabled.has(featureId);
}
