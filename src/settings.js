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
