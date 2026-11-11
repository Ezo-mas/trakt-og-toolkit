// ==UserScript==
// @name         Trakt OG Toolkit
// @namespace    https://github.com/trakt-og-toolkit
// @version      0.4.0
// @description  Brings back the useful classic-Trakt extras on og.trakt.tv.
// @author       Ezo-mas
// @license      MIT
// @homepageURL  https://github.com/Ezo-mas/trakt-og-toolkit
// @supportURL   https://github.com/Ezo-mas/trakt-og-toolkit/issues
// @updateURL    https://raw.githubusercontent.com/Ezo-mas/trakt-og-toolkit/main/dist/trakt-og-toolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/Ezo-mas/trakt-og-toolkit/main/dist/trakt-og-toolkit.user.js
// @match        https://og.trakt.tv/*
// @match        http://localhost:5173/*
// @match        http://localhost:5174/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      api.trakt.tv
// @connect      auth.trakt.tv
// @connect      forvo.com
// @connect      query.wikidata.org
// @noframes
// ==/UserScript==

(() => {
  // src/meta.js
  var NAME = "Trakt OG Toolkit";
  var VERSION = "0.4.0";

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

.ogt-server-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
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

/* Compact link strip below the summary poster; the same node moves into OG's phone tools under 768px. */
.ogt-visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.ogt-links-compact {
  /* Flat like OG's own sidebar groups, not a boxed panel. */
  margin: 10px 0 12px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: 12px;
}

.ogt-links-head {
  display: grid;
  gap: 7px;
}

/* Grouped strip: full-row services, then the same 4-column logo grid as og's ul.external-links, then text links. */
.ogt-links,
.ogt-links-services {
  display: grid;
  gap: 6px;
}

.ogt-links-logos {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.ogt-links-texts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.ogt-links-texts .ogt-service-link--text {
  grid-column: auto;
}

.ogt-links .ogt-hint {
  grid-column: 1 / -1;
  padding: 2px 0;
  font-size: 11px;
}

.ogt-service-link {
  --ogt-tile-bg: rgba(255, 255, 255, 0.05);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-inline-size: 0;
  block-size: 100%;
  min-block-size: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--ogt-tile-bg);
  color: light-dark(#444, #d9d9d9);
  text-decoration: none;
  transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease;
}

.ogt-service-link--icon {
  aspect-ratio: 1;
}

/* OG's sidebar is ~170px wide: a service tile takes the whole row so its name fits beside the logo. */
.ogt-service-link--tile {
  grid-column: 1 / -1;
  justify-content: flex-start;
  padding: 6px 10px;
}

.ogt-service-link--text {
  grid-column: span 2;
  justify-content: center;
  padding: 4px 6px;
  text-align: center;
}

.ogt-service-link--text .ogt-service-label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 11px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.ogt-service-link--tile {
  background: color-mix(in srgb, var(--ogt-brand-tile, #888) 14%, var(--ogt-tile-bg));
}

/* og colours any focused link red and underlines it (a:is(:hover, :focus), 0-1-1), so a clicked tile kept that until
   focus moved. Restate the resting colour for :focus; the hover rule below has the same weight and wins. */
.ogt-service-link:focus {
  color: light-dark(#444, #d9d9d9);
  text-decoration: none;
}

.ogt-service-link:hover,
.ogt-service-link:focus-visible {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  color: light-dark(#111, #fff);
  text-decoration: none;
}

.ogt-service-link:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 2px;
}

.ogt-service-label {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ogt-service-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 22px;
  block-size: 22px;
  color: inherit;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.ogt-service-icon svg {
  inline-size: 100%;
  block-size: 100%;
}

/* Square reference tiles are monochrome like OG's own until hovered; wide service tiles keep their brand colour. */
.ogt-service-link--icon:hover .ogt-service-icon,
.ogt-service-link--icon:focus-visible .ogt-service-icon,
.ogt-service-link--tile .ogt-service-icon,
.ogt-watch-now-card .ogt-service-icon {
  color: var(--ogt-brand, currentColor);
}

.ogt-service-icon[data-ogt-mark="text"] {
  inline-size: auto;
  min-inline-size: 22px;
  padding-inline: 2px;
}

.ogt-service-link::after {
  content: attr(data-ogt-tooltip);
  position: absolute;
  z-index: 10;
  inset-block-start: 50%;
  inset-inline-start: calc(100% + 7px);
  transform: translateY(-50%);
  padding: 3px 7px;
  border-radius: 3px;
  background: light-dark(#222, #f2f2f2);
  color: light-dark(#fff, #111);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 100ms ease;
}

.ogt-service-link:hover::after,
.ogt-service-link:focus-visible::after {
  opacity: 1;
}

.ogt-links-manage {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-block-start: 10px;
}

/* Square glass actions like og's sidebar tiles, not pills. */
.ogt-manage-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-inline-size: 0;
  block-size: 48px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: light-dark(#444, #d9d9d9);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease;
}

.ogt-manage-button svg {
  inline-size: 16px;
  block-size: 16px;
}

.ogt-manage-button:hover,
.ogt-manage-button:focus-visible {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  color: light-dark(#111, #fff);
}

.ogt-manage-button:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 2px;
}

/* Season/episode pickers look like og's own dropdown triggers ("Sort: Released"). */
.ogt-links-compact .ogt-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-block-start: 10px;
}

.ogt-links-compact .ogt-fields[hidden] {
  display: none;
}

.ogt-links-compact .ogt-field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-inline-size: 0;
  block-size: 34px;
  padding: 0 8px 0 10px;
  border: 1px solid light-dark(#d4d4d4, #3b3b3b);
  border-radius: 8px;
  background: light-dark(#f2f2f2, #232323);
  color: var(--ogt-muted);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.ogt-links-compact .ogt-field:focus-within {
  border-color: light-dark(#999, #5a5a5a);
}

.ogt-links-compact .ogt-episode {
  display: flex;
  flex: 1;
  align-items: center;
  min-inline-size: 0;
  line-height: 1;
}

.ogt-links-compact .ogt-select,
.ogt-links-compact .ogt-input {
  flex: 1;
  min-inline-size: 0;
  padding: 0 14px 0 0;
  border: 0;
  background-color: transparent;
  background-position: calc(100% - 5px) 50%, calc(100% - 1px) 50%;
  color: var(--ogt-fg);
  font-size: 13px;
  font-weight: 500;
}

.ogt-links-compact .ogt-field-prefix {
  flex: none;
  margin-inline-end: 4px;
  color: var(--ogt-muted);
  font-size: 12px;
}

.ogt-links-compact input.ogt-input {
  padding-inline-end: 0;
  background-image: none;
}

.ogt-links-compact .ogt-select:focus-visible,
.ogt-links-compact .ogt-input:focus-visible {
  outline: none;
}

.ogt-links-compact .ogt-field:has(:focus-visible) {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 1px;
}

.ogt-watch-fallback {
  display: grid;
  gap: 6px;
  margin-block-start: 10px;
  padding-block-start: 10px;
  border-block-start: 1px solid var(--ogt-border);
}

.ogt-watch-fallback[hidden] {
  display: none;
}

.ogt-watch-fallback-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}

.ogt-watch-fallback-title {
  color: var(--ogt-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ogt-watch-fallback-note {
  color: var(--ogt-muted);
  font-size: 10px;
}

.ogt-watch-now-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

/* Shaped like OG's Watch Now provider tiles: a 2:1 logo card with a note below. */
.ogt-watch-now-link {
  display: grid;
  gap: 5px;
  min-inline-size: 0;
  color: var(--ogt-fg, #e6e6e6);
  text-decoration: none;
}

.ogt-watch-now-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-inline-size: 0;
  block-size: 56px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ogt-brand-tile, #888) 22%, #151515);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.15;
  transition: border-color 120ms ease, transform 120ms ease;
}

.ogt-watch-now-card .ogt-service-icon {
  inline-size: 24px;
  block-size: 24px;
  font-size: 10px;
}

.ogt-watch-now-card .ogt-service-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}

.ogt-watch-now-note {
  color: var(--ogt-muted, #9a9a9a);
  font-size: 12px;
  line-height: 15px;
}

.ogt-watch-now-link:focus,
.ogt-watch-now-link:hover,
.ogt-watch-now-link:focus-visible {
  color: var(--ogt-fg, #e6e6e6);
  text-decoration: none;
}

.ogt-watch-now-link:hover .ogt-watch-now-card,
.ogt-watch-now-link:focus-visible .ogt-watch-now-card {
  border-color: rgba(255, 255, 255, 0.35);
}

.ogt-watch-now-link:focus-visible {
  outline: 2px solid var(--ogt-accent, #ed1c24);
  outline-offset: 2px;
  border-radius: 6px;
}

.ogt-service-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ogt-watch-now-section {
  display: grid;
  gap: 8px;
}

.ogt-watch-now-section .section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  color: var(--color-watch-now-section, var(--ogt-muted));
  font-size: var(--font-size-watch-now-section, 11px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ogt-watch-now-section .count {
  color: var(--color-watch-now-section, var(--ogt-muted));
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
}

.ogt-watch-now-section .ogt-watch-now-tiles {
  /* OG's provider tiles: 118px columns, 16px/14px gaps, a 118x56 logo card. */
  grid-template-columns: repeat(auto-fill, 118px);
  gap: 16px 14px;
}

/* Management forms live in a modal so the narrow sidebar never squeezes them. */
.ogt-manager {
  --ogt-fg: light-dark(#333, #e6e6e6);
  --ogt-muted: light-dark(#767676, #9a9a9a);
  --ogt-surface: light-dark(#ffffff, #262626);
  --ogt-raised: light-dark(#f5f5f5, #2f2f2f);
  --ogt-border: light-dark(#e2e2e2, #3c3c3c);
  --ogt-accent: var(--brand-primary, #ed1c24);
  box-sizing: border-box;
  inline-size: min(680px, calc(100vw - 24px));
  max-inline-size: calc(100vw - 24px);
  max-block-size: calc(100dvh - 24px);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ogt-fg);
  font-family: inherit;
  font-size: 13px;
}

.ogt-manager[open] {
  display: block;
}

.ogt-manager::backdrop {
  background: rgb(0 0 0 / 0.65);
}

.ogt-manager-panel {
  display: flex;
  flex-direction: column;
  max-block-size: calc(100dvh - 24px);
  border: 1px solid var(--ogt-border);
  border-radius: 8px;
  background: var(--ogt-surface);
  box-shadow: 0 12px 48px rgb(0 0 0 / 0.45);
  overflow: hidden;
}

.ogt-manager-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-block-end: 1px solid var(--ogt-border);
  background: var(--ogt-raised);
}

.ogt-manager-title {
  margin: 0;
  color: var(--ogt-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ogt-manager-close {
  min-block-size: 28px;
  padding: 3px 9px;
  border: 1px solid var(--ogt-border);
  border-radius: 4px;
  background: var(--ogt-surface);
  color: var(--ogt-fg);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.ogt-manager-close:hover,
.ogt-manager-close:focus-visible {
  border-color: var(--ogt-accent);
  color: var(--ogt-accent);
}

.ogt-manager-close:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 1px;
}

.ogt-manager-body {
  padding: 14px 16px 16px;
  overflow: auto;
}

.ogt-manager .ogt-editor-list-wrap,
.ogt-manager .ogt-preset-list-wrap {
  max-block-size: min(50vh, 380px);
}

.ogt-manager [hidden] {
  display: none !important;
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

  .ogt-server-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .ogt-manager {
    inline-size: calc(100vw - 16px);
    max-inline-size: calc(100vw - 16px);
  }

  .ogt-service-link::after {
    inset-block-start: auto;
    inset-block-end: calc(100% + 4px);
    inset-inline-start: auto;
    inset-inline-end: 0;
    transform: none;
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
  function headingTitle(heading) {
    if (!heading) return "";
    for (const hidden of heading.querySelectorAll(".visually-hidden")) {
      if (hidden.closest('.year, .certification, .tooltip, [role="tooltip"]')) continue;
      const title = text(hidden);
      if (title) return title;
    }
    return [...heading.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(" ").replace(/\s+/g, " ").trim();
  }

  // src/ui/shell.js
  var STYLE_ID = "ogt-styles";
  function injectStyles(extra = []) {
    if (document.getElementById(STYLE_ID)) return;
    const css3 = [CSS, ...extra].join("\n");
    if (typeof GM_addStyle === "function") {
      try {
        GM_addStyle(css3);
        return;
      } catch {
      }
    }
    const style = el("style", { id: STYLE_ID, text: css3 });
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

  // src/ui/dialog.js
  var counter = 0;
  var CLOSE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function supported() {
    return Boolean(document.body) && typeof document.createElement("dialog").showModal === "function";
  }
  function open(options) {
    if (options.signal?.aborted) return Promise.resolve(options.kind === "prompt" ? null : false);
    const id = `ogt-dialog-${++counter}`;
    const prompt = options.kind === "prompt";
    const message = el("p", { class: "ogt-dialog__message", id: `${id}-message`, text: options.message });
    const error = el("p", { class: "ogt-dialog__error", id: `${id}-error`, role: "alert", hidden: true });
    const input = prompt ? el("input", {
      class: "ogt-dialog__input",
      type: "text",
      id: `${id}-input`,
      autocomplete: "off",
      spellcheck: "false",
      placeholder: options.placeholder,
      inputmode: options.inputMode,
      "aria-describedby": `${id}-message ${id}-error`
    }) : null;
    if (input) input.value = options.value ?? "";
    const ok = el("button", { type: "submit", class: "ogt-dialog__ok", text: options.ok });
    const cancel = el("button", { type: "button", class: "ogt-dialog__cancel", text: options.cancel });
    const close = el("button", { type: "button", class: "ogt-dialog__close", "aria-label": "Close" });
    close.innerHTML = CLOSE_ICON;
    const form = el(
      "form",
      { class: "ogt-dialog__form", novalidate: true },
      el(
        "div",
        { class: "ogt-dialog__body" },
        message,
        input && el("label", { class: "ogt-dialog__label", for: input.id, text: options.label ?? "Value" }),
        input,
        error
      ),
      el("footer", { class: "ogt-dialog__footer" }, cancel, ok)
    );
    const dialog = el(
      "dialog",
      {
        class: "ogt-dialog",
        "aria-labelledby": `${id}-title`,
        "aria-describedby": `${id}-message`,
        dataset: { kind: options.kind }
      },
      el(
        "div",
        { class: "ogt-dialog__panel" },
        el("h2", { class: "ogt-dialog__title", id: `${id}-title`, text: options.title }),
        form,
        close
      )
    );
    return new Promise((resolve) => {
      let result = prompt ? null : false;
      let finished = false;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        result = value;
        if (dialog.open) dialog.close();
        else done();
      };
      const done = () => {
        options.signal?.removeEventListener("abort", abort);
        dialog.remove();
        resolve(result);
      };
      const abort = () => finish(prompt ? null : false);
      options.signal?.addEventListener("abort", abort, { once: true });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!prompt) {
          finish(true);
          return;
        }
        const problem = options.validate?.(input.value) ?? null;
        if (problem) {
          error.textContent = problem;
          error.hidden = false;
          input.setAttribute("aria-invalid", "true");
          input.focus();
          return;
        }
        finish(input.value);
      });
      input?.addEventListener("input", () => {
        error.hidden = true;
        input.removeAttribute("aria-invalid");
      });
      cancel.addEventListener("click", () => finish(prompt ? null : false));
      close.addEventListener("click", () => finish(prompt ? null : false));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(prompt ? null : false);
      });
      dialog.addEventListener("close", done, { once: true });
      document.body.append(dialog);
      dialog.showModal();
      if (input) {
        input.focus();
        input.select?.();
      } else ok.focus();
    });
  }
  function confirmDialog(message, { title = "Are you sure?", ok = "OK", cancel = "Cancel", signal } = {}) {
    if (!supported()) return Promise.resolve(window.confirm(message));
    return open({ kind: "confirm", title, message, ok, cancel, signal });
  }
  function promptDialog(message, {
    title = "Enter a value",
    value = "",
    ok = "Save",
    cancel = "Cancel",
    label,
    placeholder,
    inputMode,
    validate,
    signal
  } = {}) {
    if (!supported()) {
      for (; ; ) {
        const answer = window.prompt(message, value);
        if (answer === null) return Promise.resolve(null);
        const problem = validate?.(answer) ?? null;
        if (!problem) return Promise.resolve(answer);
        window.alert(problem);
        value = answer;
      }
    }
    return open({ kind: "prompt", title, message, ok, cancel, value, label, placeholder, inputMode, validate, signal });
  }
  var DIALOG_CSS = String.raw`
.ogt-dialog {
  box-sizing: border-box;
  inline-size: var(--dialog-width-notes, 440px);
  max-inline-size: 90%;
  max-block-size: calc(100dvh - 40px);
  padding: 0;
  overflow: visible;
  border: 0;
  background: none;
  color: var(--color-text, light-dark(#333, #e6e6e6));
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
}
.ogt-dialog *, .ogt-dialog *::before, .ogt-dialog *::after { box-sizing: inherit; }
.ogt-dialog [hidden] { display: none !important; }
.ogt-dialog[open] { display: flex; flex-direction: column; }
.ogt-dialog::backdrop { background-color: var(--color-backdrop, rgb(0 0 0 / 0.7)); }
.ogt-dialog__panel {
  position: relative;
  min-block-size: 0;
  overflow-y: auto;
  border: 1px solid var(--color-dialog-art-border, transparent);
  border-radius: var(--radius-dialog, 6px);
  background-color: var(--color-dialog-bg, light-dark(#f5f5f7, #1d1d1d));
  box-shadow: var(--shadow-dialog, 0 0 20px #000);
}
.ogt-dialog__title {
  margin: 0;
  padding: var(--space-panel, 15px) calc(var(--space-dialog-inline, 25px) + 24px) var(--space-panel, 15px) var(--space-dialog-inline, 25px);
  border-block-end: 1px solid var(--color-dialog-title-border, light-dark(#ddd, #444));
  background-color: var(--color-dialog-title-bg, light-dark(#eee, #161616));
  color: var(--color-dialog-title-text, light-dark(#444, #999));
  font-family: var(--font-headings, inherit);
  font-size: var(--font-size-dialog-title, 13px);
  font-weight: var(--font-weight-headings, 600);
  text-transform: uppercase;
}
.ogt-dialog__close {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  display: grid;
  place-items: center;
  inline-size: 46px;
  block-size: 46px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-dialog-close, #ccc);
  cursor: pointer;
}
.ogt-dialog__close:hover { color: var(--color-dialog-title-text, light-dark(#444, #fff)); }
.ogt-dialog__body {
  display: grid;
  gap: 10px;
  padding: var(--dialog-art-body-top, 20px) var(--dialog-art-inline, 22px);
}
.ogt-dialog__message { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
.ogt-dialog__label {
  margin-block-start: 4px;
  color: var(--color-dialog-art-label, light-dark(#666, #aaa));
  font-size: 12px;
  font-weight: 600;
}
.ogt-dialog__input {
  display: block;
  inline-size: 100%;
  padding: var(--dialog-art-field-padding, 9px 12px);
  border: 1px solid var(--color-control-border, light-dark(#d6d6d6, #3b3b3b));
  border-radius: var(--radius-control, 4px);
  background-color: var(--color-control-bg, light-dark(#fff, #232323));
  color: var(--color-control-text, light-dark(#111, #fff));
  font: inherit;
  font-size: var(--font-size-dialog-art-field, 14px);
}
.ogt-dialog__input:hover { border-color: var(--color-control-border-hover, light-dark(#9a9a9a, #5c5c5c)); }
.ogt-dialog__input:focus {
  border-color: var(--color-input-border-focus, #66afe9);
  outline: none;
  box-shadow: var(--shadow-dialog-art-field-focus, 0 0 0 3px rgb(102 175 233 / 0.2));
}
.ogt-dialog__input[aria-invalid='true'] { border-color: var(--brand-danger, var(--brand-primary, #ed1c24)); }
.ogt-dialog__error { margin: 0; color: var(--color-dialog-art-danger-text, light-dark(#a94442, #ffb3b5)); font-size: 12px; }
.ogt-dialog__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--dialog-art-footer-gap, 10px);
  padding: var(--dialog-art-footer-padding, 14px 22px);
  border-block-start: 1px solid var(--color-dialog-art-border, light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.08)));
  background-color: var(--color-dialog-art-footer-bg, light-dark(#ececef, #181818));
  border-end-start-radius: inherit;
  border-end-end-radius: inherit;
}
.ogt-dialog__footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--dialog-art-button-height, 40px);
  padding: var(--dialog-art-button-padding, 0 18px);
  border: 1px solid var(--color-control-border, light-dark(#d6d6d6, #3b3b3b));
  border-radius: var(--radius-control, 4px);
  background: none;
  color: var(--color-control-text, light-dark(#111, #fff));
  font-family: var(--font-headings, inherit);
  font-size: var(--font-size-dialog-art-button, 13px);
  font-weight: var(--font-weight-headings-heavy, 700);
  line-height: 1;
  cursor: pointer;
}
.ogt-dialog__footer .ogt-dialog__cancel:hover {
  border-color: var(--color-control-border-hover, light-dark(#9a9a9a, #5c5c5c));
  background-color: var(--color-dialog-art-button-hover, light-dark(rgb(0 0 0 / 0.04), rgb(255 255 255 / 0.04)));
}
.ogt-dialog__footer .ogt-dialog__ok {
  border-color: var(--brand-primary, #ed1c24);
  background-color: var(--brand-primary, #ed1c24);
  color: var(--color-text-inverse, #fff);
}
.ogt-dialog__footer .ogt-dialog__ok:hover {
  border-color: var(--brand-primary-darken, #c61017);
  background-color: var(--brand-primary-darken, #c61017);
}
.ogt-dialog__panel :focus-visible { outline: 2px solid var(--color-input-border-focus, #66afe9); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .ogt-dialog[open], .ogt-dialog[open]::backdrop {
    transition: opacity 0.3s linear;
    @starting-style { opacity: 0; }
  }
}
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
    const watchlist2 = path.match(/^\/users\/([^/]+)\/watchlist(?:\/(movies|shows|seasons|episodes))?$/);
    if (watchlist2) return { name: "watchlist", kind: null, id: watchlist2[1], type: watchlist2[2] ?? null, path, key: path };
    const person = path.match(/^\/people\/([^/]+)$/);
    if (person) return { name: "person", kind: "person", id: person[1], path, key: path };
    const lists = path.match(/^\/users\/([^/]+)\/(?:lists(?:\/collaborations|\/liked(?:\/official)?)?|smart-lists)$/);
    if (lists) {
      const name2 = path.endsWith("/smart-lists") ? "smart-lists" : path.endsWith("/collaborations") ? "lists-collaborations" : path.includes("/liked") ? "liked-lists" : "lists";
      return { name: name2, kind: null, id: lists[1], path, key: path };
    }
    const list = path.match(/^\/users\/([^/]+)\/lists\/([^/]+)$/);
    if (list) return { name: "list", kind: null, id: list[1], slug: list[2], path, key: path };
    const official = path.match(/^\/lists\/official\/([^/]+)$/);
    if (official) return { name: "official-list", kind: null, id: null, slug: official[1], path, key: path };
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
    }
    function sync(route) {
      if (syncing) {
        rerun = true;
        pendingRoute = route;
        return;
      }
      syncing = true;
      try {
        let current = route;
        for (; ; ) {
          syncOnce(current);
          if (!rerun) break;
          rerun = false;
          current = pendingRoute ?? current;
        }
      } finally {
        syncing = false;
      }
    }
    sync.reset = () => {
      for (const feature of features) if (feature.authScoped) unmount(feature.id, "authchange");
    };
    return sync;
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
  function onRemoteValueChange(key, callback) {
    if (typeof GM_addValueChangeListener !== "function") return;
    GM_addValueChangeListener(key, (_key, oldValue, newValue, remote) => {
      if (remote) callback(oldValue, newValue);
    });
  }
  var STORAGE = {
    monthReview: (user, month) => `review.${encodeURIComponent(user)}.${month}`,
    dismissedReview: (user) => `review.dismissed.${encodeURIComponent(user)}`,
    clientId: "trakt.clientId",
    tokens: "trakt.oauth.tokens",
    redirectUri: "trakt.oauth.redirectUri",
    customLinks: "watch.customLinks",
    servers: "watch.servers",
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
  var SERVER_KEYS = ["jellyfin", "emby", "radarr", "sonarr", "seerr"];
  function isServerTemplateUrl(value) {
    const match = String(value || "").trim().match(/^\{([a-z][a-z0-9_-]*)\}\//);
    return Boolean(match && SERVER_KEYS.includes(match[1]));
  }
  function isCustomLinkUrl(value) {
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) || isServerTemplateUrl(url);
  }
  function normalizeServerUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
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
      return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
    } catch {
      return null;
    }
  }
  function getServers() {
    const stored = getValue(STORAGE.servers, {});
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    const servers = {};
    for (const key of SERVER_KEYS) {
      const value = normalizeServerUrl(stored[key]);
      if (value) servers[key] = value;
    }
    return servers;
  }
  function setServers(values) {
    const servers = {};
    if (values && typeof values === "object") {
      for (const key of SERVER_KEYS) {
        const value = normalizeServerUrl(values[key]);
        if (value) servers[key] = value;
      }
    }
    if (Object.keys(servers).length) setValue(STORAGE.servers, servers);
    else removeValue(STORAGE.servers);
    return servers;
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

  // src/core/text.js
  function fillTemplate(template, vars, rawKeys = []) {
    const raw = rawKeys instanceof Set ? rawKeys : new Set(rawKeys);
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = vars[key];
      if (value === void 0 || value === null || value === "") return "";
      return raw.has(key) ? String(value) : encodeURIComponent(String(value));
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

  // src/core/http.js
  var HttpError = class extends Error {
    constructor(message, status, body, headers2 = null) {
      super(message);
      this.name = "HttpError";
      this.status = status;
      this.body = body;
      this.headers = headers2;
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
  var MAX_RETRY_WAIT_MS = 6e4;
  async function request(options) {
    await acquire();
    try {
      let attempt = 0;
      for (; ; ) {
        const prepared = options.beforeSend ? await options.beforeSend() : null;
        const response = await rawRequest(prepared ? { ...options, ...prepared } : options);
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt >= (options.retries ?? MAX_RETRIES)) return response;
        const retryAfter = Number(headerValue(response.headers, "retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : 1e3 * (attempt + 1);
        if (delay > MAX_RETRY_WAIT_MS) return response;
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
  async function requestJSON(url, { headers: headers2 = {}, timeout, retries } = {}) {
    const response = await request({
      url,
      headers: headers2,
      method: "GET",
      ...timeout !== void 0 ? { timeout } : {},
      ...retries !== void 0 ? { retries } : {}
    });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, response.text, response.headers);
    }
    try {
      return { data: JSON.parse(response.text), headers: response.headers };
    } catch (error) {
      throw new HttpError(`Invalid JSON from ${url}`, response.status, response.text, response.headers);
    }
  }
  async function getJSON(url, { headers: headers2 = {}, ttl = 0, timeout, retries } = {}) {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expires > now) return hit.value;
    const { data } = await requestJSON(url, { headers: headers2, timeout, retries });
    if (ttl > 0) cache.set(url, { expires: now + ttl, value: data });
    return data;
  }
  async function getJSONWithHeaders(url, options = {}) {
    return requestJSON(url, options);
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

  // src/features/custom-links/resolve.js
  var RESOLVE_TIMEOUT_MS = 8e3;
  var HIT_TTL_MS = 24 * 60 * 60 * 1e3;
  var MISS_TTL_MS = 5 * 60 * 1e3;
  var DEFAULT_COOLDOWN_MS = 60 * 1e3;
  var FAILURE_COOLDOWN_MS = 10 * 1e3;
  var SPARQL_URL = "https://query.wikidata.org/sparql";
  var IMDB_RE = /^tt\d{5,10}$/;
  var RT_ID_RE = /^(m|tv)\/([a-z0-9][a-z0-9_-]*)$/;
  var MC_ID_RE = /^(movie|tv)\/([a-z0-9][a-z0-9-]*)$/;
  var MC_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  var RT_PATH_RE = /^[a-z0-9][a-z0-9_-]*$/;
  var WIKIDATA_ITEM_RE = /^https?:\/\/www\.wikidata\.org\/entity\/Q\d+$/;
  var SERVICES = {
    "rotten-tomatoes": {
      property: "P1258",
      hostnames: ["www.rottentomatoes.com", "rottentomatoes.com"],
      kinds: {
        movie: { className: "Q11424", tmdbProperty: "P4947", prefix: "m" },
        show: { className: "Q5398426", tmdbProperty: "P4983", prefix: "tv" }
      }
    },
    metacritic: {
      property: "P1712",
      hostnames: ["www.metacritic.com", "metacritic.com"],
      kinds: {
        movie: { className: "Q11424", tmdbProperty: "P4947", prefix: "movie" },
        show: { className: "Q5398426", tmdbProperty: "P4983", prefix: "tv" }
      }
    }
  };
  var cache2 = /* @__PURE__ */ new Map();
  var inflight = /* @__PURE__ */ new Map();
  var nextLookupAt = 0;
  function serviceConfig(service, kind) {
    const config = SERVICES[service];
    if (!config || !config.kinds[kind]) return null;
    return { ...config.kinds[kind], property: config.property, hostnames: config.hostnames };
  }
  function validTmdbId(value) {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  function validImdbId(value) {
    const imdb = String(value ?? "").trim();
    return IMDB_RE.test(imdb) ? imdb : null;
  }
  function normalise(def, identifier) {
    const match = String(identifier ?? "").match(def.property === "P1258" ? RT_ID_RE : MC_ID_RE);
    if (!match || match[1] !== def.prefix) return null;
    if (def.property === "P1258") return `https://www.rottentomatoes.com/${match[1]}/${match[2]}`;
    return `https://www.metacritic.com/${match[1]}/${match[2]}/`;
  }
  function validateDirectUrl(service, kind, raw) {
    const config = SERVICES[service];
    const def = config?.kinds[kind];
    if (!def || !raw) return null;
    let url;
    try {
      url = new URL(String(raw));
    } catch {
      return null;
    }
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!config.hostnames.includes(url.hostname)) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (service === "rotten-tomatoes") {
      if (!segments.length || !["m", "tv"].includes(segments[0])) return null;
      if (segments[0] !== def.prefix) return null;
      if (segments.length === 2 && RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join("/")}`;
      if (kind === "show" && segments.length === 3 && /^s\d+$/.test(segments[2]) && RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join("/")}`;
      if (kind === "show" && segments.length === 4 && /^s\d+$/.test(segments[2]) && /^e\d+$/.test(segments[3]) && RT_PATH_RE.test(segments[1])) return `${url.origin}/${segments.join("/")}`;
      return null;
    }
    if (!segments.length || !["movie", "tv"].includes(segments[0])) return null;
    if (segments[0] !== def.prefix || segments.length > 3) return null;
    if (!MC_SLUG_RE.test(segments[1] || "")) return null;
    if (segments.length === 2) return `${url.origin}/${segments.join("/")}/`;
    if (kind === "show" && /^season-\d+$/.test(segments[2])) return `${url.origin}/${segments.join("/")}/`;
    return null;
  }
  function externalIdUrl(service, kind, identifier) {
    const def = serviceConfig(service, kind);
    if (!def) return null;
    return normalise(def, identifier);
  }
  function buildDestinationUrl(service, baseUrl, context = {}) {
    const def = serviceConfig(service, context.kind);
    if (!def || !baseUrl) return null;
    const season = context.season;
    if (context.kind !== "show" || !(context.routeName === "season" || context.routeName === "episode")) return baseUrl;
    if (!Number.isSafeInteger(season) || season < 1) return baseUrl;
    if (service === "rotten-tomatoes") return `${baseUrl.replace(/\/+$/, "")}/s${String(season).padStart(2, "0")}`;
    return `${baseUrl.replace(/\/+$/, "")}/season-${season}/`;
  }
  function resolverKey({ service, kind, tmdb, imdb }) {
    return `${service}|${kind}|${validTmdbId(tmdb) ?? ""}|${validImdbId(imdb) ?? ""}`;
  }
  function buildWikidataQuery({ service, kind, tmdb, imdb }) {
    const def = serviceConfig(service, kind);
    if (!def) throw new Error("Unsupported resolver service or kind.");
    const tmdbId = validTmdbId(tmdb);
    const imdbId = validImdbId(imdb);
    const idClause = tmdbId != null ? `?item wdt:${def.tmdbProperty} "${tmdbId}" .` : imdbId != null ? `?item wdt:P345 "${imdbId}" .` : null;
    if (!idClause) throw new Error("No validated TMDb or IMDb id.");
    return [
      "SELECT DISTINCT ?item ?value WHERE {",
      `  ${idClause}`,
      `  ?item wdt:P31/wdt:P279* wd:${def.className} .`,
      `  ?item wdt:${def.property} ?value .`,
      "}"
    ].join("\n");
  }
  function parseWikidataResponse(payload, service, kind) {
    const bindings = payload?.results?.bindings;
    if (!Array.isArray(bindings)) throw new Error("Malformed Wikidata response.");
    const values = /* @__PURE__ */ new Set();
    for (const binding of bindings) {
      const item = binding?.item?.value;
      const value = binding?.value?.value;
      if (typeof item !== "string" || !WIKIDATA_ITEM_RE.test(item)) throw new Error("Malformed Wikidata item.");
      if (typeof value !== "string") throw new Error("Malformed Wikidata value.");
      values.add(value);
    }
    if (values.size !== 1) return null;
    return externalIdUrl(service, kind, [...values][0]);
  }
  function directUrlFor(input) {
    return validateDirectUrl(input.service, input.kind, input.directUrl);
  }
  function fetchBase(input, { fetchImpl }) {
    const query = buildWikidataQuery(input);
    const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
    const fetchJson = fetchImpl || ((target) => getJSON(target, {
      headers: {
        Accept: "application/sparql-results+json",
        "Api-User-Agent": `TraktOGToolkit/${VERSION} (https://github.com/Ezo-mas/trakt-og-toolkit)`
      },
      timeout: RESOLVE_TIMEOUT_MS,
      retries: 0
    }));
    return Promise.resolve(fetchJson(url)).then((payload) => parseWikidataResponse(payload, input.service, input.kind));
  }
  function retryAfterMs(value, nowMs = Date.now(), fallbackMs = DEFAULT_COOLDOWN_MS) {
    if (value == null || value === "") return fallbackMs;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1e3;
    const date = Date.parse(String(value));
    if (Number.isFinite(date)) return Math.max(0, date - nowMs);
    return fallbackMs;
  }
  function coolingDown(now) {
    return nextLookupAt > now();
  }
  function recordCooldown(error, now, minimumMs = 0) {
    const at = now();
    const delay = retryAfterMs(headerValue(error?.headers, "retry-after"), at, minimumMs || DEFAULT_COOLDOWN_MS);
    nextLookupAt = Math.max(nextLookupAt, at + Math.max(minimumMs, delay));
  }
  function peekExternalUrl(input, options = {}) {
    const direct = directUrlFor(input);
    if (direct) return direct;
    if (!serviceConfig(input.service, input.kind)) return null;
    const now = options.now || Date.now;
    const hit = cache2.get(resolverKey(input));
    if (!hit || hit.expires <= now()) return null;
    return hit.url ? buildDestinationUrl(input.service, hit.url, input.context) : null;
  }
  function resolveExternalUrl(input, options = {}) {
    const direct = directUrlFor(input);
    if (direct) return Promise.resolve(direct);
    if (!serviceConfig(input.service, input.kind)) return Promise.resolve(null);
    if (validTmdbId(input.tmdb) == null && validImdbId(input.imdb) == null) return Promise.resolve(null);
    const now = options.now || Date.now;
    const key = resolverKey(input);
    const hit = cache2.get(key);
    if (hit && hit.expires > now()) {
      return Promise.resolve(hit.url ? buildDestinationUrl(input.service, hit.url, input.context) : null);
    }
    if (coolingDown(now)) return Promise.resolve(null);
    let pending = inflight.get(key);
    if (!pending) {
      pending = fetchBase(input, { fetchImpl: options.fetchImpl }).then((url) => {
        cache2.set(key, { url, expires: now() + (url ? HIT_TTL_MS : MISS_TTL_MS) });
        return url;
      }).catch((error) => {
        if (error?.status === 429) {
          recordCooldown(error, now);
          return null;
        }
        if (!error?.status || error.status >= 500) recordCooldown(error, now, FAILURE_COOLDOWN_MS);
        throw error;
      }).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    return pending.then((url) => url ? buildDestinationUrl(input.service, url, input.context) : null);
  }

  // src/features/custom-links/presets.js
  var PRESETS = [
    {
      label: "IMDb",
      url: "https://www.imdb.com/find/?q={title}",
      icon: "imdb",
      surface: "reference",
      kinds: ["movie", "show"],
      deep: [
        { url: "https://www.imdb.com/title/{episodeimdb}/", kinds: ["show"] },
        { url: "https://www.imdb.com/title/{imdb}/episodes?season={season}", kinds: ["show"] },
        { url: "https://www.imdb.com/title/{imdb}/", kinds: ["movie", "show"] }
      ]
    },
    {
      label: "TMDb",
      url: "https://www.themoviedb.org/search?query={title}",
      icon: "tmdb",
      surface: "reference",
      kinds: ["movie", "show"],
      deep: [
        { url: "https://www.themoviedb.org/tv/{tmdb}/season/{season}/episode/{episode}", kinds: ["show"] },
        { url: "https://www.themoviedb.org/tv/{tmdb}/season/{season}", kinds: ["show"] },
        { url: "https://www.themoviedb.org/movie/{tmdb}", kinds: ["movie"] },
        { url: "https://www.themoviedb.org/tv/{tmdb}", kinds: ["show"] }
      ]
    },
    {
      label: "TVDB",
      url: "https://thetvdb.com/search?query={title}",
      icon: "tvdb",
      surface: "reference",
      kinds: ["show"],
      deep: [
        { url: "https://thetvdb.com/dereferrer/series/{tvdb}", kinds: ["show"] }
      ]
    },
    {
      label: "Letterboxd",
      url: "https://letterboxd.com/search/{title}/",
      icon: "letterboxd",
      surface: "reference",
      kinds: ["movie"],
      deep: [
        { url: "https://letterboxd.com/imdb/{imdb}/", kinds: ["movie"] },
        { url: "https://letterboxd.com/tmdb/{tmdb}/", kinds: ["movie"] }
      ]
    },
    {
      label: "Rotten Tomatoes",
      url: "https://www.rottentomatoes.com/search?search={title}",
      icon: "rt",
      surface: "reference",
      kinds: ["movie", "show"],
      // Reuse OG's direct URL; otherwise Wikidata P1258 resolves the title id lazily.
      directVar: "rottenTomatoesUrl",
      resolver: "rotten-tomatoes"
    },
    {
      label: "Wikipedia",
      url: "https://en.wikipedia.org/w/index.php?search={title}",
      icon: "wikipedia",
      surface: "reference",
      kinds: ["movie", "show"]
    },
    {
      label: "JustWatch",
      url: "https://www.justwatch.com/us/search?q={title}",
      icon: "justwatch",
      // A reference link like og's own JustWatch icon; og's Watch Now dialog is already powered by JustWatch.
      surface: "reference",
      kinds: ["movie", "show"]
    },
    {
      label: "MyAnimeList",
      url: "https://myanimelist.net/search/all?q={title}",
      icon: "mal",
      surface: "reference",
      kinds: ["movie", "show"],
      genres: ["anime"]
    },
    {
      label: "Metacritic",
      url: "https://www.metacritic.com/search/{title}/",
      icon: "metacritic",
      surface: "reference",
      kinds: ["movie", "show"],
      // Reuse OG's direct URL when present; otherwise Wikidata P1712 resolves the title id lazily.
      directVar: "metacriticUrl",
      resolver: "metacritic"
    },
    {
      label: "Stremio",
      url: "https://web.stremio.com/#/search?search={title}",
      icon: "stremio",
      surface: "watch",
      kinds: ["movie", "show"],
      /**
       * Exact-item routes, most specific first. MetaDetails reads `type`, `id` and `videoId`
       * from `useParams()`, and its episode search builds the video id as
       * `<id>:<season>:<episode>`, so that shape opens one episode directly. With `videoId`
       * unset, `useSeason` reads `?season=` from the same URL, so a season page opens that
       * season's episode list.
       */
      deep: [
        { url: "https://web.stremio.com/#/detail/series/{imdb}/{imdb}:{season}:{episode}", kinds: ["show"] },
        { url: "https://web.stremio.com/#/detail/series/{imdb}?season={season}", kinds: ["show"] },
        { url: "https://web.stremio.com/#/detail/movie/{imdb}", kinds: ["movie"] },
        { url: "https://web.stremio.com/#/detail/series/{imdb}", kinds: ["show"] }
      ]
    },
    {
      label: "Debrid Media Manager",
      url: "https://debridmediamanager.com/search?query={title}",
      icon: "dmm",
      surface: "watch",
      kinds: ["movie", "show"],
      /**
       * DMM routes by IMDb id: `movie/:imdbid` and `show/:imdbid/:seasonNum` (from its
       * `src/pages/movie/[imdbid]/index.tsx` and `src/pages/show/[imdbid]/[seasonNum]/index.tsx`).
       * It has no episode page, so an episode opens its season instead. Signed-out visits
       * redirect to `/start`; the deep routes are for a signed-in DMM session.
       */
      deep: [
        { url: "https://debridmediamanager.com/show/{imdb}/{season}", kinds: ["show"] },
        { url: "https://debridmediamanager.com/movie/{imdb}", kinds: ["movie"] },
        { url: "https://debridmediamanager.com/show/{imdb}", kinds: ["show"] }
      ]
    },
    {
      label: "MDBList",
      // IMDb routes redirect to MDBList's canonical title slug; searches cover titles without an IMDb id.
      url: "https://mdblist.com/movies/?q_title={title}",
      icon: "mdblist",
      surface: "reference",
      kinds: ["movie", "show"],
      deep: [
        { url: "https://mdblist.com/movie/{imdb}", kinds: ["movie"] },
        { url: "https://mdblist.com/show/{imdb}", kinds: ["show"] },
        { url: "https://mdblist.com/shows/?q_title={title}", kinds: ["show"] }
      ]
    },
    {
      label: "OpenSubtitles",
      icon: "opensubtitles",
      surface: "reference",
      /**
       * OpenSubtitles' search takes an IMDb id without `tt` or leading zeroes:
       * `imdbid` for a movie or episode, and `pimdbid` for a show. The episode
       * page's own IMDb link supplies the episode id; without it the season route
       * is the fallback. The stored URL is the movie route, while every show page
       * resolves to one of the deep routes.
       */
      url: "https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{imdbnum}",
      kinds: ["movie", "show"],
      deep: [
        { url: "https://www.opensubtitles.org/en/search/sublanguageid-all/imdbid-{episodeimdbnum}", kinds: ["show"] },
        { url: "https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-{imdbnum}/season-{season}", kinds: ["show"] },
        { url: "https://www.opensubtitles.org/en/search/sublanguageid-all/pimdbid-{imdbnum}", kinds: ["show"] }
      ]
    },
    {
      label: "Plex",
      url: "https://app.plex.tv/desktop/#!/search?query={title}",
      icon: "plex",
      surface: "watch",
      kinds: ["movie", "show"]
    },
    {
      label: "AniList",
      url: "https://anilist.co/search/anime?search={title}",
      icon: "anilist",
      surface: "reference",
      kinds: ["movie", "show"],
      genres: ["anime"]
    },
    {
      label: "YouTube interviews",
      url: "https://www.youtube.com/results?search_query={person}+interview",
      icon: "youtube",
      surface: "reference",
      kinds: ["person"]
    },
    {
      label: "Jellyfin",
      icon: "jellyfin",
      surface: "watch",
      /**
       * Current web search route; `jellyfin-web` defines `search` without `.html` and reads
       * `?query=`. The server base URL comes from the Servers settings.
       */
      url: "{jellyfin}/web/#/search?query={title}",
      kinds: ["movie", "show"],
      requires: "jellyfin"
    },
    {
      label: "Emby",
      icon: "emby",
      surface: "watch",
      /**
       * Current 4.9 web search page; its search field uses `searchtext`. Older Emby versions
       * used `/web/search.html` directly, so this remains editable in the link editor.
       */
      url: "{emby}/web/index.html#!/list/list.html?type=search&searchtext={title}",
      kinds: ["movie", "show"],
      requires: "emby"
    },
    {
      label: "Radarr",
      url: "{radarr}/add/new?term={title}",
      icon: "radarr",
      surface: "library",
      kinds: ["movie"],
      requires: "radarr",
      deep: [
        { url: "{radarr}/add/new?term=imdb:{imdb}", kinds: ["movie"] },
        { url: "{radarr}/add/new?term=tmdb:{tmdb}", kinds: ["movie"] }
      ]
    },
    {
      label: "Sonarr",
      url: "{sonarr}/add/new?term={title}",
      icon: "sonarr",
      surface: "library",
      kinds: ["show"],
      requires: "sonarr",
      deep: [
        { url: "{sonarr}/add/new?term=tvdb:{tvdb}", kinds: ["show"] }
      ]
    },
    {
      label: "Seerr",
      url: "{seerr}/search?query={title}",
      icon: "seerr",
      surface: "library",
      kinds: ["movie", "show"],
      requires: "seerr",
      deep: [
        { url: "{seerr}/movie/{tmdb}", kinds: ["movie"] },
        { url: "{seerr}/tv/{tmdb}", kinds: ["show"] }
      ]
    }
  ];
  function presetGenresAllowed(preset, genres = null) {
    if (!preset?.genres?.length) return true;
    if (!Array.isArray(genres)) return true;
    return preset.genres.some((genre) => genres.includes(genre));
  }
  function presetAllowedOnPage(url, kind, genres = null) {
    const preset = PRESETS.find((entry) => entry.url === url);
    if (!preset) return true;
    return preset.kinds.includes(kind) && presetGenresAllowed(preset, genres);
  }
  function findPreset(url) {
    return PRESETS.find((entry) => entry.url === url) || null;
  }
  function presetTemplateUrls(url, kind) {
    const preset = PRESETS.find((entry) => entry.url === url);
    if (preset && !preset.kinds.includes(kind)) return [];
    if (!preset?.deep) return [url];
    return [url, ...preset.deep.filter((entry) => entry.kinds.includes(kind)).map((entry) => entry.url)];
  }
  function resolvePresetUrl(url, vars, kind, genres = null) {
    const preset = PRESETS.find((entry) => entry.url === url);
    if (preset && !presetAllowedOnPage(url, kind, genres)) return null;
    if (preset?.directVar && vars[preset.directVar]) return vars[preset.directVar];
    if (!preset?.deep) return url;
    const deep = preset.deep.find(
      (entry) => entry.kinds.includes(kind) && missingPlaceholders(entry.url, vars).length === 0
    );
    return deep ? deep.url : url;
  }
  function presetResolver(url, kind) {
    const preset = PRESETS.find((entry) => entry.url === url);
    return preset && preset.kinds.includes(kind) ? preset.resolver || null : null;
  }

  // src/features/custom-links/brand-paths.js
  var BRAND_PATHS = {
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    imdb: "M22.3781 0H1.6218C.7411.0583.0587.7437.0018 1.5953l-.001 20.783c.0585.8761.7125 1.543 1.5559 1.6191A.337.337 0 0 0 1.6016 24h20.7971a.4579.4579 0 0 0 .0437-.002c.8727-.0768 1.5568-.8271 1.5568-1.7085V1.7098c0-.8914-.696-1.6416-1.584-1.7078A.3294.3294 0 0 0 22.3781 0zm0 .496a1.2144 1.2144 0 0 1 1.1252 1.2139v20.5797c0 .6377-.4875 1.1602-1.1045 1.2145H1.6016c-.5967-.0543-1.0645-.5297-1.1053-1.1258V1.6284C.5371 1.0185 1.0184.5364 1.6217.496h20.7564zM4.7954 8.2603v7.3636H2.8899V8.2603h1.9055zm6.5367 0v7.3636H9.6707v-4.9704l-.6711 4.9704H7.813l-.6986-4.8618-.0066 4.8618h-1.668V8.2603h2.468c.0748.4476.1492.9694.2307 1.5734l.2712 1.8713.4407-3.4447h2.4817zm2.9772 1.3289c.0742.0404.122.108.1417.2034.0279.0953.0345.3118.0345.6442v2.8548c0 .4881-.0345.7867-.0955.8954-.0609.1152-.2304.1695-.5018.1695V9.5211c.204 0 .3457.0205.4211.0681zm-.0211 6.0347c.4543 0 .8006-.0265 1.0245-.0742.2304-.0477.4204-.1357.5694-.2648.1556-.1218.2642-.298.3251-.5219.0611-.2238.1021-.6648.1021-1.3224v-2.5832c0-.6986-.0271-1.1668-.0742-1.4039-.041-.237-.1431-.4543-.3126-.6437-.1695-.1973-.4198-.3324-.7456-.421-.3191-.0808-.8542-.1285-1.7694-.1285h-1.4244v7.3636h2.3051zm5.14-1.7827c0 .3523-.0199.5762-.0544.6708-.033.0947-.1894.1424-.3046.1424-.1086 0-.19-.0477-.2238-.1351-.041-.0887-.0609-.2986-.0609-.6238v-1.9469c0-.3324.0199-.5423.0543-.6237.0338-.0808.1086-.122.2171-.122.1153 0 .2709.0412.3114.1425.041.0947.0609.2986.0609.6032v1.8926zm-2.4747-5.5809v7.3636h1.7157l.1152-.4675c.1556.1894.3251.3324.5152.4271.1828.0881.4608.1357.678.1357.3047 0 .5629-.0748.7802-.237.2165-.1562.3589-.3462.4198-.5628.0543-.2173.0887-.543.0887-.9841v-2.0675c0-.4409-.0139-.7324-.0344-.8681-.0199-.1357-.0742-.2781-.1695-.4204-.1021-.1425-.2437-.251-.4272-.3325-.1834-.0742-.3999-.1152-.6576-.1152-.2172 0-.4952.0477-.6846.1285-.1835.0887-.353.2238-.5086.4007V8.2603h-1.8309z",
    letterboxd: "M8.224 14.352a4.447 4.447 0 0 1-3.775 2.092C1.992 16.444 0 14.454 0 12s1.992-4.444 4.45-4.444c1.592 0 2.988.836 3.774 2.092-.427.682-.673 1.488-.673 2.352s.246 1.67.673 2.352zM15.101 12c0-.864.247-1.67.674-2.352-.786-1.256-2.183-2.092-3.775-2.092s-2.989.836-3.775 2.092c.427.682.674 1.488.674 2.352s-.247 1.67-.674 2.352c.786 1.256 2.183 2.092 3.775 2.092s2.989-.836 3.775-2.092A4.42 4.42 0 0 1 15.1 12zm4.45-4.444a4.447 4.447 0 0 0-3.775 2.092c.427.682.673 1.488.673 2.352s-.246 1.67-.673 2.352a4.447 4.447 0 0 0 3.775 2.092C22.008 16.444 24 14.454 24 12s-1.992-4.444-4.45-4.444z",
    rt: "M5.866 0L4.335 1.262l2.082 1.8c-2.629-.989-4.842 1.4-5.012 2.338 1.384-.323 2.24-.422 3.344-.335-7.042 4.634-4.978 13.148-1.434 16.094 5.784 4.612 13.77 3.202 17.91-1.316C27.26 13.363 22.993.65 10.86 2.766c.107-1.17.633-1.503 1.243-1.602-.89-1.493-3.67-.734-4.556 1.374C7.52 2.602 5.866 0 5.866 0zM4.422 7.217H6.9c2.673 0 2.898.012 3.55.202 1.06.307 1.868.973 2.313 1.904.05.106.092.206.13.305l7.623.008.027 2.912-2.745-.024v7.549l-2.982-.016v-7.522l-2.127.016a2.92 2.92 0 0 1-1.056 1.134c-.287.176-.3.19-.254.264.127.2 2.125 3.642 2.125 3.659l-3.39.019-2.013-3.376c-.034-.047-.122-.068-.344-.084l-.297-.02.037 3.48-3.075-.038zm3.016 2.288l.024.338c.014.186.024.729.024 1.206v.867l.582-.025c.32-.013.695-.049.833-.078.694-.146 1.048-.478 1.087-1.018.027-.378-.063-.636-.303-.87-.318-.309-.761-.416-1.733-.418Z",
    wikipedia: "M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z",
    mal: "M14.921 6.479c-.82 0-3.683 0-4.947 3.156-.662 1.652-.986 4.812.876 7.886l1.934-1.41s-.767-1.095-1.083-3.191h2.897l.022 3.19h2.604V8.835h-2.581v2.043l-2.46-.023s.413-2.408 2.877-2.336h2.454l-.572-2.04ZM0 6.528v9.624h2.348v-5.84l2.031 2.664 2.047-2.652v5.828h2.336V6.528H6.437L4.368 9.474 2.31 6.528Zm18.447.022v9.583h5.022L24 14.09h-3.232V6.55Z",
    metacritic: "M11.99 0A12 12 0 1 0 24 12v-.014A12 12 0 0 0 11.99 0Zm-.055 2.564a9.399 9.399 0 0 1 9.407 9.389v.01a9.399 9.399 0 1 1-9.408-9.399Zm-1.61 17.198 2.046-2.046-3.94-3.94c-.165-.166-.345-.373-.442-.608-.221-.47-.318-1.203.221-1.742.664-.664 1.548-.387 2.406.47l3.788 3.788 2.046-2.046-3.954-3.954a2.48 2.48 0 0 1-.456-.622c-.263-.539-.25-1.216.235-1.7.677-.678 1.562-.429 2.544.553l3.677 3.677 2.046-2.046-3.982-3.982c-2.018-2.018-3.912-1.949-5.212-.65-.498.499-.802 1.024-.954 1.618a4.026 4.026 0 0 0-.055 1.686l-.027.028c-.996-.414-2.13-.166-3 .705-1.162 1.161-1.12 2.392-.982 3.11l-.042.043-1.009-.816-1.77 1.77a64.1 64.1 0 0 1 2.213 2.1z",
    stremio: "M12 0a1.2 1.2 0 0 0-.85.354L.353 11.15c-.47.47-.47 1.227 0 1.697L11.15 23.647a1.2 1.2 0 0 0 1.7 0l10.797-10.8c.47-.47.47-1.226 0-1.696L12.85.354A1.2 1.2 0 0 0 12 0zm-1.674 7.586a.2.2 0 0 1 .002 0 .2.2 0 0 1 .129.04l5.729 4.214a.2.2 0 0 1 0 .323l-5.73 4.213a.2.2 0 0 1-.317-.16v-8.43a.2.2 0 0 1 .187-.2z",
    plex: "M3.987 8.409c-.96 0-1.587.28-2.12.933v-.72H0v8.88s.038.018.127.037c.138.03.821.187 1.331-.249.441-.377.542-.814.542-1.318v-1.283c.533.573 1.147.813 2 .813 1.84 0 3.253-1.493 3.253-3.48 0-2.12-1.36-3.613-3.266-3.613Zm16.748 5.595.406.591c.391.614.894.906 1.492.908.621-.012 1.064-.562 1.226-.755 0 0-.307-.27-.686-.72-.517-.614-1.214-1.755-1.24-1.803l-1.198 1.779Zm-3.205-1.955c0-2.08-1.52-3.64-3.52-3.64s-3.467 1.587-3.467 3.573a3.48 3.48 0 0 0 3.507 3.52c1.413 0 2.626-.84 3.253-2.293h-2.04l-.093.093c-.427.4-.72.533-1.227.533-.787 0-1.373-.506-1.453-1.266h4.986c.04-.214.054-.307.054-.52Zm-7.671-.219c0 .769.11 1.701.868 2.722l.056.069c-.306.526-.742.88-1.248.88-.399 0-.814-.211-1.138-.579a2.177 2.177 0 0 1-.538-1.441V6.409H9.86l-.001 5.421Zm9.283 3.46h-2.39l2.247-3.332-2.247-3.335h2.39l2.248 3.335-2.248 3.332Zm1.593-1.286Zm-17.162-.342c-.933 0-1.68-.773-1.68-1.72s.76-1.666 1.68-1.666c.92 0 1.68.733 1.68 1.68 0 .946-.733 1.706-1.68 1.706Zm18.361-1.974L24 8.622h-2.391l-.87 1.293 1.195 1.773Zm-9.404-.466c.16-.706.72-1.133 1.493-1.133.773 0 1.373.467 1.507 1.133h-3Z",
    anilist: "M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z",
    jellyfin: "M12 .002C8.826.002-1.398 18.537.16 21.666c1.56 3.129 22.14 3.094 23.682 0C25.384 18.573 15.177 0 12 0zm7.76 18.949c-1.008 2.028-14.493 2.05-15.514 0C3.224 16.9 9.92 4.755 12.003 4.755c2.081 0 8.77 12.166 7.759 14.196zM12 9.198c-1.054 0-4.446 6.15-3.93 7.189.518 1.04 7.348 1.027 7.86 0 .511-1.027-2.874-7.19-3.93-7.19z",
    emby: "M11.041 0c-.007 0-1.456 1.43-3.219 3.176L4.615 6.352l.512.513.512.512-2.819 2.791L0 12.961l1.83 1.848c1.006 1.016 2.438 2.46 3.182 3.209l1.351 1.359.508-.496c.28-.273.515-.498.524-.498.008 0 1.266 1.264 2.794 2.808L12.97 24l.187-.182c.23-.225 5.007-4.95 5.717-5.656l.52-.516-.502-.513c-.276-.282-.5-.52-.496-.53.003-.009 1.264-1.26 2.802-2.783 1.538-1.522 2.8-2.776 2.803-2.785.005-.012-3.617-3.684-6.107-6.193L17.65 4.6l-.505.505c-.279.278-.517.501-.53.497-.013-.005-1.27-1.267-2.793-2.805A449.655 449.655 0 0011.041 0zM9.223 7.367c.091.038 7.951 4.608 7.957 4.627.003.013-1.781 1.056-3.965 2.32a999.898 999.898 0 01-3.996 2.307c-.019.006-.026-1.266-.026-4.629 0-3.7.007-4.634.03-4.625Z",
    radarr: "M5.274 0C3.189.039 1.19 1.547 1.19 4.705l.184 14.518c0 1.47 1.103 2.205 2.573 2.021L3.764 3.786c0-1.654.919-1.838 2.022-1.103l14.7 8.27c1.103.734 1.655 1.47 1.838 2.756.92-1.654.552-4.043-1.286-5.33L7.991.846A4.559 4.559 0 0 0 5.274.001zm1.982 6.91-.184 10.107 9.004-5.146Zm13.598 6.064-15.068 8.82c-.92.552-2.022.736-3.124.368.918 1.47 3.307 2.389 5.145 1.47l12.68-7.35c1.102-.736 1.286-2.022.367-3.308z",
    sonarr: "M21.212 4.282c1.851 2.204 2.777 4.776 2.777 7.718 0 2.848-.867 5.344-2.602 7.489a934.355 934.355 0 0 1-2.101-2.095c-1.477-1.477-1.792-3.293-1.792-5.278 0-2.224.127-3.486 1.577-4.935l2.478-2.478a13.209 13.209 0 0 0-.337-.421Zm-17.7 16.193C1.708 18.678.6 16.59.188 14.213A11.84 11.84 0 0 1 .011 12c0-.28.006-.548.017-.802 0-.026.007-.052.022-.078.153-2.601 1.076-4.889 2.767-6.865-.108.127-.214.256-.316.387 0 0 1.351 1.346 2.329 2.323 1.408 1.409 1.726 3.215 1.726 5.151 0 1.985-.249 3.762-1.781 5.295-1.035 1.035-2.119 2.124-2.119 2.124.112.136.229.271.349.404.029-.027 1.297-1.348 2.123-2.175 1.638-1.637 1.928-3.528 1.928-5.648 0-2.072-.365-3.997-1.873-5.504a620.045 620.045 0 0 0-2.366-2.357c.168-.196.342-.388.523-.576l3.117 3.106-.194.195 1.903 1.898.547-.549L6.81 6.432l-.196.196L3.495 3.52c.01-.009.436-.416.643-.597.009.011 2.28 2.283 2.28 2.283 1.538 1.537 3.5 1.955 5.621 1.955 2.18 0 4.134-.442 5.731-2.038.907-.908 2.153-2.149 2.162-2.16.17.151.491.461.56.528l.013.013-3.111 3.028-.001.002-.197-.194-1.876 1.903.552.543 1.875-1.903-.197-.194 3.109-3.026c.193.203.377.41.553.619-.03.025-2.495 2.546-2.495 2.546-1.556 1.556-1.723 2.9-1.723 5.288 0 2.121.361 4.054 1.939 5.632a576.91 576.91 0 0 0 2.133 2.124c-.183.208-.599.645-.613.66l-3.066-3.174.195-.196-1.995-1.986-.546.549 1.995 1.986.195-.196 3.065 3.172c-.021.019-.385.362-.552.506-.01-.013-1.974-1.978-1.974-1.978-1.842-1.842-3.299-2.039-5.731-2.039-2.338 0-3.92.239-5.632 1.95-.944.944-2.078 2.085-2.089 2.099-.275-.23-.649-.594-.649-.594l3.019-3.024.199.192 1.854-1.925-.558-.538-1.854 1.926.199.191-3.016 3.022ZM12 8.672A3.33 3.33 0 0 0 8.672 12 3.33 3.33 0 0 0 12 15.328 3.33 3.33 0 0 0 15.328 12 3.33 3.33 0 0 0 12 8.672ZM4.52 2.6C6.665.867 9.162 0 12.011 0c2.88 0 5.394.88 7.541 2.639 0 0-1.215 1.209-2.136 2.13-1.496 1.496-3.334 1.892-5.377 1.892-1.985 0-3.829-.37-5.267-1.809L4.52 2.6Zm14.837 18.909a9.507 9.507 0 0 1-.342.256C16.994 23.255 14.659 24 12.011 24c-2.652 0-4.983-.745-6.993-2.235-.104-.074-.208-.15-.31-.227 0 0 1.096-1.101 2.053-2.058 1.602-1.602 3.09-1.804 5.278-1.804 2.28 0 3.651.166 5.377 1.892l1.941 1.941Z",
    mdblist: "M1.928.029A2.47 2.47 0 0 0 .093 1.673c-.085.248-.09.629-.09 10.33s.005 10.08.09 10.33a2.51 2.51 0 0 0 1.512 1.558l.276.108h20.237l.277-.108a2.51 2.51 0 0 0 1.512-1.559c.085-.25.09-.63.09-10.33s-.005-10.08-.09-10.33A2.51 2.51 0 0 0 22.395.115l-.277-.109L12.117 0C6.615-.004 2.032.011 1.929.029m7.48 8.067 2.123 2.004v1.54c0 .897-.02 1.536-.043 1.527s-.92-.845-1.995-1.86c-1.071-1.01-1.962-1.84-1.977-1.84s-.024 1.91-.024 4.248v4.25H4.911V6.085h1.188l1.183.006zm9.729 3.93v5.94h-2.63l-.01-4.25-.013-4.25-1.907 1.795a367 367 0 0 1-1.98 1.864c-.076.056-.08-.047-.08-1.489v-1.555l2.127-1.995 2.122-1.995 1.187-.005h1.184z",
    trakt: "m15.082 15.107-.73-.73 9.578-9.583a4.499 4.499 0 0 0-.115-.575L13.662 14.382l1.08 1.08-.73.73-1.81-1.81L23.422 3.144c-.075-.15-.155-.3-.25-.44L11.508 14.377l2.154 2.155-.73.73-7.193-7.199.73-.73 4.309 4.31L22.546 1.86A5.618 5.618 0 0 0 18.362 0H5.635A5.637 5.637 0 0 0 0 5.634V18.37A5.632 5.632 0 0 0 5.635 24h12.732C21.477 24 24 21.48 24 18.37V6.19l-8.913 8.918zm-4.314-2.155L6.814 8.988l.73-.73 3.954 3.96zm1.075-1.084-3.954-3.96.73-.73 3.959 3.96zm9.853 5.688a4.141 4.141 0 0 1-4.14 4.14H6.438a4.144 4.144 0 0 1-4.139-4.14V6.438A4.141 4.141 0 0 1 6.44 2.3h10.387v1.04H6.438c-1.71 0-3.099 1.39-3.099 3.1V17.55c0 1.71 1.39 3.105 3.1 3.105h11.117c1.71 0 3.1-1.395 3.1-3.105v-1.754h1.04v1.754z"
  };

  // src/features/custom-links/icons.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICONS = {
    imdb: { brand: "imdb", native: "IMDB", text: "IMDb", color: "var(--color-site-imdb, #f5c518)" },
    tmdb: { native: "TMDB", text: "TMDb", color: "var(--color-site-tmdb, #01b4e4)" },
    tvdb: { native: "TVDB", text: "TVDB", color: "var(--color-site-tvdb, #6cd591)" },
    letterboxd: { brand: "letterboxd", text: "LB", color: "var(--color-site-letterboxd, #00e054)" },
    rt: { brand: "rt", text: "RT", color: "var(--color-site-rotten-tomatoes, #fa320a)" },
    wikipedia: { brand: "wikipedia", native: "Wikipedia", text: "W", color: "#ffffff" },
    justwatch: { native: "JustWatch", text: "JW", color: "var(--color-site-justwatch, #fbd446)" },
    mal: { brand: "mal", text: "MAL", color: "var(--color-site-mal, #2e51a2)" },
    metacritic: { brand: "metacritic", text: "MC", color: "var(--color-site-metacritic, #ffcc34)" },
    stremio: { brand: "stremio", text: "ST", color: "#8a7cf6" },
    dmm: { text: "DMM", color: "#3fb6a8" },
    mdblist: { brand: "mdblist", text: "MDB", color: "#4284ca" },
    opensubtitles: { text: "OS", color: "#7aa7d8" },
    plex: { brand: "plex", text: "PLEX", color: "var(--color-site-plex, #e5a00d)" },
    anilist: { brand: "anilist", text: "AL", color: "#02a9ff" },
    youtube: { brand: "youtube", text: "YT", color: "#ff0000" },
    jellyfin: { brand: "jellyfin", text: "JF", color: "var(--color-site-jellyfin, #aa5cc3)" },
    emby: { brand: "emby", text: "EMBY", color: "#52b54b" },
    radarr: { brand: "radarr", text: "R", color: "#ffcb3d" },
    sonarr: { brand: "sonarr", text: "S", color: "#35c5f4" },
    seerr: { text: "SEER", color: "#8b5cf6" },
    trakt: { brand: "trakt", text: "T", color: "var(--color-site-trakt, #ed1c24)" }
  };
  var LABEL_ICONS = {
    imdb: "imdb",
    tmdb: "tmdb",
    tvdb: "tvdb",
    letterboxd: "letterboxd",
    "rotten tomatoes": "rt",
    wikipedia: "wikipedia",
    justwatch: "justwatch",
    myanimelist: "mal",
    "my anime list": "mal",
    metacritic: "metacritic",
    stremio: "stremio",
    "debrid media manager": "dmm",
    dmm: "dmm",
    mdblist: "mdblist",
    opensubtitles: "opensubtitles",
    plex: "plex",
    anilist: "anilist",
    youtube: "youtube",
    "youtube interviews": "youtube",
    jellyfin: "jellyfin",
    emby: "emby",
    radarr: "radarr",
    sonarr: "sonarr",
    seerr: "seerr",
    overseerr: "seerr",
    jellyseerr: "seerr",
    trakt: "trakt"
  };
  function iconKeyForLabel(label) {
    const key = String(label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return LABEL_ICONS[key] || null;
  }
  var WATCH_ICONS = /* @__PURE__ */ new Set(["plex", "stremio", "jellyfin", "emby", "dmm"]);
  var LIBRARY_ICONS = /* @__PURE__ */ new Set(["radarr", "sonarr", "seerr"]);
  function surfaceForLabel(label) {
    const key = iconKeyForLabel(label);
    if (WATCH_ICONS.has(key)) return "watch";
    if (LIBRARY_ICONS.has(key)) return "library";
    return "reference";
  }
  function serviceColor(key) {
    return ICONS[key]?.color || null;
  }
  function hasServiceIcon(key) {
    return Boolean(key && ICONS[key]);
  }
  function brandSvg(doc, d) {
    const svg3 = doc.createElementNS(SVG_NS, "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("aria-hidden", "true");
    svg3.setAttribute("focusable", "false");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", d);
    svg3.append(path);
    return svg3;
  }
  function nativeSvg(doc, label) {
    for (const link of doc.querySelectorAll("ul.external-links a[aria-label]")) {
      if (link.getAttribute("aria-label") !== label) continue;
      const svg3 = link.querySelector("svg");
      if (!svg3) return null;
      const copy = svg3.cloneNode(true);
      copy.removeAttribute("class");
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("focusable", "false");
      return copy;
    }
    return null;
  }
  function serviceIcon(key, doc = document) {
    const definition = ICONS[key];
    if (!definition) return null;
    const native = definition.native ? nativeSvg(doc, definition.native) : null;
    const svg3 = native || (definition.brand && BRAND_PATHS[definition.brand] ? brandSvg(doc, BRAND_PATHS[definition.brand]) : null);
    const mark = doc.createElement("span");
    mark.className = "ogt-service-icon";
    mark.setAttribute("aria-hidden", "true");
    mark.dataset.ogtMark = native ? "native" : svg3 ? "brand" : "text";
    mark.style.setProperty("--ogt-brand", definition.color);
    if (svg3) mark.append(svg3);
    else mark.textContent = definition.text;
    return mark;
  }

  // src/features/custom-links/data.js
  var TMDB_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/;
  var IMDB_RE2 = /imdb\.com\/title\/(tt\d+)/;
  var TVDB_RE = /thetvdb\.com\/(?:dereferrer\/)?series\/(\d+)/;
  var SEASON_HREF_RE = /\/seasons\/(\d+)(?:\/|$)/;
  var SHOW_HREF_RE = /^\/shows\/[^/]+\/?$/;
  var SEASON_IMDB_RE = /imdb\.com\/title\/(tt\d+)\/episodes/;
  var EPISODE_IMDB_RE = /imdb\.com\/title\/(tt\d+)(?!\d|\/episodes)/;
  var GENRE_HREF_RE = /^\/(?:shows|movies)\/popular\/?$/;
  var PERSON_IMDB_PATH_RE = /^\/name\/(nm\d+)\/?$/;
  var PERSON_TMDB_PATH_RE = /^\/person\/(\d+)\/?$/;
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
        imdb: route.name === "season" ? firstMatch(doc, 'a[href*="imdb.com/title/"]', SEASON_IMDB_RE, (match) => match[1]) : null,
        episodeImdb: route.name === "episode" ? firstMatch(doc, 'a[href*="imdb.com/title/"]', EPISODE_IMDB_RE, (match) => match[1]) : null,
        tvdb: null,
        genres: readGenres(doc),
        rottenTomatoesUrl: readRottenTomatoesUrl(doc, route.kind),
        metacriticUrl: readMetacriticUrl(doc, route.kind)
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
      const match = link.getAttribute("href")?.match(IMDB_RE2);
      if (match) {
        imdb = match[1];
        break;
      }
    }
    let tvdb = null;
    for (const link of doc.querySelectorAll('a[href*="thetvdb.com/"]')) {
      const match = link.getAttribute("href")?.match(TVDB_RE);
      if (match) {
        tvdb = Number(match[1]);
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
      imdb,
      episodeImdb: null,
      rottenTomatoesUrl: readRottenTomatoesUrl(doc, kind),
      metacriticUrl: readMetacriticUrl(doc, kind),
      tvdb,
      genres: readGenres(doc)
    };
  }
  function readGenres(doc) {
    const overview = doc.querySelector("#overview") || doc.querySelector(".summary-frame");
    if (!overview) return null;
    const label = [...overview.querySelectorAll("span.label")].find((node) => text(node).trim().toLowerCase() === "genres");
    const field = label?.closest("li");
    if (!field) return null;
    const genres = /* @__PURE__ */ new Set();
    for (const link of field.querySelectorAll('a[href*="genres="]')) {
      let url;
      try {
        url = new URL(link.getAttribute("href"), "https://og.trakt.tv");
      } catch {
        continue;
      }
      if (url.origin !== "https://og.trakt.tv" || !GENRE_HREF_RE.test(url.pathname)) continue;
      const genre = url.searchParams.get("genres");
      if (genre && /^[a-z0-9-]+$/i.test(genre)) genres.add(genre.toLowerCase());
    }
    return genres.size ? [...genres] : null;
  }
  function readPersonData(doc, route) {
    const heading = doc.querySelector(".summary .summary-title h1") || doc.querySelector(".summary-title h1") || doc.querySelector("h1");
    const fallback = text(doc.querySelector("title")).replace(/\s*[-–|]\s*Trakt.*$/i, "").trim();
    return {
      kind: "person",
      id: route.id,
      name: text(heading).trim() || fallback || null,
      imdb: readPersonLinkId(doc, "imdb.com", PERSON_IMDB_PATH_RE),
      tmdb: readPersonLinkId(doc, "themoviedb.org", PERSON_TMDB_PATH_RE, (match) => Number(match[1]))
    };
  }
  function readPersonLinkId(doc, hostname, pathPattern, value = (match) => match[1]) {
    const strip = doc.querySelector("aside.sidebar ul.external-links") || doc.querySelector(".summary-frame ul.external-links");
    if (!strip) return null;
    for (const link of strip.querySelectorAll("a[href]")) {
      let url;
      try {
        url = new URL(link.getAttribute("href"), "https://og.trakt.tv");
      } catch {
        continue;
      }
      const host = url.hostname.replace(/^www\./i, "");
      if (url.protocol !== "https:" || host !== hostname || url.port || url.username || url.password) continue;
      const match = url.pathname.match(pathPattern);
      if (match) return value(match);
    }
    return null;
  }
  function readRottenTomatoesUrl(doc, kind) {
    return readNativeExternalUrl(doc, kind, "rotten-tomatoes");
  }
  function readMetacriticUrl(doc, kind) {
    return readNativeExternalUrl(doc, kind, "metacritic");
  }
  function readNativeExternalUrl(doc, kind, service) {
    for (const link of doc.querySelectorAll(".ratings-strip a[href], ul.external-links a[href]")) {
      const url = validateDirectUrl(service, kind, link.getAttribute("href"));
      if (url) return url;
    }
    return null;
  }
  function headingText(heading) {
    if (!heading) return "";
    return headingTitle(heading) || text(heading);
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
      imdb: typeof show.ids?.imdb === "string" && /^tt\d+$/.test(show.ids.imdb) ? show.ids.imdb : null,
      tvdb: Number.isSafeInteger(show.ids?.tvdb) && show.ids.tvdb > 0 ? show.ids.tvdb : null
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
  function imdbNumber(imdb) {
    const match = String(imdb || "").match(/^tt0*(\d+)$/);
    return match ? match[1] : null;
  }
  function personTemplateVars(person = {}) {
    return {
      person: person.name,
      personid: person.id,
      personimdb: person.imdb,
      persontmdb: person.tmdb
    };
  }
  function templateVars(meta, selection = {}, servers = {}) {
    return {
      id: meta.id,
      plural: meta.plural,
      type: meta.type,
      title: meta.title,
      year: meta.year,
      tmdb: meta.tmdb,
      imdb: meta.imdb,
      imdbnum: imdbNumber(meta.imdb),
      episodeimdb: meta.episodeImdb,
      episodeimdbnum: imdbNumber(meta.episodeImdb),
      tvdb: meta.tvdb,
      rottenTomatoesUrl: meta.rottenTomatoesUrl,
      metacriticUrl: meta.metacriticUrl,
      jellyfin: servers.jellyfin || null,
      emby: servers.emby || null,
      radarr: servers.radarr || null,
      sonarr: servers.sonarr || null,
      seerr: servers.seerr || null,
      season: selection.season,
      episode: selection.episode
    };
  }
  function resolveCustomLinks(links, values, kind, genres = null) {
    const resolved = [];
    for (const entry of Array.isArray(links) ? links : []) {
      if (!entry || typeof entry.label !== "string" || typeof entry.url !== "string") continue;
      if (!isCustomLinkUrl(entry.url)) continue;
      const template = resolvePresetUrl(entry.url, values, kind, genres);
      if (!template || missingPlaceholders(template, values).length) continue;
      const preset = findPreset(entry.url);
      resolved.push({
        label: entry.label,
        source: entry.url,
        template,
        href: fillTemplate(template, values, SERVER_KEYS),
        icon: preset?.icon || iconKeyForLabel(entry.label),
        surface: preset?.surface || surfaceForLabel(entry.label)
      });
    }
    return resolved;
  }
  function watchNowLinks(entries) {
    return (Array.isArray(entries) ? entries : []).filter(
      (entry) => entry.surface === "watch" || entry.surface === "library"
    );
  }
  function mergeSeasons(primary, fallback = []) {
    const rendered = new Map(fallback.map((season) => [season.number, season]));
    return primary.map((season) => ({
      number: season.number,
      episodes: season.episodes ?? rendered.get(season.number)?.episodes ?? null
    })).sort((a, b) => a.number - b.number);
  }
  function filterPresetsByKind(presets, kind, genres = null) {
    return presets.filter((preset) => preset.kinds.includes(kind) && presetGenresAllowed(preset, genres));
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
      if (!isCustomLinkUrl(link.url)) {
        errors.push({ index, field: "url", message: "URL must start with http://, https://, or a server placeholder." });
      }
    }
    return errors;
  }

  // src/core/og-session.js
  var OG_SESSION_AUTHORITY = "https://auth.trakt.tv";
  var OG_SESSION_CLIENT_ID = "WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI";
  var OG_SESSION_PREFIX = "oidc.user:";
  var OG_SESSION_KEY_PREFIX = `${OG_SESSION_PREFIX}${OG_SESSION_AUTHORITY}:`;
  var OG_SESSION_CHANGE_EVENT = "ogt:ogsessionchange";
  var watchedAccount;
  var watchedRaw;
  var watchingAccounts = false;
  var accountRevision = 0;
  var cachedRaw;
  var cachedSession;
  var authChangeScheduled = false;
  function getOgSessionRevision() {
    return accountRevision;
  }
  function scheduleAuthChange() {
    if (authChangeScheduled || typeof document === "undefined" || typeof Event !== "function") return;
    authChangeScheduled = true;
    queueMicrotask(() => {
      authChangeScheduled = false;
      document.dispatchEvent(new Event(OG_SESSION_CHANGE_EVENT));
    });
  }
  function observe(raw, accountKey2) {
    watchedRaw = raw;
    const next = accountKey2 ?? null;
    if (!watchingAccounts) {
      watchingAccounts = true;
      watchedAccount = next;
      return;
    }
    if (next === watchedAccount) return;
    watchedAccount = next;
    accountRevision += 1;
    scheduleAuthChange();
  }
  function ogSessionKey(clientId) {
    return `${OG_SESSION_KEY_PREFIX}${clientId}`;
  }
  function accountKey(profile) {
    if (!profile || typeof profile !== "object") return null;
    const id = profile.ids?.trakt;
    if (Number.isSafeInteger(id) && id > 0) return `trakt:${id}`;
    const sub = profile.sub;
    if (typeof sub === "string" && sub || Number.isSafeInteger(sub)) return `sub:${sub}`;
    if (typeof profile.username === "string" && profile.username) return `user:${profile.username.toLowerCase()}`;
    return null;
  }
  function parseOgSession(raw, clientId) {
    if (typeof raw !== "string" || !raw) return null;
    let user;
    try {
      user = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!user || typeof user.access_token !== "string" || !user.access_token) return null;
    if (user.token_type != null && String(user.token_type).toLowerCase() !== "bearer") return null;
    const key = accountKey(user.profile);
    if (!key) return null;
    const expiresAt = Number.isFinite(user.expires_at) ? user.expires_at * 1e3 : null;
    return { clientId, accessToken: user.access_token, expiresAt, accountKey: key };
  }
  function parseCached(raw) {
    if (raw == null) return null;
    if (cachedRaw === raw) return cachedSession;
    cachedRaw = raw;
    cachedSession = parseOgSession(raw, OG_SESSION_CLIENT_ID);
    return cachedSession;
  }
  function pageStorage() {
    const scope = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis;
    try {
      return scope.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function sameStorageArea(area, storage) {
    if (!area) return true;
    try {
      if (area === storage) return true;
      const key = ogSessionKey(OG_SESSION_CLIENT_ID);
      return area.getItem(key) === storage.getItem(key);
    } catch {
      return false;
    }
  }
  function readOgSession() {
    const storage = pageStorage();
    if (!storage) {
      observe(null, null);
      return null;
    }
    let raw = null;
    try {
      raw = storage.getItem(ogSessionKey(OG_SESSION_CLIENT_ID));
    } catch {
      raw = null;
    }
    const session = parseCached(raw);
    observe(raw, session?.accountKey);
    return session;
  }
  if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
    const storage = pageStorage();
    if (!storage || !sameStorageArea(event.storageArea, storage)) return;
    const key = ogSessionKey(OG_SESSION_CLIENT_ID);
    if (event.key !== null && event.key !== key) return;
    let currentRaw = null;
    try {
      currentRaw = storage.getItem(key);
    } catch {
      return;
    }
    const current = parseCached(currentRaw)?.accountKey ?? null;
    if (!watchingAccounts) {
      observe(currentRaw, current);
      return;
    }
    if (event.key === null) {
      if (currentRaw !== watchedRaw) observe(null, null);
      return;
    }
    const nextRaw = event.newValue;
    const next = parseCached(nextRaw)?.accountKey ?? null;
    if (event.oldValue === watchedRaw) {
      observe(nextRaw, next);
      return;
    }
    if (nextRaw === watchedRaw) return;
    if (nextRaw === currentRaw) {
      observe(currentRaw, current);
      return;
    }
    if (currentRaw !== watchedRaw) observe(currentRaw, current);
  });

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
    } catch (error) {
      if (error?.control) throw error;
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
  function hasOwnSession() {
    const t = readTokens();
    return Boolean(t?.access_token && t?.refresh_token);
  }
  function notifyAuthChange() {
    if (typeof document !== "undefined") document.dispatchEvent(new Event("ogt:authchange"));
  }
  if (typeof document !== "undefined") document.addEventListener(OG_SESSION_CHANGE_EVENT, () => {
    if (!readTokens()) notifyAuthChange();
  });
  function isSignedIn() {
    return hasOwnSession() || Boolean(readOgSession());
  }
  function getSessionGeneration() {
    return readTokens() ? `own:${generation}` : `og:${generation}:${getOgSessionRevision()}`;
  }
  function saveTokens(text3, clientId) {
    let t;
    try {
      t = JSON.parse(text3);
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
    notifyAuthChange();
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
          generation += 1;
          notifyAuthChange();
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
  var WRITE_INTERVAL_MS = 1e3;
  var WRITE_RETRIES = 2;
  var RETRY_BASE_MS = 1e3;
  var RETRY_MAX_MS = 3e4;
  var WAIT_SLICE_MS = 250;
  var writeTail = Promise.resolve();
  var nextWriteAt = 0;
  var blockedUntil = 0;
  var blockedGeneration = null;
  function cancelledError() {
    const error = authError("Trakt request cancelled.", 0);
    error.control = true;
    return error;
  }
  function signedOutError() {
    const error = authError("Signed out; sign in to Trakt.");
    error.control = true;
    return error;
  }
  function rateLimitedError() {
    return authError("Trakt rate limited this request; try again later.", 429);
  }
  function sessionChangedError() {
    return authError("Trakt session changed; request abandoned.");
  }
  function ogSessionExpiredError() {
    const error = authError("Your og.trakt.tv session expired; reload the page to renew it.", 401);
    error.ogSession = true;
    error.control = true;
    return error;
  }
  function ogLookupExpiredError() {
    const error = new MissingClientIdError();
    error.message = "Your og.trakt.tv session expired; reload the page to renew it.";
    error.ogSession = true;
    return error;
  }
  function ogAuth() {
    const session = readOgSession();
    return session ? {
      kind: "og",
      clientId: session.clientId,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      accountKey: session.accountKey
    } : null;
  }
  function currentAuth() {
    const tokens = readTokens();
    if (tokens) return {
      kind: "own",
      clientId: tokens.client_id,
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_at,
      accountKey: null
    };
    return ogAuth();
  }
  function observedGeneration() {
    currentAuth();
    return getSessionGeneration();
  }
  function sameAuth(a, b) {
    return Boolean(a && b) && a.kind === b.kind && a.clientId === b.clientId && a.accountKey === b.accountKey;
  }
  function assertOgFresh(auth) {
    if (auth.kind === "og" && auth.expiresAt != null && auth.expiresAt <= Date.now()) throw ogSessionExpiredError();
    return auth;
  }
  function apiHeaders(clientId, accessToken = null) {
    const headers2 = {
      "Content-Type": "application/json",
      "trakt-api-version": API.version,
      "trakt-api-key": clientId
    };
    if (accessToken) headers2.Authorization = `Bearer ${accessToken}`;
    return headers2;
  }
  function authHeaders(auth) {
    return apiHeaders(auth.clientId, auth.accessToken);
  }
  function sleep2(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(cancelledError());
        return;
      }
      const done = () => {
        cleanup();
        resolve();
      };
      const abort = () => {
        cleanup();
        reject(cancelledError());
      };
      const timer = setTimeout(done, Math.max(0, ms));
      function cleanup() {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  function retryDelay(headers2, attempt) {
    const raw = headerValue(headers2, "retry-after");
    if (raw != null && raw !== "") {
      const retryAfter = Number(raw);
      if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1e3;
    }
    const base = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
    return Math.round(base * (0.5 + Math.random()));
  }
  function createWriteEntry(control = {}) {
    const signal = control.signal ?? null;
    const active2 = typeof control.active === "function" ? control.active : null;
    const source = currentAuth();
    const generation3 = getSessionGeneration();
    return {
      signal,
      generation: generation3,
      check() {
        if (signal?.aborted) throw cancelledError();
        if (active2 && active2() === false) throw cancelledError();
        if (generation3 !== getSessionGeneration()) throw signedOutError();
        const now = currentAuth();
        if (!now || !source) throw signedOutError();
        if (!sameAuth(now, source)) throw sessionChangedError();
      }
    };
  }
  function enqueueWrite(entry, task) {
    const queued = writeTail.then(() => {
      entry.check();
      return task();
    });
    writeTail = queued.then(() => {
    }, () => {
    });
    return queued;
  }
  async function waitForTurn(entry) {
    for (; ; ) {
      entry.check();
      const blocked = blockedGeneration === entry.generation ? blockedUntil : 0;
      if (blocked - Date.now() > MAX_RETRY_WAIT_MS) throw rateLimitedError();
      const remaining = Math.max(nextWriteAt, blocked) - Date.now();
      if (remaining <= 0) return;
      await sleep2(Math.min(remaining, WAIT_SLICE_MS), entry.signal);
    }
  }
  function blockWrites(ms, generation3) {
    const until = Date.now() + ms;
    if (blockedGeneration === generation3) blockedUntil = Math.max(blockedUntil, until);
    else {
      blockedGeneration = generation3;
      blockedUntil = until;
    }
  }
  async function ensureAuth() {
    const tokens = readTokens();
    if (tokens) {
      const next = tokens.expires_at <= Date.now() + 6e4 ? await refreshTokens() : tokens;
      return { kind: "own", clientId: next.client_id, accessToken: next.access_token, accountKey: null };
    }
    const og = ogAuth();
    if (!og) throw signedOutError();
    return assertOgFresh(og);
  }
  async function ogGet(path, ttl, withHeaders = false) {
    const first = ogAuth();
    if (!first) throw new MissingClientIdError();
    if (first.expiresAt != null && first.expiresAt <= Date.now()) throw ogLookupExpiredError();
    const url = `${API.base}${path}`;
    const read = (auth) => withHeaders ? getJSONWithHeaders(url, { headers: authHeaders(auth) }) : getJSON(url, { ttl, headers: authHeaders(auth) });
    try {
      return await read(first);
    } catch (error) {
      if (error?.status !== 401) throw error;
      const latest = ogAuth();
      if (!latest) throw new MissingClientIdError();
      if (latest.expiresAt != null && latest.expiresAt <= Date.now()) throw ogLookupExpiredError();
      if (!sameAuth(latest, first)) throw sessionChangedError();
      if (latest.accessToken === first.accessToken) throw ogLookupExpiredError();
      try {
        return await read(latest);
      } catch (retryError) {
        if (retryError?.status === 401) throw ogLookupExpiredError();
        throw retryError;
      }
    }
  }
  function paginationPages(headers2) {
    const raw = headerValue(headers2, "x-pagination-page-count");
    if (raw == null || raw === "") return null;
    const pages = Number(raw);
    return Number.isSafeInteger(pages) && pages >= 0 ? pages : null;
  }
  async function apiGet(path, { ttl = CACHE_TTL, withHeaders = false } = {}) {
    const clientId = getClientId();
    if (clientId) {
      if (!withHeaders) return getJSON(`${API.base}${path}`, { ttl, headers: apiHeaders(clientId) });
      const { data: data2, headers: headers3 } = await getJSONWithHeaders(`${API.base}${path}`, { headers: apiHeaders(clientId) });
      return { data: data2, pages: paginationPages(headers3) };
    }
    if (!withHeaders) return ogGet(path, ttl);
    const { data, headers: headers2 } = await ogGet(path, ttl, true);
    return { data, pages: paginationPages(headers2) };
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
  function apiAuth(method, path, body, options = {}, control = {}) {
    return authenticated(method, path, body, options, false, control);
  }
  function apiAuthPage(path, options = {}) {
    return authenticated("GET", path, void 0, options, true, {});
  }
  async function authenticated(method, path, body, options, metadata, control) {
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
    const url = `${API.base}${requestPath}`;
    const exchange = () => sendAuthenticated(method, url, body, metadata, method === "GET" ? null : control);
    if (method === "GET") return exchange();
    const entry = createWriteEntry(control);
    entry.check();
    return enqueueWrite(entry, () => sendAuthenticated(method, url, body, metadata, entry));
  }
  async function sendAuthenticated(method, url, body, metadata, entry) {
    const origin = entry?.generation ?? observedGeneration();
    const checkOrigin = () => {
      if (getSessionGeneration() === origin) return;
      if (entry) entry.check();
      throw sessionChangedError();
    };
    let refreshed = false;
    let renewed = false;
    let rateRetries = 0;
    for (; ; ) {
      checkOrigin();
      if (entry) await waitForTurn(entry);
      const auth = await ensureAuth();
      if (entry) entry.check();
      checkOrigin();
      if (!sameAuth(currentAuth(), auth)) throw sessionChangedError();
      let response;
      let sent = auth;
      try {
        response = await privateRequest(url, {
          method,
          headers: authHeaders(auth),
          body: body == null ? null : JSON.stringify(body),
          signal: entry?.signal ?? void 0,
          ...entry ? {
            beforeSend() {
              entry.check();
              const current = currentAuth();
              if (!current) throw signedOutError();
              assertOgFresh(current);
              entry.check();
              sent = current;
              nextWriteAt = Date.now() + WRITE_INTERVAL_MS;
              return { headers: authHeaders(current) };
            }
          } : {}
        });
      } catch (error) {
        if (entry?.signal?.aborted) throw cancelledError();
        throw error;
      }
      if (response.status === 401) {
        checkOrigin();
        if (sent.kind === "og") {
          if (renewed) throw ogSessionExpiredError();
          const latest2 = ogAuth();
          if (!latest2) throw ogSessionExpiredError();
          if (!sameAuth(latest2, sent)) throw sessionChangedError();
          assertOgFresh(latest2);
          if (latest2.accessToken === sent.accessToken) throw ogSessionExpiredError();
          renewed = true;
          continue;
        }
        if (refreshed) {
          clearTokens();
          throw authError("Trakt session expired; sign in again.", 401);
        }
        const latest = readTokens();
        if (!latest) throw signedOutError();
        if (latest.access_token === sent.accessToken) await refreshTokens();
        refreshed = true;
        continue;
      }
      checkOrigin();
      if (!sameAuth(currentAuth(), sent)) throw sessionChangedError();
      if (response.status === 429 && entry) {
        const delay = retryDelay(response.headers, rateRetries);
        blockWrites(delay, entry.generation);
        if (rateRetries < WRITE_RETRIES && delay <= MAX_RETRY_WAIT_MS) {
          rateRetries += 1;
          continue;
        }
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
  }

  // src/features/custom-links/api.js
  function getShowDetails(id) {
    return apiGet(`/shows/${encodeURIComponent(id)}`);
  }
  function getEpisode(id, season, episode) {
    return apiGet(`/shows/${encodeURIComponent(id)}/seasons/${season}/episodes/${episode}`);
  }

  // src/features/custom-links/index.js
  var PANEL_ID = "ogt-custom-links";
  var TITLE_ID = "ogt-custom-links-title";
  var MANAGER_ID = "ogt-custom-links-manager";
  var FALLBACK_ATTR = "data-ogt-watch-fallback";
  var WATCH_ATTR = "data-ogt-watch-now";
  var SERVER_FIELDS = [
    { key: "jellyfin", label: "Jellyfin", placeholder: "http://192.168.1.20:8096" },
    { key: "emby", label: "Emby", placeholder: "http://192.168.1.20:8096" },
    { key: "radarr", label: "Radarr", placeholder: "http://192.168.1.20:7878" },
    { key: "sonarr", label: "Sonarr", placeholder: "http://192.168.1.20:8989" },
    { key: "seerr", label: "Seerr", placeholder: "http://192.168.1.20:5055" }
  ];
  function desktopTarget(aside) {
    const external = aside.querySelector("ul.external-links");
    if (external) return { parent: external.parentElement, before: external };
    const watchNow = aside.querySelector(".watch-now");
    if (watchNow) {
      const next = watchNow.nextElementSibling;
      return { parent: watchNow.parentElement, before: next?.tagName === "DIALOG" ? next.nextSibling : watchNow.nextSibling };
    }
    const poster = aside.querySelector(".summary-poster");
    const holder = poster?.closest("a.poster-link") || poster;
    if (holder?.parentElement) return { parent: holder.parentElement, before: holder.nextSibling };
    return { parent: aside, before: null };
  }
  function findMountTarget() {
    const aside = document.querySelector("aside.sidebar");
    if (aside) return desktopTarget(aside);
    const top = document.querySelector("#overview .top") || document.querySelector(".summary-frame .top");
    if (top?.parentElement) return { parent: top.parentElement, before: top.nextSibling };
    return null;
  }
  function seasonLabel(number) {
    return number === 0 ? "Specials" : `Season ${number}`;
  }
  var ICON_ADD = "M12 5v14M5 12h14";
  var ICON_SERVER = "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01";
  var ICON_EDIT = "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4";
  function manageButton(name, text3, d) {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("aria-hidden", "true");
    svg3.setAttribute("focusable", "false");
    const path = document.createElementNS(svg3.namespaceURI, "path");
    for (const [key, value] of Object.entries({
      d,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    })) path.setAttribute(key, value);
    svg3.append(path);
    return el(
      "button",
      { class: "ogt-manage-button", type: "button", "aria-label": name, title: name },
      svg3,
      el("span", { text: text3 })
    );
  }
  function compactLink(entry, attachResolver) {
    const label = entry.label.trim() || "Custom link";
    const icon4 = serviceIcon(entry.icon);
    const variant = !icon4 ? "text" : entry.surface === "reference" ? "icon" : "tile";
    const link = el(
      "a",
      {
        class: `ogt-service-link ogt-service-link--${variant}`,
        href: entry.href,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": label,
        "data-ogt-tooltip": label,
        "data-ogt-surface": entry.surface,
        style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : void 0
      },
      icon4,
      variant === "icon" ? null : el("span", { class: "ogt-service-label", text: label })
    );
    attachResolver?.(link, entry.source);
    return link;
  }
  var SURFACE_NOTES = { watch: "Your service", library: "Add to library" };
  function watchLink(entry, attachResolver) {
    const label = entry.label.trim() || "Custom link";
    const link = el(
      "a",
      {
        class: "ogt-watch-now-link",
        href: entry.href,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": label,
        "data-ogt-surface": entry.surface,
        style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : void 0
      },
      el("span", { class: "ogt-watch-now-card" }, serviceIcon(entry.icon), el("span", { class: "ogt-service-name", text: label })),
      el("span", { class: "ogt-watch-now-note", text: SURFACE_NOTES[entry.surface] || "Your link" })
    );
    attachResolver?.(link, entry.source);
    return link;
  }
  function signatureFor(entries) {
    return JSON.stringify(entries.map(({ label, href, icon: icon4, surface }) => [label, href, icon4, surface]));
  }
  function watchNowContainers() {
    const containers = [];
    for (const watchNow of document.querySelectorAll(".watch-now")) {
      const parent = watchNow.parentElement;
      if (!parent) continue;
      for (const child of parent.children) {
        if (child.tagName !== "DIALOG") continue;
        const links = child.querySelector(".streaming-links");
        if (!links || !/watch now/i.test(child.textContent || "")) continue;
        if (!containers.includes(links)) containers.push(links);
      }
    }
    return containers;
  }
  function createPanel(meta, route) {
    let cancelled = false;
    let seasons = [];
    const timers = [];
    const fixedSelection = route.name === "season" || route.name === "episode";
    let selection = meta.kind === "person" ? { season: null, episode: null } : selectionForRoute(route, fixedSelection ? null : getSelection(meta.kind, meta.id));
    const linksRow = el("div", { class: "ogt-links" });
    const controlsRow = el("div", { class: "ogt-row ogt-fields", hidden: true });
    const watchFallback = el("div", { class: "ogt-watch-fallback", hidden: true, [FALLBACK_ATTR]: "" });
    const editor = el("div", { class: "ogt-editor", hidden: true });
    const presetChecklist = el("div", { class: "ogt-presets", hidden: true });
    const serversPanel = el("div", { class: "ogt-servers", hidden: true });
    const presetsButton = manageButton("Add presets…", "Presets", ICON_ADD);
    const serversButton = manageButton("Servers…", "Servers", ICON_SERVER);
    const editButton = manageButton("Edit links", "Edit", ICON_EDIT);
    const closeButton = el("button", { class: "ogt-manager-close", type: "button", text: "Close" });
    const manager = el(
      "dialog",
      { class: "ogt-manager", id: MANAGER_ID, "aria-labelledby": `${MANAGER_ID}-title` },
      el(
        "div",
        { class: "ogt-manager-panel" },
        el(
          "header",
          { class: "ogt-manager-head" },
          el("h2", { class: "ogt-manager-title", id: `${MANAGER_ID}-title`, text: "Custom links" }),
          closeButton
        ),
        el("div", { class: "ogt-manager-body" }, editor, presetChecklist, serversPanel)
      )
    );
    const node = el(
      "section",
      { class: "ogt-panel ogt-links-compact", id: PANEL_ID, "aria-labelledby": TITLE_ID },
      el(
        "div",
        { class: "ogt-links-head" },
        el("h2", { class: "ogt-visually-hidden", id: TITLE_ID, text: "Custom links" }),
        linksRow
      ),
      watchFallback,
      controlsRow,
      el("div", { class: "ogt-links-manage" }, presetsButton, serversButton, editButton)
    );
    const episodeImdbs = /* @__PURE__ */ new Map();
    const episodeKey = () => `${selection.season}:${selection.episode}`;
    const vars = () => meta.kind === "person" ? personTemplateVars(meta) : templateVars(
      meta.episodeImdb ? meta : { ...meta, episodeImdb: episodeImdbs.get(episodeKey()) ?? null },
      selection,
      getServers()
    );
    function resolverInput(service) {
      return {
        service,
        kind: meta.kind,
        tmdb: meta.tmdb,
        imdb: meta.imdb,
        directUrl: service === "metacritic" ? meta.metacriticUrl : meta.rottenTomatoesUrl,
        context: { kind: meta.kind, routeName: route.name, season: selection.season, episode: selection.episode }
      };
    }
    function attachResolver(link, source) {
      const service = presetResolver(source, meta.kind);
      if (!service || link.dataset.ogtResolver) return;
      link.dataset.ogtResolver = service;
      const cached = peekExternalUrl(resolverInput(service));
      if (cached) link.setAttribute("href", cached);
      const activate = () => {
        const input = resolverInput(service);
        const exact = peekExternalUrl(input);
        if (exact) {
          if (link.getAttribute("href") !== exact) link.setAttribute("href", exact);
          return;
        }
        const fallbackHref = link.getAttribute("href");
        const pageHref = location.href;
        resolveExternalUrl(input).then((url) => {
          if (!url || cancelled || !link.isConnected || location.href !== pageHref) return;
          if (link.getAttribute("href") !== fallbackHref) return;
          link.setAttribute("href", url);
        }).catch((error) => {
          if (!cancelled) debugError(`${service} lookup failed`, error);
        });
      };
      link.addEventListener("pointerenter", activate);
      link.addEventListener("focusin", activate);
      link.addEventListener("click", activate);
      link.addEventListener("auxclick", (event) => {
        if (event.button === 1) activate();
      });
    }
    let currentView = null;
    let returnFocus = null;
    let draft = [];
    let nextDraftId = 0;
    let selectedPresets = /* @__PURE__ */ new Set();
    let renderedEntries = [];
    function restoreFocus(target) {
      if (cancelled || !target?.isConnected) return;
      target.focus?.();
    }
    function closeTools() {
      currentView = null;
      editor.hidden = true;
      presetChecklist.hidden = true;
      serversPanel.hidden = true;
      const target = returnFocus;
      returnFocus = null;
      if (manager.open) {
        manager.close();
        restoreFocus(target);
      } else {
        manager.removeAttribute("open");
        restoreFocus(target);
      }
    }
    function openManager(view, opener, render) {
      currentView = view;
      returnFocus = opener;
      editor.hidden = view !== "editor";
      presetChecklist.hidden = view !== "presets";
      serversPanel.hidden = view !== "servers";
      if (typeof manager.showModal === "function") {
        if (!manager.open) manager.showModal();
      } else {
        manager.setAttribute("open", "");
      }
      render();
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
      returnFocus = editButton;
      draft = getCustomLinks().map((link) => ({ ...link, id: nextDraftId++ }));
      openManager("editor", editButton, () => renderEditor(draft.length ? `${draft[0].id}-label` : "add-link"));
    }
    function renderServers() {
      serversPanel.replaceChildren();
      const servers = getServers();
      const list = el("div", { class: "ogt-server-list" });
      const inputs = {};
      for (const field of SERVER_FIELDS) {
        const input = el("input", {
          class: "ogt-editor-input",
          type: "text",
          value: servers[field.key] || "",
          placeholder: field.placeholder,
          "aria-label": `${field.label} URL`,
          "data-focus": `${field.key}-url`
        });
        inputs[field.key] = input;
        list.append(el("label", { class: "ogt-editor-field" }, field.label, input));
      }
      const error = el("p", { class: "ogt-editor-error", role: "alert", hidden: true });
      const save = el("button", { class: "ogt-chip", type: "button", text: "Save servers" });
      save.addEventListener("click", () => {
        const next = {};
        for (const field of SERVER_FIELDS) {
          const raw = inputs[field.key].value.trim();
          if (!raw) continue;
          const normalized = normalizeServerUrl(raw);
          if (!normalized) {
            error.textContent = `${field.label}: enter a valid host or http(s) URL.`;
            error.hidden = false;
            inputs[field.key].focus();
            return;
          }
          next[field.key] = normalized;
        }
        setServers(next);
        renderLinks();
        closeTools();
      });
      const cancel = el("button", { class: "ogt-chip", type: "button", text: "Cancel" });
      cancel.addEventListener("click", closeTools);
      serversPanel.append(
        el("p", {
          class: "ogt-hint",
          text: "Enter the base URL of your own server. Bare hosts use http://; HTTPS and base paths are supported. Credentials, query strings and fragments are not."
        }),
        list,
        error,
        el("div", { class: "ogt-row ogt-editor-footer" }, save, cancel)
      );
      serversPanel.querySelector("input")?.focus();
    }
    function openServers() {
      returnFocus = serversButton;
      openManager("servers", serversButton, renderServers);
    }
    function renderPresetChecklist() {
      const links = getCustomLinks();
      const servers = getServers();
      const presets = filterPresetsByKind(PRESETS, meta.kind, meta.genres);
      const list = el("div", { class: "ogt-preset-list" });
      selectedPresets = /* @__PURE__ */ new Set();
      for (const [index, preset] of presets.entries()) {
        const added = presetAlreadyAdded(links, preset);
        const needsServer = Boolean(preset.requires && !servers[preset.requires]);
        const checkbox = el("input", {
          type: "checkbox",
          value: preset.url,
          disabled: added || needsServer,
          "aria-label": preset.label
        });
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selectedPresets.add(preset.url);
          else selectedPresets.delete(preset.url);
        });
        const label = el(
          "label",
          { class: "ogt-preset-item", for: `${MANAGER_ID}-preset-${index}` },
          checkbox,
          el("span", { text: preset.label }),
          added ? el("span", { class: "ogt-preset-added", text: "added" }) : needsServer ? el("span", { class: "ogt-preset-added", text: "set server URL" }) : null
        );
        checkbox.id = `${MANAGER_ID}-preset-${index}`;
        list.append(label);
      }
      const error = el("p", {
        class: "ogt-hint",
        text: "Choose the services you want to add. Server presets need a URL under Servers… first."
      });
      const confirm = el("button", { class: "ogt-chip", type: "button", text: "Add selected" });
      confirm.addEventListener("click", () => {
        const selected = presets.filter((preset) => selectedPresets.has(preset.url));
        if (selected.length) {
          setCustomLinks(addPresets(getCustomLinks(), selected));
          onRefresh();
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
      returnFocus = presetsButton;
      openManager("presets", presetsButton, () => {
        renderPresetChecklist();
        const firstChoice = presetChecklist.querySelector('input[type="checkbox"]:not(:disabled)');
        (firstChoice || presetChecklist.querySelector("button"))?.focus();
      });
    }
    function onKeyDown(event) {
      if (event.key === "Escape" && currentView) {
        event.preventDefault();
        closeTools();
      }
    }
    presetsButton.addEventListener("click", openPresets);
    serversButton.addEventListener("click", openServers);
    editButton.addEventListener("click", openEditor);
    closeButton.addEventListener("click", closeTools);
    manager.addEventListener("keydown", onKeyDown);
    manager.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeTools();
    });
    manager.addEventListener("close", () => {
      currentView = null;
      editor.hidden = true;
      presetChecklist.hidden = true;
      serversPanel.hidden = true;
      const target = returnFocus;
      returnFocus = null;
      restoreFocus(target);
    });
    function renderLinks() {
      const values = vars();
      const entries = resolveCustomLinks(getCustomLinks(), values, meta.kind, meta.genres);
      renderedEntries = entries;
      linksRow.replaceChildren();
      if (!entries.length) {
        linksRow.append(
          el("p", { class: "ogt-hint", text: "Add links to your own services: Plex, Jellyfin, Sonarr, or any URL." })
        );
      }
      const services = entries.filter((entry) => entry.surface !== "reference" && hasServiceIcon(entry.icon));
      const logos = entries.filter((entry) => entry.surface === "reference" && hasServiceIcon(entry.icon));
      const texts = entries.filter((entry) => !hasServiceIcon(entry.icon));
      for (const [kind, group] of [["services", services], ["logos", logos], ["texts", texts]]) {
        if (group.length) linksRow.append(el("div", { class: `ogt-links-group ogt-links-${kind}` }, group.map((entry) => compactLink(entry, attachResolver))));
      }
      syncWatchNow(entries);
      lookUpShow(values);
      lookUpEpisode();
    }
    function syncWatchNow(entries = renderedEntries) {
      const watch = watchNowLinks(entries);
      const containers = watchNowContainers();
      for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) {
        if (!containers.includes(section.parentElement)) section.remove();
      }
      if (!watch.length) {
        watchFallback.hidden = true;
        watchFallback.replaceChildren();
        delete watchFallback.dataset.ogtSignature;
        return;
      }
      const signature = signatureFor(watch);
      for (const container of containers) {
        const existing = container.querySelector(`:scope > [${WATCH_ATTR}]`);
        if (existing?.dataset.ogtSignature === signature) continue;
        existing?.remove();
        container.append(
          el(
            "div",
            { class: "ogt-watch-now-section", [WATCH_ATTR]: "", "data-ogt-signature": signature },
            el(
              "h3",
              { class: "section-title" },
              "Your services",
              el("span", { class: "count", text: String(watch.length) })
            ),
            el("div", { class: "tiles ogt-watch-now-tiles" }, watch.map((entry) => watchLink(entry, attachResolver)))
          )
        );
      }
      if (!containers.length) {
        if (watchFallback.dataset.ogtSignature !== signature) {
          watchFallback.replaceChildren(
            el(
              "div",
              { class: "ogt-watch-fallback-head" },
              el("span", { class: "ogt-watch-fallback-title", text: "Watch Now" }),
              el("span", { class: "ogt-watch-fallback-note", text: "your links" })
            ),
            el("div", { class: "ogt-watch-now-tiles" }, watch.map((entry) => watchLink(entry, attachResolver)))
          );
          watchFallback.dataset.ogtSignature = signature;
        }
        watchFallback.hidden = false;
      } else {
        watchFallback.hidden = true;
      }
    }
    let showRequested = false;
    function lookUpShow(values) {
      if (!fixedSelection || showRequested || !getClientId()) return;
      const missing = ["year", "tmdb", "imdb", "tvdb"].filter((key) => meta[key] == null);
      if (!missing.length) return;
      const needed = missing.flatMap((key) => key === "imdb" ? ["{imdb}", "{imdbnum}"] : [`{${key}}`]);
      if (!getCustomLinks().some((entry) => presetTemplateUrls(entry.url, meta.kind).some((template) => needed.some((placeholder) => template.includes(placeholder)))))
        return;
      showRequested = true;
      getShowDetails(route.id).then((show) => setMeta(showTemplateData(show))).catch((error) => {
        if (!cancelled) debugError("show lookup failed", error);
      });
    }
    function lookUpEpisode() {
      if (meta.kind !== "show" || meta.episodeImdb || !getClientId()) return;
      const { season, episode } = selection;
      if (season == null || episode == null) return;
      const key = episodeKey();
      if (episodeImdbs.has(key)) return;
      if (!getCustomLinks().some((entry) => presetTemplateUrls(entry.url, meta.kind).some((template) => /\{episodeimdb(?:num)?\}/.test(template))))
        return;
      episodeImdbs.set(key, null);
      getEpisode(meta.id, season, episode).then((data) => {
        if (cancelled) return;
        const imdb = typeof data?.ids?.imdb === "string" && /^tt\d+$/.test(data.ids.imdb) ? data.ids.imdb : null;
        episodeImdbs.set(key, imdb);
        if (imdb && key === episodeKey()) renderLinks();
      }).catch((error) => {
        if (cancelled) return;
        episodeImdbs.delete(key);
        debugError("episode lookup failed", error);
      });
    }
    function needsSelection() {
      return !fixedSelection && getCustomLinks().some((entry) => presetTemplateUrls(entry.url, meta.kind).some((template) => /\{(?:season|episode)\}/.test(template)));
    }
    function persistSelection() {
      if (!fixedSelection && selection.season != null) setSelection(meta.kind, meta.id, selection);
    }
    const seasonSelect = el("select", { class: "ogt-select", "aria-label": "Season" });
    const episodeSlot = el("span", { class: "ogt-episode" });
    const seasonField = el("label", { class: "ogt-field" }, el("span", { class: "ogt-visually-hidden", text: "Season" }), seasonSelect);
    const episodeField = el("label", { class: "ogt-field" }, el("span", { class: "ogt-visually-hidden", text: "Episode" }), episodeSlot);
    let controlsBuilt = false;
    function ensureControls() {
      if (controlsBuilt) return;
      seasonSelect.addEventListener("change", () => {
        selection.season = Number(seasonSelect.value);
        selection.episode = 1;
        persistSelection();
        renderEpisodeField();
        renderLinks();
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
            renderLinks();
          } else {
            input.value = String(selection.episode);
          }
        });
        episodeSlot.replaceChildren(el("span", { class: "ogt-field-prefix", "aria-hidden": "true", text: "Ep." }), input);
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
        renderLinks();
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
    function place() {
      const target = findMountTarget();
      if (!target) return;
      if (target.before) {
        if (node.parentElement === target.parent && node.nextSibling === target.before) return;
        target.parent.insertBefore(node, target.before);
      } else {
        if (node.parentElement === target.parent && !node.nextSibling) return;
        target.parent.append(node);
      }
    }
    let watchTimer = null;
    const observer = new MutationObserver(() => {
      if (cancelled || watchTimer) return;
      watchTimer = setTimeout(() => {
        watchTimer = null;
        if (cancelled) return;
        place();
        syncWatchNow(renderedEntries);
      }, 60);
    });
    function observeAreas() {
      observer.disconnect();
      const roots = /* @__PURE__ */ new Set();
      const aside = document.querySelector("aside.sidebar");
      const overview = document.querySelector("#overview");
      if (aside) roots.add(aside);
      if (overview) roots.add(overview);
      if (!roots.size) roots.add(document.querySelector(".summary-frame") || document.body);
      for (const root2 of roots) observer.observe(root2, { childList: true, subtree: true });
    }
    document.addEventListener("ogt:refresh", onRefresh);
    observeAreas();
    renderLinks();
    if (meta.kind === "show" && needsSelection()) loadSeasons();
    else renderControls();
    return {
      node,
      manager,
      place,
      destroy() {
        cancelled = true;
        if (watchTimer) clearTimeout(watchTimer);
        watchTimer = null;
        for (const timer of timers) clearTimeout(timer);
        timers.length = 0;
        observer.disconnect();
        document.removeEventListener("ogt:refresh", onRefresh);
        for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) section.remove();
        watchFallback.replaceChildren();
        if (manager.open) manager.close();
        manager.remove();
        node.remove();
      }
    };
  }
  var customLinks = {
    id: "custom-links",
    match(route) {
      return route.kind === "movie" || route.kind === "show" || route.kind === "person";
    },
    mount(route) {
      if (document.getElementById(PANEL_ID)) return null;
      const meta = route.kind === "person" ? readPersonData(document, route) : readTitleData(document, route);
      if (!meta.id) return null;
      const target = findMountTarget();
      if (!target) return null;
      const panel = createPanel(meta, route);
      document.body.append(panel.manager);
      target.parent.insertBefore(panel.node, target.before);
      panel.place();
      return panel;
    }
  };

  // src/features/playback/data.js
  var DAY = 24 * 60 * 60 * 1e3;
  var MOVIE_IDS = ["trakt", "slug", "imdb", "tmdb"];
  var EPISODE_IDS = ["trakt", "imdb", "tmdb", "tvdb"];
  function pickIds(ids, keys) {
    if (!ids || typeof ids !== "object") return null;
    for (const key of keys) {
      const value = ids[key];
      const valid = key === "trakt" || key === "tmdb" || key === "tvdb" ? Number.isSafeInteger(value) && value > 0 : typeof value === "string" && value.trim() !== "";
      if (valid) return { [key]: typeof value === "string" ? value.trim() : value };
    }
    return null;
  }
  function normalizeProgress(value) {
    if (value == null || typeof value === "string" && value.trim() === "") return null;
    const progress = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(progress)) return null;
    const rounded = Math.round(progress * 10) / 10;
    return rounded >= 1 && rounded <= 100 ? rounded : null;
  }
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
        year: Number.isInteger(media.year) ? media.year : null,
        episodeIds: kind === "episode" && episode.ids && typeof episode.ids === "object" ? { ...episode.ids } : null,
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
  function scrobbleBody(item, progress, episodeIds = null) {
    const value = normalizeProgress(progress);
    if (!item || value == null) throw new Error("Invalid progress.");
    if (item.kind === "movie") {
      const ids2 = pickIds(item.ids, MOVIE_IDS);
      if (!ids2) throw new Error("Could not identify this title.");
      const movie = { ids: ids2 };
      if (typeof item.title === "string" && item.title.trim()) movie.title = item.title.trim();
      if (Number.isInteger(item.year)) movie.year = item.year;
      return { movie, progress: value };
    }
    const ids = pickIds(episodeIds ?? item.episodeIds, EPISODE_IDS);
    if (!ids) throw new Error("Could not identify this episode.");
    return { episode: { ids }, progress: value };
  }
  function matchesRoute(item, route) {
    const kind = route.name === "episode" ? "episode" : route.kind;
    return item.kind === kind && [item.ids.slug, item.ids.trakt].some((id) => id != null && String(id) === route.id) && (kind !== "episode" || item.season === route.season && item.episode === route.episode);
  }

  // src/features/playback/api.js
  var TTL = 6e4;
  function writeRequest(auth, method, path, body, control) {
    const guard = control?.active || control?.signal ? { active: control.active, signal: control.signal } : void 0;
    if (guard) return auth(method, path, body, void 0, guard);
    return body === void 0 ? auth(method, path) : auth(method, path, body);
  }
  function createPlaybackApi({ auth = apiAuth, get = apiGet, signedIn = isSignedIn, now = Date.now } = {}) {
    const cache4 = /* @__PURE__ */ new Map();
    const flights2 = /* @__PURE__ */ new Map();
    let revision = 0;
    let session = 0;
    function invalidate() {
      revision += 1;
      cache4.clear();
      flights2.clear();
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
      const hit = cache4.get(kind);
      if (hit && hit.until > now()) return hit.items;
      if (flights2.has(kind)) return flights2.get(kind);
      const rev = revision;
      const epoch = session;
      const flight = (async () => {
        const rows = await auth("GET", `/sync/playback/${kind === "movie" ? "movies" : "episodes"}`, void 0, { extended: "images" });
        if (epoch !== session || !signedIn()) throw new Error("Playback session changed.");
        if (!Array.isArray(rows)) throw new Error("Invalid playback response.");
        const items = mapPlayback(rows, kind);
        if (rev === revision) cache4.set(kind, { items, until: now() + TTL });
        return items;
      })();
      flights2.set(kind, flight);
      try {
        return await flight;
      } finally {
        if (flights2.get(kind) === flight) flights2.delete(kind);
      }
    }
    async function loadAll({ force = false } = {}) {
      if (force) invalidate();
      const [movies, episodes] = await Promise.all([load("movie"), load("episode")]);
      return sortPlayback([...movies, ...episodes]);
    }
    async function clearItems(ids, confirm, control = {}) {
      const unique = [...new Set(ids)];
      if (unique.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Invalid playback ID.");
      if (!signedIn()) throw new Error("Sign in to Trakt first.");
      const active2 = () => !control.active || control.active() !== false;
      const epoch = session;
      if (!unique.length || !await confirm(`Clear paused playback for ${unique.length} item${unique.length === 1 ? "" : "s"}? This cannot be undone.`)) {
        return { cancelled: true, cleared: [], failed: [] };
      }
      if (session !== epoch || !signedIn() || !active2()) return { cancelled: true, cleared: [], failed: [] };
      let cursor = 0;
      const cleared = [];
      const failed = [];
      try {
        await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
          while (cursor < unique.length) {
            const id = unique[cursor++];
            if (session !== epoch || !signedIn() || !active2()) {
              failed.push(id);
              continue;
            }
            try {
              await writeRequest(auth, "DELETE", `/sync/playback/${id}`, void 0, control);
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
    async function episodeIdsFor(item) {
      if (pickIds(item.episodeIds, EPISODE_IDS)) return item.episodeIds;
      if (!item.ids || !Number.isInteger(item.season) || !Number.isInteger(item.episode)) {
        throw new Error("Could not identify this episode.");
      }
      const showId = item.ids.slug || item.ids.trakt;
      if (!showId) throw new Error("Could not identify this episode.");
      const episode = await get(`/shows/${encodeURIComponent(showId)}/seasons/${item.season}/episodes/${item.episode}`);
      if (!pickIds(episode?.ids, EPISODE_IDS)) throw new Error("Could not identify this episode.");
      return episode.ids;
    }
    async function setProgress(item, progress, epoch = session, control = {}) {
      if (!signedIn()) throw new Error("Sign in to Trakt first.");
      const value = normalizeProgress(progress);
      if (!item || value == null) throw new Error("Invalid progress.");
      const episodeIds = item.kind === "movie" ? null : await episodeIdsFor(item);
      if (epoch !== session || !signedIn()) throw new Error("Playback session changed.");
      const body = scrobbleBody(item, value, episodeIds);
      await writeRequest(auth, "POST", "/scrobble/start", body, control);
      invalidate();
      try {
        if (epoch !== session || !signedIn()) throw new Error("Playback session changed.");
        await writeRequest(auth, "POST", "/scrobble/pause", body);
      } catch (error) {
        error.partial = true;
        throw error;
      } finally {
        invalidate();
      }
      return { progress: value, body };
    }
    async function setRouteProgress(route, progress, control = {}) {
      if (!signedIn()) throw new Error("Sign in to Trakt first.");
      const value = normalizeProgress(progress);
      if (value == null) throw new Error("Invalid progress.");
      if (!route?.id) throw new Error("Unsupported playback page.");
      const epoch = session;
      if (route.kind === "movie") {
        const movie = await get(`/movies/${encodeURIComponent(route.id)}`);
        return setProgress({ kind: "movie", ids: movie?.ids, title: movie?.title, year: movie?.year }, value, epoch, control);
      }
      if (route.name !== "episode" || !Number.isInteger(route.season) || !Number.isInteger(route.episode)) {
        throw new Error("Unsupported playback page.");
      }
      const episode = await get(`/shows/${encodeURIComponent(route.id)}/seasons/${route.season}/episodes/${route.episode}`);
      return setProgress({ kind: "episode", episodeIds: episode?.ids, season: route.season, episode: route.episode }, value, epoch, control);
    }
    return { load, loadAll, clearItems, setProgress, setRouteProgress, invalidate, resetSession };
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
    const kind = route.kind === "movie" ? "movie" : "episode";
    let destroyed = false;
    let session = 0;
    let dialogControl = null;
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
    function alive2(epoch = session) {
      return !destroyed && isSignedIn() && epoch === session;
    }
    function closeDialog() {
      dialogControl?.abort();
      dialogControl = null;
    }
    function lock(next) {
      busy = next;
      node.setAttribute("aria-busy", String(next));
      for (const input of node.querySelectorAll("button, input")) input.disabled = next;
    }
    function render() {
      if (!alive2()) return;
      content.replaceChildren();
      if (!overview) {
        const item = items.find((row) => matchesRoute(row, route));
        node.hidden = false;
        if (!item) {
          content.append(el("p", { class: "ogt-hint", text: "No saved playback." }), button("Save progress…", "save"));
          return;
        }
        const save = button("Save progress…", "save");
        save.dataset.id = String(item.id);
        const clear2 = button("Clear", "one");
        clear2.dataset.id = String(item.id);
        content.append(el(
          "div",
          { class: "ogt-playback__tools" },
          el("span", { text: `${percent(item.progress)} paused` }),
          el("progress", { class: "ogt-playback__meter", max: 100, value: item.progress, "aria-label": "Saved playback progress" }),
          save,
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
        const save = button("Save progress…", "save");
        save.dataset.id = String(item.id);
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
          save,
          clear2
        ));
      }
      content.append(tools, list);
    }
    async function read(force = false) {
      const epoch = session;
      const next = overview ? await playbackApi.loadAll({ force }) : await playbackApi.load(kind, { force });
      if (!alive2(epoch)) return;
      items = next;
      loaded = true;
      render();
    }
    async function clear(ids) {
      if (!ids.length) {
        status.textContent = "No paused items selected.";
        return;
      }
      const epoch = session;
      const control = new AbortController();
      dialogControl = control;
      const result = await playbackApi.clearItems(ids, async (message2) => {
        const ok = await confirmDialog(message2, { title: "Clear paused playback", ok: "Clear", signal: control.signal });
        if (dialogControl === control) dialogControl = null;
        if (ok && alive2(epoch)) status.textContent = `Clearing ${ids.length > 1 ? `${ids.length} items` : "1 item"}…`;
        return ok && alive2(epoch);
      }, { active: () => alive2(epoch) });
      if (dialogControl === control) dialogControl = null;
      if (result.cancelled || !alive2(epoch)) return;
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
      if (!alive2(epoch)) return;
      if (!overview && node.hidden) toast(`Paused playback: ${message}`);
      else status.textContent = message;
    }
    async function saveProgress(item) {
      const epoch = session;
      status.textContent = "";
      const title = item?.title ?? "this title";
      const control = new AbortController();
      dialogControl = control;
      const value = await promptDialog(`Set the saved progress for ${title}. Trakt saves it by starting and pausing playback, so your profile may briefly show it as watching.`, {
        title: "Save progress",
        label: "Progress (%)",
        ok: "Save progress",
        inputMode: "decimal",
        placeholder: "1–100",
        value: item ? String(Number(item.progress.toFixed(1))) : "",
        signal: control.signal,
        validate: (text3) => normalizeProgress(text3) == null ? "Enter a percentage from 1 to 100." : null
      });
      if (dialogControl === control) dialogControl = null;
      if (value == null || !alive2(epoch)) return;
      const progress = normalizeProgress(value);
      if (progress == null) return;
      status.textContent = "Saving progress…";
      try {
        if (item) await playbackApi.setProgress(item, progress, void 0, { active: () => alive2(epoch) });
        else await playbackApi.setRouteProgress(route, progress, { active: () => alive2(epoch) });
      } catch (error) {
        if (!error.partial) throw error;
        debugError("playback pause failed after start", error);
        if (!alive2(epoch)) return;
        items = [];
        render();
        await read(true).catch(() => {
        });
        if (alive2(epoch)) status.textContent = "Trakt started playback but did not save the pause, so earlier progress for this title was removed; try again.";
        return;
      }
      if (!alive2(epoch)) return;
      items = [];
      render();
      try {
        await read(true);
      } catch (error) {
        debugError("playback refresh failed", error);
        status.textContent = "Progress saved, but playback could not be refreshed.";
        return;
      }
      if (alive2(epoch)) status.textContent = "Progress saved.";
    }
    async function onClick(event) {
      const target = event.target.closest("button[data-action]");
      if (!target || !node.contains(target) || busy || !alive2()) return;
      const epoch = session;
      const action = target.dataset.action;
      lock(true);
      try {
        if (action === "load") {
          status.textContent = "Loading paused playback…";
          await read(true);
          if (alive2(epoch)) status.textContent = "";
        } else if (action === "save") {
          const item = target.dataset.id ? items.find((row) => row.id === Number(target.dataset.id)) : null;
          if (target.dataset.id && !item) return;
          await saveProgress(item);
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
        if (alive2(epoch)) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.ogSession ? error.message : action === "save" ? "Could not save progress; try again." : "Could not load paused playback; try again.";
      } finally {
        if (alive2(epoch)) lock(false);
      }
    }
    function onChange(event) {
      if (!alive2()) return;
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
      const epoch = session;
      read().catch((error) => {
        if (alive2(epoch)) debugError("playback badge lookup failed", error);
      });
    }
    return { node, destroy() {
      destroyed = true;
      session += 1;
      closeDialog();
      node.removeEventListener("click", onClick);
      node.removeEventListener("change", onChange);
      node.remove();
    } };
  }
  var playback = {
    id: "playback",
    css: CSS2,
    authScoped: true,
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
  var cache3 = /* @__PURE__ */ new Map();
  function remember(url, recordings) {
    cache3.delete(url);
    cache3.set(url, { expires: Date.now() + CACHE_TTL2, recordings });
    while (cache3.size > MAX_ENTRIES) cache3.delete(cache3.keys().next().value);
  }
  async function getForvoRecordings(name, { signal } = {}) {
    const url = forvoUrl(name);
    const hit = cache3.get(url);
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
  function mapTitleRatings(rows, type) {
    const items = /* @__PURE__ */ new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!Number.isInteger(row?.rating) || row.rating < 1 || row.rating > 10) continue;
      const id = row[type]?.ids?.trakt;
      if (Number.isSafeInteger(id) && id > 0) items.set(id, row.rating);
    }
    return items;
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
  var TTL2 = 10 * 6e4;
  var emptyTitles = () => ({ movie: /* @__PURE__ */ new Map(), show: /* @__PURE__ */ new Map() });
  function createRatingsApi({ auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
    let cache4 = null;
    let flight = null;
    let titleCache = null;
    let titleFlight = null;
    let generation3 = 0;
    function resetSession() {
      generation3++;
      cache4 = null;
      flight = null;
      titleCache = null;
      titleFlight = null;
    }
    async function load() {
      if (!signedIn()) {
        resetSession();
        return [];
      }
      if (cache4 && cache4.until > now()) return cache4.items;
      if (flight) return flight;
      const epoch = generation3;
      const pending = (async () => {
        const rows = await auth("GET", "/sync/ratings/episodes");
        if (epoch !== generation3 || !signedIn()) throw new Error("Ratings session changed.");
        if (!Array.isArray(rows)) throw new Error("Invalid ratings response.");
        const items = mapRatings(rows);
        cache4 = { items, until: now() + TTL2 };
        return items;
      })();
      flight = pending;
      try {
        return await pending;
      } finally {
        if (flight === pending) flight = null;
      }
    }
    async function loadTitles() {
      if (!signedIn()) {
        resetSession();
        return emptyTitles();
      }
      if (titleCache && titleCache.until > now()) return titleCache.titles;
      if (titleFlight) return titleFlight;
      const epoch = generation3;
      const pending = (async () => {
        const [movies, shows] = await Promise.all([auth("GET", "/sync/ratings/movies"), auth("GET", "/sync/ratings/shows")]);
        if (epoch !== generation3 || !signedIn()) throw new Error("Ratings session changed.");
        if (!Array.isArray(movies) || !Array.isArray(shows)) throw new Error("Invalid ratings response.");
        const titles = { movie: mapTitleRatings(movies, "movie"), show: mapTitleRatings(shows, "show") };
        titleCache = { titles, until: now() + TTL2 };
        return titles;
      })();
      titleFlight = pending;
      try {
        return await pending;
      } finally {
        if (titleFlight === pending) titleFlight = null;
      }
    }
    return { load, loadTitles, resetSession };
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
    authScoped: true,
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
      function cleanup() {
        cancelled = true;
        observer.disconnect();
        node.remove();
        for (const badge of badges) badge.remove();
      }
      return { node, destroy() {
        cleanup();
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
  function svg(tag, attributes, text3) {
    const node = document.createElementNS(NS2, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text3) node.textContent = text3;
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
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  var DEFAULT_WIDTH = 720;
  var MIN_WIDTH = 320;
  var MAX_BAR = 24;
  function svg2(tag, attributes = {}, content = "") {
    const node = document.createElementNS(SVG_NS2, tag);
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
        node.remove();
      }
    };
  }
  var seasonChart = {
    id: "season-chart",
    css: CSS5,
    authScoped: true,
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

  // src/features/summary-ratings/data.js
  var RATING_NAMES = [
    "Weak Sauce :(",
    "Terrible",
    "Bad",
    "Poor",
    "Meh",
    "Fair",
    "Good",
    "Great",
    "Superb",
    "Totally Ninja!"
  ];
  var MIN_VOTES = 10;
  var CHART_HEIGHT2 = 104;
  var CHART_GAP = 20;
  var TILES_HEIGHT = 60;
  var TILES_GAP = 16;
  function apiBase(route) {
    if (!route?.id) return null;
    const id = encodeURIComponent(route.id);
    if (route.kind === "movie" && route.name === "title") return `/movies/${id}`;
    if (route.kind !== "show") return null;
    if (route.name === "title") return `/shows/${id}`;
    if (route.name === "season" && Number.isInteger(route.season)) return `/shows/${id}/seasons/${route.season}`;
    if (route.name === "episode" && Number.isInteger(route.season) && Number.isInteger(route.episode)) {
      return `/shows/${id}/seasons/${route.season}/episodes/${route.episode}`;
    }
    return null;
  }
  function ratingsPath(route) {
    const base = apiBase(route);
    return base ? `${base}/ratings` : null;
  }
  function statsPath(route) {
    const base = apiBase(route);
    return base ? `${base}/stats` : null;
  }
  function statsHref(route) {
    return route?.path ? `${route.path.replace(/\/+$/, "")}/stats` : null;
  }
  function parseRatings(payload) {
    const source = payload && typeof payload === "object" && payload.trakt && typeof payload.trakt === "object" ? payload.trakt : payload;
    if (!source || typeof source !== "object") return null;
    const distribution = source.distribution;
    if (!distribution || typeof distribution !== "object") return null;
    const counts = [];
    for (let score = 1; score <= 10; score++) {
      const value = Number(distribution[score] ?? distribution[String(score)] ?? 0);
      counts.push(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    }
    const total = counts.reduce((sum, count2) => sum + count2, 0);
    const votes = Number.isFinite(Number(source.votes)) && Number(source.votes) > 0 ? Math.round(Number(source.votes)) : total;
    if (votes < MIN_VOTES || total === 0) return null;
    const fallbackAverage = counts.reduce((sum, count2, index) => sum + count2 * (index + 1), 0) / total;
    const rating = Number(source.rating);
    const average = Number.isFinite(rating) && rating >= 1 && rating <= 10 ? rating : fallbackAverage;
    return { rating: average, votes, counts };
  }
  function mostGiven(counts) {
    let best = 0;
    counts.forEach((count2, index) => {
      if (count2 >= counts[best]) best = index;
    });
    return best + 1;
  }
  function barHeights(counts, minimum = 0.04) {
    const max = Math.max(...counts, 0);
    return counts.map((count2) => count2 && max ? Math.max(count2 / max, minimum) : 0);
  }
  function averagePosition(rating) {
    const clamped = Math.min(10, Math.max(1, rating));
    return (clamped - 0.5) / 10;
  }
  var compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  var full = new Intl.NumberFormat("en-US");
  function shortCount(count2) {
    return count2 >= 1e4 ? compact.format(count2) : full.format(count2);
  }
  function fullCount(count2) {
    return full.format(count2);
  }
  var BAR_COLORS = [
    "#616161",
    "#675b5b",
    "#705252",
    "#7a4747",
    "#863c3c",
    "#922f30",
    "#9e2424",
    "#a81918",
    "#b11010",
    "#b70a0a"
  ];
  function layoutFor({ contentBottom: contentBottom2, columnBottom, sideBySide = true }) {
    if (!sideBySide) return null;
    if (![contentBottom2, columnBottom].every(Number.isFinite)) return null;
    const space = columnBottom - contentBottom2;
    if (space >= CHART_GAP + CHART_HEIGHT2 + TILES_GAP + TILES_HEIGHT) return "full";
    if (space >= CHART_GAP + CHART_HEIGHT2) return "chart";
    return null;
  }
  function statTiles({ rating, votes, counts }, watchers = null) {
    const total = counts.reduce((sum, count2) => sum + count2, 0) || votes;
    const top = mostGiven(counts);
    const liked = counts.slice(6).reduce((sum, count2) => sum + count2, 0);
    const share = (part, whole, digits = 0) => `${(Math.round(part / whole * 100 * 10 ** digits) / 10 ** digits).toFixed(digits)}%`;
    const watcherShare = (part, whole) => share(part, whole, part / whole * 100 < 9.95 ? 1 : 0);
    return [
      { name: "Rating", value: `${Math.floor(rating * 10)}%`, note: RATING_NAMES[Math.min(10, Math.max(1, Math.trunc(rating))) - 1], accent: true },
      {
        name: "Votes",
        value: fullCount(votes),
        note: Number.isFinite(watchers) && watchers >= votes && watchers > 0 ? `${watcherShare(votes, watchers)} of watchers` : "",
        accent: false
      },
      { name: "Most given", value: String(top), suffix: RATING_NAMES[top - 1], note: `${share(counts[top - 1], total)} of ${fullCount(total)} votes`, accent: true },
      { name: "Liked it", value: share(liked, total), note: "gave it 7 or higher", accent: true }
    ];
  }
  function chartLabel({ rating, votes }) {
    return `Trakt ratings: ${rating.toFixed(2)} average from ${fullCount(votes)} votes. Open the full stats.`;
  }

  // src/features/summary-ratings/api.js
  var TTL3 = 60 * 60 * 1e3;
  async function getSummaryRatings(route) {
    const path = ratingsPath(route);
    if (!path) return null;
    return parseRatings(await apiGet(path, { ttl: TTL3 }));
  }
  async function getSummaryWatchers(route) {
    const path = statsPath(route);
    if (!path) return null;
    const stats = await apiGet(path, { ttl: TTL3 });
    const watchers = Number(stats?.watchers);
    return Number.isFinite(watchers) && watchers > 0 ? watchers : null;
  }

  // src/features/summary-ratings/styles.js
  var CSS6 = String.raw`
.ogt-summary-ratings {
  --ogt-sr-fg: light-dark(#333, #ddd);
  --ogt-sr-muted: light-dark(#767676, #999);
  --ogt-sr-faint: light-dark(#a3a3a3, #777);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 18px 1fr;
  gap: 8px;
  block-size: 104px;
  margin-block-start: 20px;
  max-inline-size: 560px;
  color: var(--ogt-sr-fg);
  font-size: 11px;
  line-height: 1;
}


.ogt-summary-ratings[data-layout="full"] {
  /* The tiles row holds their 8px top margin plus 60px of tile: 18 + 8 + 78 + 8 + 68 = 180. */
  grid-template-rows: 18px 78px 68px;
  block-size: 180px;
}

.ogt-summary-ratings[hidden] {
  display: none;
}

.ogt-summary-ratings:not([data-layout="full"]) .ogt-sr-tiles {
  display: none;
}

.ogt-summary-ratings *,
.ogt-summary-ratings *::before,
.ogt-summary-ratings *::after {
  box-sizing: inherit;
}

.ogt-sr-head {
  display: inline-flex;
  /* Centre, not baseline: an SVG has no text baseline, so the arrow sat low beside the text. */
  align-items: center;
  justify-self: start;
  gap: 8px;
  color: var(--ogt-sr-fg);
  text-decoration: none;
}

.ogt-sr-head:hover,
.ogt-sr-head:focus,
.ogt-sr-head:focus-visible {
  color: var(--ogt-sr-fg);
  text-decoration: none;
}

.ogt-sr-head:focus-visible {
  outline: 2px solid var(--brand-primary, #ed1c24);
  outline-offset: 3px;
  border-radius: 3px;
}

.ogt-sr-title,
.ogt-sr-meta {
  line-height: 13px;
}

.ogt-sr-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ogt-sr-meta {
  color: var(--ogt-sr-muted);
  font-size: 12px;
}

.ogt-sr-arrow {
  flex: none;
  inline-size: 13px;
  block-size: 13px;
  color: var(--ogt-sr-muted);
  transition: transform 120ms ease, color 120ms ease;
}

.ogt-sr-head:hover .ogt-sr-arrow,
.ogt-sr-head:focus-visible .ogt-sr-arrow {
  color: var(--ogt-sr-fg);
  transform: translateX(2px);
}

.ogt-sr-plot {
  position: relative;
  min-block-size: 0;
}

.ogt-sr-bars {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  block-size: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ogt-sr-column {
  display: grid;
  grid-template-rows: 12px 1fr 14px;
  gap: 3px;
  min-inline-size: 0;
  text-align: center;
}

.ogt-sr-count {
  overflow: hidden;
  color: var(--ogt-sr-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ogt-sr-track {
  display: flex;
  align-items: flex-end;
  min-block-size: 0;
  border-block-end: 1px solid light-dark(#d6d6d6, #3a3a3a);
}

.ogt-sr-bar {
  inline-size: 100%;
  block-size: var(--ogt-sr-height);
  border-radius: 3px 3px 0 0;
  background: var(--ogt-sr-color);
}

.ogt-sr-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--ogt-sr-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.ogt-sr-heart {
  inline-size: 10px;
  block-size: 10px;
  color: var(--ogt-sr-color);
}

.ogt-sr-column--top .ogt-sr-count,
.ogt-sr-column--top .ogt-sr-score {
  color: var(--ogt-sr-fg);
  font-weight: 700;
}

/* The average sits across the bar tracks only: below the counts row, above the score row. */
.ogt-sr-average {
  position: absolute;
  inset-block: 15px 17px;
  inset-inline-start: var(--ogt-sr-average);
  border-inline-start: 1px dashed var(--ogt-sr-faint);
  pointer-events: none;
}

/* Shaped like og's stats keys: a coloured rule, the name, a large value and a muted note. */
.ogt-sr-tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.ogt-sr-tile {
  display: grid;
  /* 3px rule + 5px padding + 12 + 22 + 12 + two 3px gaps = 60px (TILES_HEIGHT). */
  grid-template-rows: 12px 22px 12px;
  align-content: start;
  gap: 3px;
  min-inline-size: 0;
  padding-block-start: 5px;
  border-block-start: 3px solid light-dark(#bdbdbd, #555);
}

.ogt-sr-tile--accent {
  border-block-start-color: #9e2424;
}

.ogt-sr-tile-name {
  color: var(--ogt-sr-fg);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ogt-sr-tile-value {
  overflow: hidden;
  color: var(--ogt-sr-fg);
  font-size: 18px;
  font-weight: 700;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The score stays large; its name ("Totally Ninja!") is smaller so it fits a ~130px tile. */
.ogt-sr-tile-suffix {
  font-size: 12px;
  font-weight: 600;
}

.ogt-sr-tile-note {
  overflow: hidden;
  color: var(--ogt-sr-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

  // src/features/summary-ratings/index.js
  var NODE_ID = "ogt-summary-ratings";
  var HEART2 = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";
  var ARROW = "M5 12h14M13 6l6 6-6 6";
  function icon(d, className, { stroke = false } = {}) {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg3.setAttribute("viewBox", "0 0 24 24");
    svg3.setAttribute("aria-hidden", "true");
    svg3.setAttribute("class", className);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    if (stroke) {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    } else {
      path.setAttribute("fill", "currentColor");
    }
    svg3.append(path);
    return svg3;
  }
  function renderChart(ratings, href) {
    const top = mostGiven(ratings.counts);
    const heights = barHeights(ratings.counts);
    const columns = ratings.counts.map((count2, index) => {
      const score = index + 1;
      return el(
        "li",
        {
          class: `ogt-sr-column${score === top ? " ogt-sr-column--top" : ""}`,
          style: `--ogt-sr-height:${(heights[index] * 100).toFixed(1)}%;--ogt-sr-color:${BAR_COLORS[index]}`
        },
        el("span", { class: "ogt-sr-count", "aria-hidden": "true", text: shortCount(count2) }),
        el("span", { class: "ogt-sr-track", "aria-hidden": "true" }, el("span", { class: "ogt-sr-bar" })),
        el("span", { class: "ogt-sr-score", "aria-hidden": "true" }, icon(HEART2, "ogt-sr-heart"), String(score)),
        el("span", {
          class: "ogt-visually-hidden",
          text: `${score}, ${RATING_NAMES[index]}: ${fullCount(count2)} ${count2 === 1 ? "vote" : "votes"}`
        })
      );
    });
    return [
      el(
        "a",
        { class: "ogt-sr-head", href, "aria-label": chartLabel(ratings) },
        el("span", { class: "ogt-sr-title", text: "Trakt ratings" }),
        el("span", { class: "ogt-sr-meta", text: `${ratings.rating.toFixed(2)} average · ${fullCount(ratings.votes)} votes` }),
        icon(ARROW, "ogt-sr-arrow", { stroke: true })
      ),
      el(
        "div",
        { class: "ogt-sr-plot" },
        el("ol", { class: "ogt-sr-bars", "aria-label": "Votes for each score" }, columns),
        el("span", {
          class: "ogt-sr-average",
          "aria-hidden": "true",
          style: `--ogt-sr-average:${(averagePosition(ratings.rating) * 100).toFixed(2)}%`
        })
      )
    ];
  }
  function renderTiles(ratings, watchers = null) {
    return el(
      "ul",
      { class: "ogt-sr-tiles", "aria-label": "Ratings summary" },
      statTiles(ratings, watchers).map((tile) => el(
        "li",
        { class: `ogt-sr-tile${tile.accent ? " ogt-sr-tile--accent" : ""}` },
        el("span", { class: "ogt-sr-tile-name", text: tile.name }),
        el(
          "span",
          { class: "ogt-sr-tile-value" },
          tile.value,
          tile.suffix ? el("span", { class: "ogt-sr-tile-suffix", text: ` · ${tile.suffix}` }) : null
        ),
        el("span", { class: "ogt-sr-tile-note", text: tile.note })
      ))
    );
  }
  function contentBottom(column, skip = null) {
    let bottom = column.getBoundingClientRect().top + window.scrollY;
    for (const child of column.children) {
      if (child === skip) continue;
      const rect = child.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      bottom = Math.max(bottom, rect.bottom + window.scrollY);
    }
    return bottom;
  }
  var summaryRatings = {
    id: "summary-ratings",
    css: CSS6,
    match(route) {
      return Boolean(ratingsPath(route)) && Boolean(getClientId());
    },
    mount(route) {
      if (document.getElementById(NODE_ID)) return null;
      const top = document.querySelector(".summary-frame #overview .top") || document.querySelector("#overview .top");
      const details = top?.querySelector(":scope > .details");
      const actions = top?.querySelector(":scope > .actions");
      if (!details || !actions) return null;
      const node = el("section", { id: NODE_ID, class: "ogt-summary-ratings", hidden: true, "aria-label": "Trakt ratings" });
      details.append(node);
      let cancelled = false;
      let ratings = null;
      let timer = 0;
      let watchersRequested = false;
      function fit() {
        timer = 0;
        if (cancelled || !ratings) return;
        const layout = layoutFor({
          contentBottom: contentBottom(details, node),
          columnBottom: contentBottom(actions),
          sideBySide: actions.getBoundingClientRect().left >= details.getBoundingClientRect().right - 1
        });
        if (node.hidden !== !layout) node.hidden = !layout;
        if (layout && node.dataset.layout !== layout) node.dataset.layout = layout;
        if (layout === "full") loadWatchers();
      }
      function loadWatchers() {
        if (watchersRequested) return;
        watchersRequested = true;
        getSummaryWatchers(route).then((watchers) => {
          if (cancelled || !watchers) return;
          node.querySelector(".ogt-sr-tiles")?.replaceWith(renderTiles(ratings, watchers));
        }).catch((error) => {
          if (!cancelled) debugError("summary watchers lookup failed", error);
        });
      }
      function scheduleFit() {
        if (cancelled || timer) return;
        timer = setTimeout(fit, 0);
      }
      const resize2 = typeof ResizeObserver === "function" ? new ResizeObserver(scheduleFit) : null;
      resize2?.observe(actions);
      resize2?.observe(details);
      for (const child of details.children) if (child !== node) resize2?.observe(child);
      const mutation = new MutationObserver(scheduleFit);
      mutation.observe(top, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
      window.addEventListener("resize", scheduleFit);
      getSummaryRatings(route).then((result) => {
        if (cancelled || !result) return;
        ratings = result;
        node.replaceChildren(...renderChart(ratings, statsHref(route)), renderTiles(ratings));
        fit();
      }).catch((error) => {
        if (!cancelled) debugError("summary ratings lookup failed", error);
      });
      return {
        node,
        destroy() {
          cancelled = true;
          clearTimeout(timer);
          resize2?.disconnect();
          mutation.disconnect();
          window.removeEventListener("resize", scheduleFit);
          node.remove();
        }
      };
    }
  };

  // src/features/month-review/data.js
  function monthSpan(year, month) {
    const start2 = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
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
  function lastMonth(now = /* @__PURE__ */ new Date()) {
    return monthSpan(now.getFullYear(), now.getMonth());
  }
  function shiftMonth(span, delta) {
    const date = new Date(span.year, span.month - 1 + delta, 1);
    return monthSpan(date.getFullYear(), date.getMonth() + 1);
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
  function monthCacheFresh(entry, span, now = /* @__PURE__ */ new Date()) {
    return Boolean(entry) && (span.key < lastMonth(now).key || freshCache(entry, now));
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
  var flights = /* @__PURE__ */ new Map();
  var firstFlight;
  var firstMonth;
  if (typeof document !== "undefined") document.addEventListener("ogt:authchange", () => {
    generation2++;
    flights.clear();
    firstFlight = null;
    firstMonth = void 0;
  });
  function alive(epoch) {
    if (generation2 !== epoch || !isSignedIn()) throw new Error("Review session changed.");
  }
  function loadReview(span = lastMonth(), now = /* @__PURE__ */ new Date(), user = null) {
    const existing = flights.get(span.key);
    if (existing) return existing;
    const epoch = generation2;
    const task = (async () => {
      let username = user;
      if (!username) {
        const profile = await apiAuth("GET", "/users/me");
        username = profile?.ids?.slug || profile?.username;
      }
      if (!username) throw new Error("Missing review user.");
      alive(epoch);
      if (span.key === lastMonth(now).key && getPrivateValue(STORAGE.dismissedReview(username)) === span.key) return null;
      const key = STORAGE.monthReview(username, span.key);
      const cached = getPrivateValue(key);
      if (monthCacheFresh(cached, span, now)) return { ...cached.summary, user: username, span };
      const history2 = await paginate(apiAuthPage, "/sync/history", { start_at: span.start, end_at: span.end, extended: "full,images" });
      alive(epoch);
      let summary2 = { plays: 0, hours: 0, ratings: 0, comments: 0, first: null };
      if (history2.some((row) => Date.parse(row.watched_at) >= Date.parse(span.start) && Date.parse(row.watched_at) < Date.parse(span.end))) {
        const [ratings, comments] = await Promise.all([
          apiAuth("GET", "/sync/ratings"),
          paginate(apiAuthPage, "/users/me/comments")
        ]);
        if (!Array.isArray(ratings)) throw new Error("Invalid review response.");
        alive(epoch);
        summary2 = summarize(history2, ratings, comments, span);
      }
      setPrivateValue(key, { savedAt: now.getTime(), summary: summary2 });
      return { ...summary2, user: username, span };
    })();
    flights.set(span.key, task);
    task.finally(() => {
      if (flights.get(span.key) === task) flights.delete(span.key);
    }).catch(() => {
    });
    return task;
  }
  function loadFirstMonth() {
    if (firstMonth !== void 0) return Promise.resolve(firstMonth);
    if (firstFlight) return firstFlight;
    const epoch = generation2;
    const task = (async () => {
      const head = await apiAuthPage("/sync/history", { page: 1, limit: 100 });
      alive(epoch);
      if (!Array.isArray(head.data)) throw new Error("Invalid review response.");
      let rows = head.data;
      if (head.pages && head.pages > 1) {
        const tail = await apiAuthPage("/sync/history", { page: head.pages, limit: 100 });
        alive(epoch);
        if (!Array.isArray(tail.data)) throw new Error("Invalid review response.");
        rows = tail.data;
      }
      const oldest = rows.reduce((found, row) => {
        const time = Date.parse(row?.watched_at);
        return Number.isFinite(time) && (!found || time < found.time) ? { time, row } : found;
      }, null);
      if (!oldest) {
        firstMonth = null;
        return null;
      }
      const date = new Date(oldest.time);
      firstMonth = monthSpan(date.getFullYear(), date.getMonth() + 1);
      return firstMonth;
    })();
    firstFlight = task;
    task.finally(() => {
      if (firstFlight === task) firstFlight = null;
    }).catch(() => {
    });
    return task;
  }

  // src/features/month-review/styles.js
  var CSS7 = `
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
.ogt-review__top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:28px; }
.ogt-review__top h2 { margin:0; }
/* The month nav is a flat transparent chip like the dashboard tiles - no circle, no color of its own. */
.ogt-review__nav { display:flex; align-items:center; gap:8px; flex:none; }
.ogt-review__arrow { display:grid; place-items:center; inline-size:36px; block-size:36px; border:0; padding:0;
  border-radius:var(--radius-dashboard-panel,var(--radius-container,12px));
  background:rgba(0,0,0,.25); color:white; cursor:pointer; }
.ogt-review__arrow svg { display:block; }
.ogt-review__arrow:hover:not(:disabled) { background:rgba(255,255,255,.15); }
.ogt-review__arrow:disabled { opacity:.35; cursor:default; }
.ogt-review__arrow:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__bottom { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:26px; }
.ogt-review__empty { font-size:18px; color:#ddd; margin:0 0 26px; }
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
.ogt-review__link { font-size:15px; display:inline-block; padding:10px 14px; background:var(--brand-primary,#ed1c24); text-decoration:none; color:white!important; border-radius:var(--radius-action-button,var(--radius-object,8px)); font-weight:bold; }
.ogt-review__link:hover { background:var(--brand-primary-darken,#c61017); }
.ogt-review__link:focus-visible,.ogt-review__hide:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__hide { display:grid; place-items:center; border:0; background:rgba(0,0,0,.25); color:white; font:inherit; font-size:14px;
  cursor:pointer; padding:0; inline-size:80px; block-size:36px; box-sizing:border-box; border-radius:var(--radius-dashboard-panel,var(--radius-container,12px)); }
.ogt-review__hide:hover:not(:disabled) { background:rgba(255,255,255,.15); }
.ogt-review__hide:disabled { opacity:.35; cursor:default; }
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
  function chevron(dir) {
    const svg3 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, value] of Object.entries({
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true"
    })) svg3.setAttribute(key, value);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7");
    svg3.append(path);
    return svg3;
  }
  var monthReview = {
    id: "month-review",
    css: CSS7,
    authScoped: true,
    match: (route) => route.name === "dashboard" && isSignedIn(),
    mount() {
      const anchor = document.querySelector("nav.ribbon");
      if (!anchor) return null;
      let destroyed = false;
      let review = null;
      let user = null;
      let busy = false;
      let token = 0;
      let earliest;
      let earliestFailed = false;
      let prevButton = null;
      let nextButton = null;
      let hideButton = null;
      const node = el("section", { class: "ogt-review", id: "ogt-month-review", hidden: true, "aria-label": "Month in review" });
      anchor.after(node);
      const hide = () => {
        if (review) setPrivateValue(STORAGE.dismissedReview(review.user), lastMonth().key);
        node.hidden = true;
      };
      const updateNav = () => {
        if (prevButton) prevButton.disabled = busy || Boolean(earliest && review.span.key <= earliest.key);
        if (nextButton) nextButton.disabled = busy || !review || review.span.key >= lastMonth().key;
        if (hideButton) hideButton.disabled = busy;
      };
      const ensureEarliest = async () => {
        if (earliest !== void 0 || earliestFailed) return earliest;
        try {
          earliest = await loadFirstMonth();
        } catch (error) {
          earliestFailed = true;
          if (!destroyed && isSignedIn()) debugError("month review first history failed", error);
        }
        return earliest;
      };
      const navigate = async (delta) => {
        if (busy || !review) return;
        const target = shiftMonth(review.span, delta);
        if (delta > 0 && target.key > lastMonth().key) return;
        if (delta < 0) {
          busy = true;
          updateNav();
          try {
            await ensureEarliest();
          } finally {
            if (!destroyed) {
              busy = false;
              updateNav();
            }
          }
          if (destroyed) return;
          if (earliest && target.key < earliest.key) return;
        }
        await show(target);
      };
      const render = (data) => {
        review = data;
        const { span } = data;
        prevButton = el("button", { type: "button", class: "ogt-review__arrow", "aria-label": "Previous month", title: "Previous month", on: { click: () => navigate(-1) } }, chevron(-1));
        nextButton = el("button", { type: "button", class: "ogt-review__arrow", "aria-label": "Next month", title: "Next month", on: { click: () => navigate(1) } }, chevron(1));
        hideButton = el("button", { type: "button", class: "ogt-review__hide", text: "× Hide", on: { click: hide } });
        const top = el(
          "div",
          { class: "ogt-review__top" },
          el("h2", {}, "your ", el("em", { text: span.label.toLocaleLowerCase() }), " in review"),
          hideButton
        );
        const nav = el("div", { class: "ogt-review__nav" }, prevButton, nextButton);
        const inner = el("div", { class: "ogt-review__inner" });
        const art = data.plays ? fanart(data.first) : null;
        const image = art ? el("img", { class: "ogt-review__art", src: art, alt: "", referrerpolicy: "no-referrer" }) : null;
        image?.addEventListener("error", () => image.remove(), { once: true });
        inner.append(...image ? [image] : [], top);
        if (data.plays) {
          const first = data.first;
          const media = first?.show || first?.movie;
          const grid = el("div", { class: "ogt-review__grid" });
          for (const key of ["plays", "hours", "ratings", "comments"]) grid.append(el(
            "div",
            { class: "ogt-review__tile" },
            tileIcon(key),
            el(
              "div",
              { class: "ogt-review__value" },
              el("strong", { text: (data[key] || 0).toLocaleString() }),
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
              first?.episode ? el(
                "span",
                { class: "ogt-review__episode" },
                el("b", { text: `${first.episode.season}x${String(first.episode.number).padStart(2, "0")}` }),
                ` “${first.episode.title || "Untitled episode"}”`
              ) : null
            )
          ));
          inner.append(grid);
        } else {
          inner.append(el("p", { class: "ogt-review__empty", text: `No plays in ${span.label} ${span.year}.` }));
        }
        inner.append(el("div", { class: "ogt-review__bottom" }, el("a", {
          class: "ogt-review__link",
          text: "Month in Review →",
          href: `https://app.trakt.tv/users/${encodeURIComponent(data.user)}/mir/${span.year}/${span.month}`,
          target: "_blank",
          rel: "noopener noreferrer"
        }), nav));
        node.className = "ogt-review";
        node.setAttribute("aria-label", `${span.label} ${span.year} in review`);
        node.replaceChildren(inner);
        node.hidden = false;
        updateNav();
      };
      const show = async (span, initial = false) => {
        if (busy) return;
        busy = true;
        updateNav();
        const epoch = ++token;
        node.setAttribute("aria-busy", "true");
        try {
          const data = await loadReview(span, /* @__PURE__ */ new Date(), user);
          if (destroyed || epoch !== token || !isSignedIn()) return;
          if (!data) {
            node.hidden = true;
            return;
          }
          user = data.user;
          if (!data.plays && initial) {
            node.hidden = true;
            return;
          }
          render(data);
        } catch (error) {
          if (destroyed || epoch !== token || !isSignedIn()) return;
          debugError("month review failed", error);
          if (!initial && review) {
            toast("Could not load that month’s review; try again later.");
            return;
          }
          prevButton = nextButton = hideButton = null;
          node.className = "ogt-review-hint";
          node.textContent = "Could not load this month’s review; try again later.";
          node.hidden = false;
        } finally {
          if (epoch === token) {
            busy = false;
            node.removeAttribute("aria-busy");
            updateNav();
          }
        }
      };
      show(lastMonth(), true);
      return { node, destroy() {
        destroyed = true;
        token++;
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
  function icon2(path, circle = false) {
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
    const close = el("button", { type: "button", class: "ogt-watchlist-toast__close", "aria-label": "Close" }, icon2("M6 6l12 12M18 6 6 18"));
    const line = el("span", { class: "ogt-watchlist-toast__timer", "aria-hidden": "true" });
    const actions = el("div", { class: "ogt-watchlist-toast__actions" });
    const undo = typeof onUndo === "function" ? el("button", { type: "button", class: "ogt-watchlist-toast__undo", text: "Undo" }) : null;
    if (undo) actions.append(undo);
    actions.append(close);
    const error = el("p", { class: "ogt-watchlist-toast__error", "aria-live": "polite" });
    const node = el(
      "div",
      { class: "ogt-watchlist-toast", role: "status", "aria-atomic": "true" },
      el("span", { class: "ogt-watchlist-toast__icon" }, icon2("m7 12 3 3 7-7", true)),
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
  var CSS8 = String.raw`
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
  var resumeProfile = null;
  if (typeof document !== "undefined") {
    document.addEventListener("ogt:routechange", (event) => {
      const route = event.detail?.route;
      if (route?.name === "lists" && route.id != null && decodeURIComponent(route.id) === resumeProfile) return;
      resumeProfile = null;
    });
  }
  var ICONS2 = {
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
  function icon3(pathData, className = "ogt-all-lists__icon") {
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
    const ownIcon = (path) => icon3(path, ["icon", native?.icon].filter(Boolean).join(" "));
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
        icon3(ICONS2[kind], "ogt-all-lists__count-icon"),
        el("strong", { text: value.toLocaleString("en-US") }),
        el("span", { text: ` ${words}` })
      );
    }
    function tag(label) {
      const [color, path] = ICONS2[label];
      if (native?.tag) {
        return el("span", { class: native.tag.className, style: `--tone: var(${color})` }, ownIcon(path), label);
      }
      return el("span", { class: "ogt-all-lists__tag", style: `--ogt-list-tag-color: var(${color}, #888)` }, icon3(path), label);
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
        icon3(ICONS2.share)
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
        ownIcon(ICONS2.progress)
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
    let loadRevision = 0;
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
      const revision = ++loadRevision;
      observer?.disconnect();
      observer = null;
      node.replaceChildren(el("p", { class: "ogt-all-lists__loading", text: "Loading collaborations and liked lists…" }));
      const results = await Promise.allSettled([
        getCollaborationLists(profile),
        getLikedLists(profile),
        isSignedIn() ? getViewer() : Promise.resolve(null)
      ]);
      if (cancelled || revision !== loadRevision) return;
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
        if (cancelled || revision !== loadRevision) return;
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
        const missing = failed.find((result) => result.reason instanceof MissingClientIdError)?.reason;
        node.prepend(el("p", { class: "ogt-all-lists__error", role: "status", text: missing?.ogSession ? missing.message : missing ? "Set a Trakt API client ID in the toolkit menu to load collaborations and liked lists." : "Some lists could not be loaded. Try again later." }));
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
    function startLoad() {
      loading ??= load().catch((error) => debugError("all-lists render failed", error));
      return loading;
    }
    return {
      node,
      load: startLoad,
      destroy() {
        cancelled = true;
        loadRevision += 1;
        loading = null;
        observer?.disconnect();
        node.remove();
      }
    };
  }
  var allLists = {
    id: "all-lists",
    css: CSS8,
    authScoped: true,
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
      const resume = resumeProfile === profile;
      resumeProfile = null;
      if (route.name === "lists" && (resume || location.hash === HASH)) {
        if (!resume) history.replaceState(history.state, "", location.pathname + location.search);
        show();
      }
      return {
        node: item,
        destroy(reason) {
          if (reason === "authchange" && active2) resumeProfile = profile;
          else resumeProfile = null;
          menu.removeEventListener("click", chooseNative);
          hide();
          view.destroy();
          item.remove();
        }
      };
    }
  };

  // src/features/list-preview/data.js
  var POSTER_PATH = /^(?:https?:)?\/\/media\.trakt\.tv\/images\/(shows|movies)\/(\d{3})\/(\d{3})\/(\d{3})\/posters\//i;
  function readPosterRoute(src) {
    if (typeof src !== "string") return null;
    const match = src.match(POSTER_PATH);
    if (!match) return null;
    const id = Number(`${match[2]}${match[3]}${match[4]}`);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const kind = match[1].toLowerCase() === "shows" ? "show" : "movie";
    return { kind, id, href: `/${kind === "show" ? "shows" : "movies"}/${id}` };
  }
  function readListPoster(slot) {
    const poster = slot?.querySelector?.("img.poster[src]");
    const route = readPosterRoute(poster?.getAttribute("src"));
    if (!route) return null;
    const doc = slot.ownerDocument;
    const describedBy = slot.getAttribute("aria-describedby")?.split(/\s+/).filter(Boolean) ?? [];
    const title = describedBy.map((id) => doc?.getElementById(id)).flatMap((tooltip) => [...tooltip?.querySelectorAll(".text") ?? []]).map((node) => node.textContent.trim()).find(Boolean);
    return { ...route, title: title || "this title" };
  }

  // src/features/list-preview/styles.js
  var css = String.raw`
.ogt-list-preview-slot { cursor: pointer; }
.ogt-list-preview-titles {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
`;

  // src/features/list-preview/corner-rating.js
  function cornerRating(rating, label = `Your rating: ${rating}`) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) return null;
    return el(
      "div",
      { class: "ogt-corner-rating", role: "img", "aria-label": label, style: `--ogt-rating-color: var(--rating-${rating})` },
      el("span", { class: "ogt-corner-rating-text", "aria-hidden": "true" }, String(rating))
    );
  }
  var cornerRatingStyles = `
.ogt-corner-rating {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(var(--poster-width, 100%) - 30px);
  z-index: 10;
  inline-size: 30px;
  block-size: 30px;
  background-color: var(--ogt-rating-color);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  pointer-events: none;
}
@container (width < 520px) {
  .list-row .ogt-corner-rating { inset-inline-start: auto; inset-inline-end: 0; }
}
/* og's geometry: a 15 by 30 box, 7px in, text on its top 12px, turned 45 degrees. */
.ogt-corner-rating-text {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 7px;
  inline-size: 15px;
  block-size: 30px;
  color: var(--color-card-text, #fff);
  font-family: var(--font-headings, sans-serif);
  font-weight: var(--font-weight-headings-heavy, 700);
  font-size: var(--font-size-card-subtitle, 11px);
  line-height: 12px;
  text-align: center;
  rotate: 45deg;
}
`;

  // src/features/list-preview/index.js
  var ID2 = "ogt-list-preview";
  var SLOT = ".list-row .fan .slot";
  var FAN = ".list-row .fan";
  var listPreview = {
    id: "list-preview",
    css: css + cornerRatingStyles,
    authScoped: true,
    match(route) {
      return ["lists", "lists-collaborations", "liked-lists", "smart-lists"].includes(route.name) || /^\/users\/[^/]+\/(?:lists|smart-lists)(?:\/|$)/.test(route.path) || /^\/lists(?:\/|$)/.test(route.path);
    },
    mount() {
      if (!document.body || document.getElementById(ID2)) return null;
      const marker = el("span", { id: ID2, hidden: true });
      document.body.append(marker);
      const slots = /* @__PURE__ */ new Map();
      const navs = /* @__PURE__ */ new Map();
      const corners = /* @__PURE__ */ new Map();
      let ratings = null;
      let ratingsRun = 0;
      let destroyed = false;
      let scheduled = false;
      async function loadRatings() {
        const run = ++ratingsRun;
        ratings = null;
        schedule();
        if (!isSignedIn()) return;
        let next = null;
        try {
          next = await ratingsApi.loadTitles();
        } catch (error) {
          debugError("list preview ratings failed", error);
        }
        if (destroyed || run !== ratingsRun) return;
        ratings = next;
        schedule();
      }
      function removeCorner(slot) {
        corners.get(slot)?.node.remove();
        corners.delete(slot);
      }
      function syncCorner(slot, info2) {
        const rating = info2 && ratings?.[info2.kind]?.get(info2.id);
        const key = rating ? `${info2.kind}:${info2.id}:${rating}` : null;
        const current = corners.get(slot);
        if (current?.key === key && (!key || current.node.parentNode === slot)) return;
        removeCorner(slot);
        const node = key && cornerRating(rating, `Your rating: ${rating} of 10`);
        if (!node) return;
        slot.append(node);
        corners.set(slot, { key, node });
      }
      function scan() {
        if (destroyed) return;
        const seenSlots = /* @__PURE__ */ new Set();
        for (const slot of document.querySelectorAll(SLOT)) {
          seenSlots.add(slot);
          const info2 = readListPoster(slot);
          slot.classList.toggle("ogt-list-preview-slot", Boolean(info2));
          if (info2) slots.set(slot, info2);
          else slots.delete(slot);
          syncCorner(slot, info2);
        }
        for (const slot of /* @__PURE__ */ new Set([...slots.keys(), ...corners.keys()])) {
          if (seenSlots.has(slot) && slot.isConnected) continue;
          slot.classList.remove("ogt-list-preview-slot");
          removeCorner(slot);
          slots.delete(slot);
        }
        const seenFans = /* @__PURE__ */ new Set();
        for (const fan of document.querySelectorAll(FAN)) {
          const items = [...fan.querySelectorAll(".slot")].map((slot) => slots.get(slot)).filter(Boolean);
          if (!items.length) continue;
          seenFans.add(fan);
          const signature = items.map((item) => `${item.kind}:${item.id}:${item.title}`).join("|");
          const entry = navs.get(fan);
          if (entry?.nav.isConnected && entry.signature === signature) continue;
          entry?.nav.remove();
          const nav = el("nav", { class: "ogt-list-preview-titles", "aria-label": "List preview titles" });
          for (const item of items) nav.append(el("a", { href: item.href, text: item.title }));
          fan.after(nav);
          navs.set(fan, { nav, signature });
        }
        for (const [fan, entry] of navs) {
          if (seenFans.has(fan) && fan.isConnected) continue;
          entry.nav.remove();
          navs.delete(fan);
        }
      }
      function navigate(event) {
        const middle = event.type === "auxclick" && event.button === 1;
        if (!middle && (event.type !== "click" || event.button !== 0)) return;
        const slot = event.target?.closest?.(SLOT);
        const info2 = slot && slots.get(slot);
        if (!info2) return;
        event.preventDefault();
        event.stopPropagation();
        if (middle || event.ctrlKey || event.metaKey || event.shiftKey) {
          window.open(info2.href, "_blank", "noopener");
          return;
        }
        const link = [...navs.get(slot.closest(".fan"))?.nav.querySelectorAll("a") ?? []].find((anchor) => anchor.getAttribute("href") === info2.href);
        if (link) link.click();
        else window.location.assign(info2.href);
      }
      function schedule() {
        if (scheduled || destroyed) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          scan();
        });
      }
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["src", "aria-describedby"]
      });
      document.addEventListener("click", navigate, true);
      document.addEventListener("auxclick", navigate, true);
      loadRatings();
      scan();
      return {
        node: marker,
        destroy() {
          destroyed = true;
          observer.disconnect();
          document.removeEventListener("click", navigate, true);
          document.removeEventListener("auxclick", navigate, true);
          for (const slot of slots.keys()) slot.classList.remove("ogt-list-preview-slot");
          for (const { node } of corners.values()) node.remove();
          for (const { nav } of navs.values()) nav.remove();
          slots.clear();
          corners.clear();
          navs.clear();
          marker.remove();
        }
      };
    }
  };

  // src/features/library/api.js
  var validId = (id) => Number.isSafeInteger(id) && id > 0;
  function writeRequest2(auth, path, body, active2, signal) {
    return active2 || signal ? auth("POST", path, body, void 0, { active: active2, signal }) : auth("POST", path, body);
  }
  function createLibraryApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn, now = Date.now } = {}) {
    return {
      async add(route, { confirm = () => true, active: active2, signal } = {}) {
        if (!signedIn()) throw new Error("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
        const isActive = active2 ?? (() => true);
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
            if (!isActive() || !signedIn()) return { cancelled: true };
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
          if (!isActive() || !signedIn()) return { cancelled: true };
          if (route.name !== "episode" && !await confirm(`Add ${body.episodes.length} aired episode${body.episodes.length === 1 ? "" : "s"} to your toolkit Trakt account’s library?${route.name === "title" ? " Specials are excluded." : ""}`)) {
            return { cancelled: true };
          }
          if (!isActive() || !signedIn()) return { cancelled: true };
        } else throw new Error("Unsupported library page.");
        if (!isActive() || !signedIn()) return { cancelled: true };
        const result = await writeRequest2(auth, "/sync/collection", body, active2, signal);
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
      async remove(body, { active: active2, signal } = {}) {
        if (!signedIn()) throw new Error("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
        const isActive = active2 ?? (() => true);
        if (!body || typeof body !== "object" || !isActive()) return { cancelled: true };
        const result = await writeRequest2(auth, "/sync/collection/remove", body, active2, signal);
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
    return headingTitle(doc.querySelector(".fanart-header .summary-title h1")) || "this title";
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
  var ID3 = "ogt-library";
  var library = {
    id: "library",
    authScoped: true,
    css: actionButtonCss("ogt-library", "var(--brand-quaternary, #129982)"),
    match: (route) => route.kind === "movie" && route.name === "title" || route.kind === "show" && ["title", "season", "episode"].includes(route.name),
    mount(route) {
      const anchor = findActionStack();
      if (!anchor || document.getElementById(ID3)) return null;
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
      const node = el("div", { id: ID3, class: "ogt-library" }, button2, status);
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
          status.textContent = "Sign in to Trakt at og.trakt.tv or through the toolkit menu first.";
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
          const result = await libraryApi.add(route, { confirm: (message) => confirmDialog(message, { title: "Add to library", ok: "Add episodes" }), active: active2 });
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
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status && !error.ogSession ? "Could not add to library. Check your toolkit sign-in and try again." : error.message;
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
          status.textContent = "Sign in to Trakt at og.trakt.tv or through the toolkit menu first.";
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
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status && !error.ogSession ? "Could not undo. Check your toolkit sign-in and try again." : error.message;
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
      button2.addEventListener("click", add);
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
  function watchlistBulkItems(routes) {
    const items = [];
    const seen = /* @__PURE__ */ new Set();
    for (const route of Array.isArray(routes) ? routes : []) {
      const lookup = watchlistLookup(route);
      if (!lookup || lookup.type !== "movies" && lookup.type !== "shows") continue;
      if (typeof route.id !== "string" || route.id.trim() === "") continue;
      const slug = route.id.trim();
      const key = typeof route.key === "string" && route.key ? route.key : `${lookup.type}:${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ key, type: lookup.type, slug });
    }
    return items;
  }
  function watchlistBulkBody(items) {
    const body = {};
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || item.type !== "movies" && item.type !== "shows" || typeof item.slug !== "string" || !item.slug) continue;
      (body[item.type] ??= []).push({ ids: { slug: item.slug } });
    }
    return body;
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
  var BULK_BATCH = 100;
  function writeRequest3(auth, path, body, active2, signal) {
    return active2 || signal ? auth("POST", path, body, void 0, { active: active2, signal }) : auth("POST", path, body);
  }
  function createWatchlistApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn } = {}) {
    return {
      async add(route, { active: active2, signal } = {}) {
        if (!signedIn()) throw new Error("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
        const lookup = watchlistLookup(route);
        if (!lookup) throw new Error("Unsupported watchlist page.");
        const isActive = active2 ?? (() => true);
        if (!isActive()) return { cancelled: true };
        const data = await get(lookup.path);
        const body = watchlistBody(lookup, data);
        const item = lookup.type === "seasons" ? data.find((season) => season?.number === lookup.season) : data;
        const title = typeof item?.title === "string" && item.title.trim() ? item.title.trim() : lookup.type === "seasons" ? `Season ${lookup.season}` : "this title";
        if (!isActive() || !signedIn()) return { cancelled: true };
        const result = await writeRequest3(auth, "/sync/watchlist", body, active2, signal);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find this title.");
        }
        const counts = [result?.added?.[lookup.type], result?.existing?.[lookup.type]];
        if (!counts.some((count2) => Number.isSafeInteger(count2) && count2 > 0)) {
          throw new Error("Trakt did not confirm a watchlist addition.");
        }
        return { cancelled: false, title, body, undoable: Number.isSafeInteger(result?.added?.[lookup.type]) && result.added[lookup.type] > 0 };
      },
      /** Report each confirmed batch so a later failure cannot erase completed work. */
      async addMany(routes, { active: active2, signal, onProgress = () => {
      } } = {}) {
        if (!signedIn()) throw new Error("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
        const isActive = active2 ?? (() => true);
        if (!isActive()) return { cancelled: true };
        const items = watchlistBulkItems(routes);
        const progress = { cancelled: false, sent: 0, added: 0, existing: 0, notFound: 0, succeededKeys: [] };
        for (let start2 = 0; start2 < items.length; start2 += BULK_BATCH) {
          if (!isActive() || !signedIn()) return { cancelled: true };
          const batch = items.slice(start2, start2 + BULK_BATCH);
          const result = await writeRequest3(auth, "/sync/watchlist", watchlistBulkBody(batch), active2, signal);
          const confirmed = { added: 0, existing: 0, notFound: 0, succeededKeys: [] };
          for (const type of ["movies", "shows"]) {
            const sent = batch.filter((item) => item.type === type);
            const added = result?.added?.[type] ?? 0;
            const existing = result?.existing?.[type] ?? 0;
            const missing = result?.not_found?.[type] ?? [];
            if (!Number.isSafeInteger(added) || added < 0 || !Number.isSafeInteger(existing) || existing < 0 || !Array.isArray(missing) || added + existing + missing.length !== sent.length) {
              throw new Error("Trakt did not confirm all watchlist additions; some titles may have been added.");
            }
            const missingSlugs = new Set(missing.map((item) => item?.ids?.slug));
            if (missingSlugs.size === missing.length && [...missingSlugs].every((slug) => sent.some((item) => item.slug === slug))) {
              confirmed.succeededKeys.push(...sent.filter((item) => !missingSlugs.has(item.slug)).map((item) => item.key));
            }
            confirmed.added += added;
            confirmed.existing += existing;
            confirmed.notFound += missing.length;
          }
          progress.sent += batch.length;
          progress.added += confirmed.added;
          progress.existing += confirmed.existing;
          progress.notFound += confirmed.notFound;
          progress.succeededKeys.push(...confirmed.succeededKeys);
          onProgress({ ...progress, succeededKeys: [...progress.succeededKeys] });
        }
        return progress;
      },
      /** Undo an addition with the exact body that was sent. */
      async remove(body, { active: active2, signal } = {}) {
        if (!signedIn()) throw new Error("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
        const isActive = active2 ?? (() => true);
        if (!body || typeof body !== "object" || !isActive()) return { cancelled: true };
        const result = await writeRequest3(auth, "/sync/watchlist/remove", body, active2, signal);
        if (Object.values(result?.not_found ?? {}).some((items) => !Array.isArray(items) || items.length)) {
          throw new Error("Trakt could not find this title.");
        }
        for (const [type, items] of Object.entries(body)) {
          const deleted = result?.deleted?.[type];
          if (!Array.isArray(items) || !Number.isSafeInteger(deleted) || deleted < 0 || deleted > items.length) {
            throw new Error("Trakt did not confirm a watchlist removal.");
          }
        }
        return { cancelled: false };
      }
    };
  }
  var watchlistApi = createWatchlistApi();

  // src/features/watchlist/styles.js
  var css2 = actionButtonCss("ogt-watchlist", "var(--brand-secondary, light-dark(#2474ae, #59a9e2))");

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
  var ID4 = "ogt-watchlist";
  var watchlist = {
    id: "watchlist",
    css: css2,
    authScoped: true,
    match: (route) => Boolean(watchlistLookup(route)),
    mount(route) {
      const anchor = findActionStack();
      if (!anchor || document.getElementById(ID4)) return null;
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
      const node = el("div", { id: ID4, class: "ogt-watchlist" }, button2, status);
      function syncVisibility() {
        const watchlisted = readWatchlisted(anchor);
        if (wasWatchlisted && !watchlisted) added = false;
        wasWatchlisted = watchlisted;
        node.hidden = added || watchlisted;
      }
      async function add() {
        if (busy || undoing || node.hidden) return;
        if (!isSignedIn()) {
          status.textContent = "Sign in to Trakt at og.trakt.tv or through the toolkit menu first.";
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
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status && !error.ogSession ? "Could not add to watchlist. Check your toolkit sign-in and try again." : error.message;
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
          status.textContent = "Sign in to Trakt at og.trakt.tv or through the toolkit menu first.";
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
          if (active2()) status.textContent = error.status === 429 ? "Trakt rate limited this request; try again later." : error.status && !error.ogSession ? "Could not undo. Check your toolkit sign-in and try again." : error.message;
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
      button2.addEventListener("click", add);
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
        node.remove();
      } };
    }
  };

  // src/features/watchlist/shortcuts.js
  function createWatchlistShortcuts({ id, markerId, className, css: css3, match, logLabel, targets, readRoute, bulk = null }) {
    return {
      id,
      match,
      css: css3,
      authScoped: true,
      mount() {
        if (!document.body || document.getElementById(markerId)) return null;
        const node = el("span", { id: markerId, hidden: true });
        document.body.append(node);
        const entries = /* @__PURE__ */ new Map();
        const states = /* @__PURE__ */ new Map();
        const nativeRefresh = createNativeWatchlistRefresh();
        let destroyed = false, session = 0, scheduled = false, bulkBusy = false, refreshRun = 0;
        const bulkButton = bulk ? el("button", { type: "button", class: "ogt-watchlist-bulk", text: bulk.label }) : null;
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
          const hidden = state.added || state.wasWatchlisted;
          if (entry.button.hidden !== hidden) entry.button.hidden = hidden;
          entry.button.disabled = bulkBusy || state.busy || state.undoing;
          const busy = String(bulkBusy || state.busy || state.undoing);
          if (entry.button.getAttribute("aria-busy") !== busy) entry.button.setAttribute("aria-busy", busy);
        }
        function bulkEntries() {
          const unique = /* @__PURE__ */ new Map();
          for (const entry of [...entries.values(), ...bulk?.targets?.() ?? []]) {
            const state = stateFor(entry.key);
            if (state.busy || state.undoing || state.added || state.wasWatchlisted) continue;
            if (!entry.host.isConnected || entry.button && !entry.button.isConnected) continue;
            if (entry.control && readCardWatchlisted(entry.control)) continue;
            if (entry.host.closest("[hidden]") || entry.host.checkVisibility?.() === false) continue;
            if (!unique.has(entry.key)) unique.set(entry.key, entry);
          }
          return [...unique.values()];
        }
        function syncBulk() {
          if (!bulkButton) return;
          const control = bulk.target?.();
          if (control && bulkButton.parentElement !== control) control.append(bulkButton);
          const total = bulkEntries().length;
          const label = total ? `${bulk.label} (${total})` : bulk.label;
          if (bulkButton.textContent !== label) bulkButton.textContent = label;
          bulkButton.disabled = bulkBusy || total === 0;
          bulkButton.setAttribute("aria-busy", String(bulkBusy));
          bulkButton.title = total ? `Add ${total} title${total === 1 ? "" : "s"} to your watchlist` : "No shown credits need adding to your watchlist";
        }
        async function addAll() {
          if (bulkBusy) return;
          if (!isSignedIn()) {
            toast("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
            return;
          }
          const list = bulkEntries();
          if (!list.length) return;
          const epoch = session;
          const pagePath = location.pathname;
          const active2 = () => !destroyed && session === epoch && location.pathname === pagePath;
          let progress, refreshKeys = [];
          bulkBusy = true;
          scan();
          try {
            if (!await confirmDialog(
              `Add ${list.length} title${list.length === 1 ? "" : "s"} to your watchlist?`,
              { title: "Watchlist all", ok: "Add" }
            ) || !active2()) return;
            const result = await watchlistApi.addMany(list.map((entry) => entry.route), { active: active2, onProgress: (result2) => {
              if (!active2()) return;
              progress = result2;
              for (const key of result2.succeededKeys) stateFor(key).added = true;
              scan();
            } });
            if (!active2() || result.cancelled) return;
            refreshKeys = result.succeededKeys;
            const summary2 = `Watchlist: ${result.added} added, ${result.existing} already there, ${result.notFound} not found.`;
            const undoable = result.added > 0 && result.existing === 0 && result.succeededKeys.length === result.added;
            const succeeded = new Set(result.succeededKeys);
            const routes = list.filter((entry) => succeeded.has(entry.key)).map((entry) => entry.route);
            void notifySuccess(summary2, active2, { undo: undoable ? () => undoAll(routes, active2) : void 0 });
          } catch (error) {
            debugError(`${logLabel} bulk watchlist addition failed`, error);
            if (active2()) {
              if (progress) refreshKeys = progress.succeededKeys;
              const completed = progress ? `Watchlist: ${progress.added} added, ${progress.existing} already there, ${progress.notFound} not found. ` : "";
              toast(completed + (error.status === 429 ? "Trakt rate limited this request; try again later." : "Remaining titles could not be confirmed; some may have been added. Try again."));
            }
          } finally {
            if (!destroyed && epoch === session) {
              bulkBusy = false;
              scan();
            }
          }
          if (refreshKeys.length && active2()) await refreshEntries(refreshKeys, active2);
        }
        async function refreshEntries(keys, active2) {
          const run = ++refreshRun;
          const wanted = new Set(keys);
          const pending = [...entries.values(), ...bulk?.targets?.() ?? []].filter((entry) => wanted.has(entry.key) && entry.control);
          await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
            while (pending.length && active2() && run === refreshRun) {
              const entry = pending.shift();
              if (readRoute(entry.host)?.key !== entry.key) continue;
              await nativeRefresh.refresh(entry.control, entry.route, { active: active2 });
            }
          }));
        }
        async function undoAll(routes, active2) {
          if (bulkBusy || !active2()) return false;
          const epoch = session;
          bulkBusy = true;
          scan();
          try {
            while (routes.length) {
              if (!active2()) return false;
              const batch = routes.slice(0, 100);
              const result = await watchlistApi.remove(watchlistBulkBody(watchlistBulkItems(batch)), { active: active2 });
              if (result.cancelled || !active2()) return false;
              for (const route of batch) stateFor(route.key).added = false;
              routes.splice(0, batch.length);
              scan();
              await refreshEntries(batch.map((route) => route.key), active2);
            }
            return true;
          } catch (error) {
            failed(error, "undo", active2);
            return false;
          } finally {
            if (!destroyed && epoch === session) {
              bulkBusy = false;
              scan();
            }
          }
        }
        function activeFor(entry) {
          const epoch = session;
          const pagePath = location.pathname;
          return () => !destroyed && session === epoch && location.pathname === pagePath && [...entries.values()].some((e) => e.key === entry.key && e.control.isConnected && readRoute(e.host)?.key === entry.key);
        }
        function failed(error, verb, active2) {
          debugError(`${logLabel} watchlist ${verb} failed`, error);
          if (active2()) toast(error.status === 429 ? "Trakt rate limited this request; try again later." : error.status && !error.ogSession ? `Could not ${verb === "undo" ? "undo" : "add to watchlist"}. Check your toolkit sign-in and try again.` : error.message);
        }
        async function add(entry, event) {
          event.preventDefault();
          event.stopPropagation();
          const state = stateFor(entry.key);
          if (bulkBusy || state.busy || state.undoing || entry.button.hidden) return;
          if (!isSignedIn()) {
            toast("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
            return;
          }
          const epoch = session;
          const operation = ++state.operation;
          const active2 = activeFor(entry);
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
            failed(error, "addition", active2);
          } finally {
            if (!destroyed && epoch === session && state.operation === operation) {
              state.busy = false;
              scan();
            }
          }
        }
        async function undo(entry, body) {
          const state = stateFor(entry.key);
          if (bulkBusy || state.busy || state.undoing || !body) return false;
          if (!isSignedIn()) {
            toast("Sign in to Trakt at og.trakt.tv or through the toolkit menu first.");
            return false;
          }
          const epoch = session;
          const operation = ++state.operation;
          const active2 = activeFor(entry);
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
            failed(error, "undo", active2);
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
            if (!entry.control.isConnected || !entry.button.isConnected || readRoute(entry.host)?.key !== entry.key) remove(entry);
          }
          for (const { host, control } of targets()) {
            if (!control || entries.has(control)) continue;
            const route = host && readRoute(host);
            if (!route) continue;
            const button2 = el("button", {
              type: "button",
              class: className,
              "aria-label": "Add to watchlist",
              title: "Add to watchlist using the toolkit’s Trakt account"
            }, watchlistIcon());
            const entry = { host, control, route, key: route.key, button: button2 };
            entry.click = (event) => add(entry, event);
            button2.addEventListener("click", entry.click);
            control.after(button2);
            entries.set(control, entry);
          }
          const native = /* @__PURE__ */ new Map();
          for (const entry of [...entries.values(), ...bulk?.targets?.() ?? []]) {
            if (!entry.control) continue;
            native.set(entry.key, Boolean(native.get(entry.key) || readCardWatchlisted(entry.control)));
          }
          for (const [key, watchlisted] of native) {
            const state = stateFor(key);
            if (state.wasWatchlisted && !watchlisted) state.added = false;
            state.wasWatchlisted = watchlisted;
          }
          for (const entry of entries.values()) updateButton(entry, stateFor(entry.key));
          syncBulk();
        }
        function schedule() {
          if (scheduled || destroyed) return;
          scheduled = true;
          queueMicrotask(() => {
            scheduled = false;
            scan();
          });
        }
        if (bulkButton) bulkButton.addEventListener("click", addAll);
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["href", "aria-describedby", "hidden"]
        });
        scan();
        return { node, destroy() {
          destroyed = true;
          nativeRefresh.destroy();
          observer.disconnect();
          for (const entry of entries.values()) remove(entry);
          states.clear();
          if (bulkButton) {
            bulkButton.removeEventListener("click", addAll);
            bulkButton.remove();
          }
          node.remove();
        } };
      }
    };
  }

  // src/features/watchlist/cards.js
  var CARD = ".poster-card, .fanart-card";
  var CONTROL = ".quick-icons .list-control.card, .quick-icons button.action.list";
  var watchlistCards = createWatchlistShortcuts({
    id: "watchlist-cards",
    markerId: "ogt-watchlist-cards",
    className: "ogt-watchlist-card",
    logLabel: "card",
    match: () => true,
    targets: () => [...document.querySelectorAll(CONTROL)].map((control) => ({ control, host: control.closest(CARD) })),
    readRoute: readCardRoute,
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
  `
  });

  // src/features/watchlist/credits.js
  var watchlistCredits = createWatchlistShortcuts({
    id: "watchlist-credits",
    markerId: "ogt-watchlist-credits",
    className: "ogt-watchlist-credit",
    logLabel: "credit",
    match: (route) => route?.name === "person",
    targets: () => [...document.querySelectorAll("article.credit-row")].map((host) => ({ host, control: readCreditControl(host) })),
    readRoute: readCardRoute,
    bulk: {
      label: "Watchlist all",
      target: () => document.querySelector("#credits .toolbar .controls"),
      targets: () => [...document.querySelectorAll("#credits article.poster-card")].map((host) => {
        const route = readCardRoute(host);
        return { host, control: readCreditControl(host), route, key: route?.key };
      }).filter((entry) => entry.route)
    },
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
    .ogt-watchlist-bulk {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      block-size: 34px;
      padding: 0 16px;
      margin-inline-start: 8px;
      border: 0;
      border-radius: 8px;
      background: var(--brand-first, #ed1c24);
      color: var(--color-card-text, white);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .ogt-watchlist-bulk:hover:not(:disabled) {
      background: var(--brand-second, #c41920);
      color: var(--color-card-text, white);
    }
    .ogt-watchlist-bulk:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .ogt-watchlist-bulk[hidden] { display: none; }
    .ogt-watchlist-bulk:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `
  });

  // src/features/watchlist-pick/data.js
  var DISPLAY_TO_API = { movie: "movies", show: "shows", season: "seasons", episode: "episodes" };
  var SINGULAR = new Set(Object.keys(DISPLAY_TO_API));
  function watchlistType(search = "", pathType = null) {
    let value = pathType;
    try {
      value = new URLSearchParams(search).get("display") || pathType;
    } catch {
    }
    if (typeof value !== "string") return null;
    const singular = value.trim().toLowerCase().replace(/s$/, "");
    return SINGULAR.has(singular) ? singular : null;
  }
  function apiType(display) {
    return display ? DISPLAY_TO_API[display] ?? null : null;
  }
  function usableId(value) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Number.isSafeInteger(value) && value > 0) return String(value);
    return null;
  }
  function titleOf(entity) {
    return typeof entity?.title === "string" ? entity.title.trim() : "";
  }
  function yearOf(entity) {
    return Number.isSafeInteger(entity?.year) ? entity.year : null;
  }
  function mediaHref(kind, id) {
    return `/${kind === "movie" ? "movies" : "shows"}/${encodeURIComponent(id)}`;
  }
  function normalizeWatchlistItem(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const kind = raw.type;
    if (!SINGULAR.has(kind)) return null;
    const entity = raw[kind];
    if (!entity || typeof entity !== "object" || Array.isArray(entity)) return null;
    if (kind === "movie" || kind === "show") {
      const title = titleOf(entity);
      const id = usableId(entity.ids?.slug) ?? usableId(entity.ids?.trakt);
      if (!title || !id) return null;
      return {
        key: `${kind}:${id}`,
        kind,
        title,
        year: yearOf(entity),
        subtitle: null,
        href: mediaHref(kind, id)
      };
    }
    const show = raw.show ?? entity.show;
    const showTitle = titleOf(show);
    const showId = usableId(show?.ids?.slug) ?? usableId(show?.ids?.trakt);
    if (!showTitle || !showId) return null;
    if (kind === "season") {
      const number = entity.number;
      if (!Number.isSafeInteger(number) || number < 0) return null;
      return {
        key: `season:${showId}:${number}`,
        kind,
        title: showTitle,
        year: yearOf(show),
        subtitle: `Season ${number}`,
        href: `/shows/${encodeURIComponent(showId)}/seasons/${number}`
      };
    }
    const season = entity.season;
    const episode = entity.number;
    if (!Number.isSafeInteger(season) || season < 0 || !Number.isSafeInteger(episode) || episode < 1) return null;
    const episodeTitle = titleOf(entity);
    return {
      key: `episode:${showId}:${season}:${episode}`,
      kind,
      title: showTitle,
      year: yearOf(show),
      subtitle: `S${season}E${episode}${episodeTitle ? ` · ${episodeTitle}` : ""}`,
      href: `/shows/${encodeURIComponent(showId)}/seasons/${season}/episodes/${episode}`
    };
  }
  function watchlistItems(payload) {
    if (!Array.isArray(payload)) return [];
    return payload.map(normalizeWatchlistItem).filter(Boolean);
  }
  function watchlistLabel(item) {
    if (!item) return "";
    const title = item.year ? `${item.title} (${item.year})` : item.title;
    return item.subtitle ? `${title} — ${item.subtitle}` : title;
  }
  function pickWatchlistItem(items, previousKey = null, random = Math.random) {
    const candidates = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!candidates.length) return null;
    let pool = candidates;
    if (previousKey != null && candidates.length > 1) {
      const others = candidates.filter((item) => item.key !== previousKey);
      if (others.length) pool = others;
    }
    const value = Number(random());
    const raw = Number.isFinite(value) ? Math.floor(Math.min(0.999999, Math.max(0, value)) * pool.length) : 0;
    return pool[raw];
  }

  // src/features/watchlist-pick/api.js
  var PAGE_SIZE = 100;
  var MAX_PAGES2 = 50;
  function watchlistPath(user, display) {
    const type = apiType(display);
    return `/users/${encodeURIComponent(user)}/watchlist${type ? `/${type}` : ""}`;
  }
  function createWatchlistApi2({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
    return {
      /** Every page, in og's order. Signed in, Trakt's page count bounds the reads. */
      async list(user, { display = null } = {}) {
        const path = watchlistPath(user, display);
        if (signedIn()) {
          const page = (number) => authPage(path, { page: number, limit: PAGE_SIZE });
          const first = await page(1);
          const pages = Math.min(Math.max(Number(first?.pages) || 1, 1), MAX_PAGES2);
          const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => page(index + 2)));
          return [first, ...rest].flatMap((result) => Array.isArray(result?.data) ? result.data : []);
        }
        const rows = [];
        for (let page = 1; page <= MAX_PAGES2; page++) {
          const data = await get(`${path}?page=${page}&limit=${PAGE_SIZE}`, { ttl: 0 });
          if (!Array.isArray(data) || !data.length) break;
          rows.push(...data);
          if (data.length < PAGE_SIZE) break;
        }
        return rows;
      }
    };
  }
  var watchlistApi2 = createWatchlistApi2();

  // src/features/watchlist-pick/styles.js
  var CSS9 = String.raw`
.ogt-watchlist-pick { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-stat, 6px) 10px; min-inline-size: 0; }
.ogt-watchlist-pick [hidden] { display: none !important; }
.ogt-watchlist-pick__button {
  display: inline-flex; align-items: center; justify-content: center; block-size: var(--control-height, 36px);
  padding: 0 var(--button-padding-inline, 12px); border: 1px solid light-dark(#d4d4d4, #3b3b3b);
  border-radius: var(--radius-control, 6px); background: light-dark(#f2f2f2, #232323);
  color: light-dark(#333, #e6e6e6); font: inherit; font-size: var(--font-size-button-secondary, 13px);
  white-space: nowrap; cursor: pointer;
}
.ogt-watchlist-pick__button:is(:hover, :focus-visible):not(:disabled) {
  border-color: var(--brand-primary, #ed1c24); color: light-dark(#111, #fff);
}
.ogt-watchlist-pick__button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.ogt-watchlist-pick__button:disabled { opacity: .6; cursor: default; }
.ogt-watchlist-pick__result {
  max-inline-size: 24ch; overflow: hidden; color: var(--color-text, light-dark(#222, #eee));
  font-family: var(--font-headings, inherit); font-size: var(--font-size-list-row-meta, 14px);
  text-decoration: none; text-overflow: ellipsis; white-space: nowrap;
}
.ogt-watchlist-pick__result:is(:hover, :focus-visible) { color: var(--color-link-hover, var(--brand-primary, #ed1c24)); text-decoration: underline; }
.ogt-watchlist-pick__result:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.ogt-watchlist-pick__status { margin: 0; color: var(--color-stat-noun, light-dark(#767676, #9a9a9a)); font-size: 12px; line-height: 1.4; }
.ogt-watchlist-pick__status:empty { display: none; }
`;

  // src/features/watchlist-pick/index.js
  var ID5 = "ogt-watchlist-pick";
  var ITEMS_TTL_MS = 5 * 60 * 1e3;
  var FILTER_RETRIES = 2;
  function failureHint(error) {
    if (error instanceof MissingClientIdError) {
      return error.ogSession ? error.message : "Sign in to og.trakt.tv or set a Trakt client ID to pick from a watchlist.";
    }
    if (error?.ogSession) return error.message || "Your og.trakt.tv session expired; reload the page to renew it.";
    if (error?.status === 403 || error?.status === 404) return "This watchlist is private or unavailable.";
    if (error?.status === 401) return "Sign in to Trakt to pick from this watchlist.";
    return "Could not read this watchlist. Try again later.";
  }
  function profileId(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  var watchlistPick = {
    id: "watchlist-pick",
    css: CSS9,
    authScoped: true,
    match: (route) => route.name === "watchlist",
    mount(route) {
      const actions = document.querySelector("section.title-row .title-bar .actions");
      if (!actions || document.getElementById(ID5)) return null;
      const profile = profileId(route.id);
      const button2 = el("button", { type: "button", class: "ogt-watchlist-pick__button", text: "Pick something" });
      const result = el("a", { class: "ogt-watchlist-pick__result", hidden: true });
      const announcer = el("span", { class: "ogt-visually-hidden", role: "status", "aria-live": "polite" });
      const status = el("span", { class: "ogt-watchlist-pick__status", role: "status", "aria-live": "polite" });
      const node = el("div", { id: ID5, class: "ogt-watchlist-pick" }, button2, result, announcer, status);
      const share = [...actions.children].find((child) => child.classList.contains("share"));
      actions.insertBefore(node, share ?? null);
      let active2 = true;
      let busy = false;
      let previousKey = null;
      let items = null;
      let itemsFor = null;
      let itemsAt = 0;
      let shownFor = null;
      const currentDisplay = () => watchlistType(location.search, route.type);
      const currentFilter = () => currentDisplay() ?? "all";
      function clearFilterMismatch() {
        if (!active2 || result.hidden || shownFor == null || shownFor === currentFilter()) return;
        result.hidden = true;
        result.removeAttribute("href");
        result.removeAttribute("title");
        result.textContent = "";
        previousKey = null;
        shownFor = null;
        status.textContent = "";
        announcer.textContent = "";
        button2.textContent = "Pick something";
      }
      function onSettle() {
        clearFilterMismatch();
      }
      async function load(display) {
        const key = display ?? "all";
        const fresh = items && itemsFor === key && Date.now() - itemsAt < ITEMS_TTL_MS;
        if (fresh) return items;
        const rows = watchlistItems(await watchlistApi2.list(profile, { display }));
        if (!active2) return null;
        if (itemsFor !== key) previousKey = null;
        items = rows;
        itemsFor = key;
        itemsAt = Date.now();
        return items;
      }
      async function choose() {
        if (busy) return;
        busy = true;
        button2.disabled = true;
        button2.textContent = "Picking…";
        status.textContent = "Reading the watchlist…";
        announcer.textContent = "";
        let display = currentDisplay();
        try {
          let loaded = null;
          for (let attempt = 0; attempt <= FILTER_RETRIES; attempt++) {
            loaded = await load(display);
            if (!active2) return;
            const latest = currentDisplay();
            if (latest === display) break;
            display = latest;
            loaded = null;
          }
          if (!loaded) {
            result.hidden = true;
            shownFor = null;
            status.textContent = "The page filter changed while picking. Try again.";
            button2.textContent = "Pick something";
            return;
          }
          if (!loaded.length) {
            result.hidden = true;
            result.removeAttribute("href");
            result.removeAttribute("title");
            result.textContent = "";
            shownFor = null;
            status.textContent = "Nothing to pick in this filter.";
            button2.textContent = "Pick something";
            return;
          }
          const picked = pickWatchlistItem(loaded, previousKey);
          previousKey = picked.key;
          const label = watchlistLabel(picked);
          result.href = picked.href;
          result.textContent = label;
          result.title = label;
          result.hidden = false;
          shownFor = currentFilter();
          status.textContent = "";
          announcer.textContent = `Picked ${label}.`;
          button2.textContent = "Pick again";
        } catch (error) {
          debugError("watchlist pick failed", error);
          if (!active2) return;
          result.hidden = true;
          result.removeAttribute("href");
          result.removeAttribute("title");
          result.textContent = "";
          previousKey = null;
          shownFor = null;
          items = null;
          itemsFor = null;
          itemsAt = 0;
          announcer.textContent = "";
          status.textContent = failureHint(error);
          button2.textContent = "Pick something";
        } finally {
          if (active2) {
            busy = false;
            button2.disabled = false;
          }
        }
      }
      button2.addEventListener("click", choose);
      document.addEventListener("ogt:settle", onSettle);
      return {
        node,
        destroy() {
          active2 = false;
          button2.removeEventListener("click", choose);
          document.removeEventListener("ogt:settle", onSettle);
          node.remove();
        }
      };
    }
  };

  // src/features/csv-export/api.js
  var PAGE_SIZE2 = 100;
  var MAX_PAGES3 = 200;
  var SEARCH_LIMIT = 25;
  function traktId(list) {
    const id = list?.ids?.trakt;
    if (Number.isSafeInteger(id) && id > 0) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return id;
    return "";
  }
  function missingOfficial() {
    const error = new Error("Official list not found.");
    error.status = 404;
    return error;
  }
  function exportLimitError() {
    const error = new Error("This list is too large to export as one CSV.");
    error.exportLimit = true;
    return error;
  }
  function incompleteExportError() {
    const error = new Error("The list changed while it was being read.");
    error.exportIncomplete = true;
    return error;
  }
  function pageCount(value) {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  function createExportApi({ get = apiGet, authPage = apiAuthPage, signedIn = isSignedIn } = {}) {
    async function readAll(path, { publicOnly = false } = {}) {
      if (!publicOnly && signedIn()) {
        const page = (number) => authPage(path, { page: number, limit: PAGE_SIZE2 });
        const first = await page(1);
        const pages = pageCount(first?.pages) ?? 1;
        if (pages > MAX_PAGES3) throw exportLimitError();
        if (!Array.isArray(first?.data) || pages > 1 && !first.data.length) throw incompleteExportError();
        const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => page(index + 2)));
        return first.data.concat(...rest.map((result) => {
          if (!Array.isArray(result?.data) || !result.data.length) throw incompleteExportError();
          return result.data;
        }));
      }
      const rows = [];
      let total = null;
      for (let page = 1; page <= MAX_PAGES3; page++) {
        const { data, pages } = await get(`${path}?page=${page}&limit=${PAGE_SIZE2}`, { ttl: 0, withHeaders: true });
        const reported = pageCount(pages);
        if (reported != null) total = total == null ? reported : Math.max(total, reported);
        if (total != null && total > MAX_PAGES3) throw exportLimitError();
        if (!Array.isArray(data)) throw incompleteExportError();
        if (total != null) {
          if (!data.length && total > 1) throw incompleteExportError();
          rows.push(...data);
          if (page >= total) return rows;
        } else {
          if (!data.length) return rows;
          rows.push(...data);
          if (data.length < PAGE_SIZE2) return rows;
        }
      }
      throw exportLimitError();
    }
    async function officialId(slug) {
      const summary2 = await get(`/lists/${encodeURIComponent(slug)}`);
      if (summary2?.type === "official") {
        const id2 = traktId(summary2);
        if (id2) return id2;
        throw missingOfficial();
      }
      if (/^\d+$/.test(slug)) throw missingOfficial();
      const query = slug.replaceAll("-", " ");
      const results = await get(`/search/list?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`);
      if (!Array.isArray(results)) throw missingOfficial();
      const match = results.find((row) => row?.list?.type === "official" && row.list.ids?.slug === slug);
      const id = traktId(match?.list);
      if (!id) throw missingOfficial();
      return id;
    }
    return {
      /** Personal, collaboration and liked list pages all resolve through the list's owner path. */
      list(profile, slug) {
        return readAll(`/users/${encodeURIComponent(profile)}/lists/${encodeURIComponent(slug)}/items`);
      },
      watchlist(profile) {
        return readAll(`/users/${encodeURIComponent(profile)}/watchlist`);
      },
      /** Official lists are public and have no profile owner. */
      async official(slug) {
        const id = await officialId(slug);
        return readAll(`/lists/${id}/items`, { publicOnly: true });
      }
    };
  }
  var exportApi = createExportApi();

  // src/features/csv-export/data.js
  var CSV_COLUMNS = [
    "rank",
    "type",
    "title",
    "year",
    "season",
    "episode",
    "trakt",
    "imdb",
    "tmdb",
    "listed_at",
    "notes"
  ];
  var CSV_HEADER = [
    "Rank",
    "Type",
    "Title",
    "Year",
    "Season",
    "Episode",
    "Trakt ID",
    "IMDb ID",
    "TMDb ID",
    "Listed At",
    "Notes"
  ];
  var TYPES = /* @__PURE__ */ new Set(["movie", "show", "season", "episode", "person"]);
  function text2(value) {
    return typeof value === "string" ? value : "";
  }
  function integer(value, minimum = 0) {
    return Number.isSafeInteger(value) && value >= minimum ? value : "";
  }
  function titleOf2(entity) {
    return typeof entity?.title === "string" ? entity.title.trim() : "";
  }
  function nameOf(entity) {
    const name = typeof entity?.name === "string" ? entity.name.trim() : "";
    return name || titleOf2(entity);
  }
  function yearOf2(entity) {
    return integer(entity?.year, 1);
  }
  function usableId2(value) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Number.isSafeInteger(value) && value > 0) return String(value);
    return "";
  }
  function idSet(entity) {
    const ids = entity?.ids;
    return {
      trakt: usableId2(ids?.trakt),
      imdb: usableId2(ids?.imdb),
      tmdb: usableId2(ids?.tmdb)
    };
  }
  function normalizeExportItem(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const kind = raw.type;
    if (!TYPES.has(kind)) return null;
    const entity = raw[kind];
    if (!entity || typeof entity !== "object" || entity === null || Array.isArray(entity)) return null;
    let title = "";
    let year = "";
    let season = "";
    let episode = "";
    let ids;
    if (kind === "movie" || kind === "show") {
      title = titleOf2(entity);
      year = yearOf2(entity);
      ids = idSet(entity);
    } else if (kind === "person") {
      title = nameOf(entity);
      ids = idSet(entity);
    } else {
      const show = raw.show ?? entity.show;
      const showTitle = titleOf2(show);
      const showYear = yearOf2(show);
      year = showYear;
      ids = idSet(entity);
      if (kind === "season") {
        title = showTitle || titleOf2(entity);
        season = integer(entity.number);
      } else {
        title = titleOf2(entity) || showTitle;
        season = integer(entity.season);
        episode = integer(entity.number, 1);
      }
    }
    return {
      rank: integer(raw.rank),
      type: kind,
      title,
      year,
      season,
      episode,
      ...ids,
      listed_at: text2(raw.listed_at),
      notes: text2(raw.notes)
    };
  }
  function exportItems(payload) {
    if (!Array.isArray(payload)) return [];
    return payload.map(normalizeExportItem).filter(Boolean);
  }
  function escapeCsvCell(value) {
    let cell = value == null ? "" : String(value);
    if (/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(cell)) cell = `'${cell}`;
    if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
    return cell;
  }
  function toCsv(items) {
    const rows = Array.isArray(items) ? items : [];
    const lines = [CSV_HEADER.map(escapeCsvCell).join(",")];
    for (const item of rows) lines.push(CSV_COLUMNS.map((column) => escapeCsvCell(item?.[column])).join(","));
    return `${lines.join("\r\n")}\r
`;
  }
  function decodePart(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  function exportFilename(route) {
    const owner = decodePart(String(route?.id ?? ""));
    const source = route?.name === "watchlist" ? "watchlist" : decodePart(String(route?.slug ?? ""));
    const prefix = route?.name === "official-list" ? "official" : owner;
    const base = [prefix, source].filter(Boolean).join("-") || "export";
    const safe = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
    return `trakt-${safe || "export"}.csv`;
  }

  // src/features/csv-export/styles.js
  var CSS10 = String.raw`
.ogt-csv-export { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-stat, 6px) 10px; min-inline-size: 0; }
.ogt-csv-export__button {
  display: inline-flex; align-items: center; justify-content: center; block-size: var(--control-height, 36px);
  padding: 0 var(--button-padding-inline, 12px); border: 1px solid light-dark(#d4d4d4, #3b3b3b);
  border-radius: var(--radius-control, 6px); background: light-dark(#f2f2f2, #232323);
  color: light-dark(#333, #e6e6e6); font: inherit; font-size: var(--font-size-button-secondary, 13px);
  white-space: nowrap; cursor: pointer;
}
.ogt-csv-export__button:is(:hover, :focus-visible):not(:disabled) {
  border-color: var(--brand-primary, #ed1c24); color: light-dark(#111, #fff);
}
.ogt-csv-export__button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.ogt-csv-export__button:disabled { opacity: .6; cursor: default; }
.ogt-csv-export__status { margin: 0; color: var(--color-stat-noun, light-dark(#767676, #9a9a9a)); font-size: 12px; line-height: 1.4; }
.ogt-csv-export__status:empty { display: none; }
`;

  // src/features/csv-export/index.js
  var ID6 = "ogt-csv-export";
  function decodePart2(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  function failureHint2(error, target) {
    if (error?.exportLimit) return `This ${target} is too large to export as one CSV.`;
    if (error?.exportIncomplete) return `Could not read this ${target} completely. Try again later.`;
    if (error instanceof MissingClientIdError) {
      return error.ogSession ? error.message : `Sign in to og.trakt.tv or set a Trakt client ID to export this ${target}.`;
    }
    if (error?.ogSession) return error.message || "Your og.trakt.tv session expired; reload the page to renew it.";
    if (error?.status === 403 || error?.status === 404) return `This ${target} is private or unavailable.`;
    if (error?.status === 401) return `Sign in to Trakt to export this ${target}.`;
    return `Could not read this ${target}. Try again later.`;
  }
  var csvExport = {
    id: "csv-export",
    css: CSS10,
    authScoped: true,
    match: (route) => route.name === "list" || route.name === "watchlist" || route.name === "official-list",
    mount(route) {
      const actions = document.querySelector("section.title-row .title-bar .actions");
      if (!actions || document.getElementById(ID6)) return null;
      const watchlist2 = route.name === "watchlist";
      const official = route.name === "official-list";
      const target = watchlist2 ? "watchlist" : "list";
      const profile = official ? null : decodePart2(route.id);
      const slug = watchlist2 ? null : decodePart2(route.slug);
      const button2 = el("button", {
        type: "button",
        class: "ogt-csv-export__button",
        title: `Download this ${target} as a CSV file`,
        text: "Export CSV"
      });
      const status = el("span", { class: "ogt-csv-export__status", role: "status", "aria-live": "polite" });
      const node = el("div", { id: ID6, class: "ogt-csv-export" }, button2, status);
      const share = [...actions.children].find((child) => child.classList.contains("share"));
      actions.insertBefore(node, share ?? null);
      let active2 = true;
      let busy = false;
      let objectUrl = null;
      let revokeTimer = null;
      function releaseObjectUrl() {
        clearTimeout(revokeTimer);
        revokeTimer = null;
        if (!objectUrl) return;
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
        }
        objectUrl = null;
      }
      function save(filename, csv) {
        releaseObjectUrl();
        objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.rel = "noopener";
        anchor.hidden = true;
        (document.body ?? document.documentElement).append(anchor);
        anchor.click();
        anchor.remove();
        revokeTimer = setTimeout(() => {
          revokeTimer = null;
          if (!objectUrl) return;
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
          }
          objectUrl = null;
        }, 0);
      }
      async function run() {
        if (busy) return;
        busy = true;
        button2.disabled = true;
        button2.textContent = "Exporting…";
        status.textContent = watchlist2 ? "Reading watchlist…" : "Reading list…";
        try {
          const rows = watchlist2 ? await exportApi.watchlist(profile) : official ? await exportApi.official(slug) : await exportApi.list(profile, slug);
          if (!active2) return;
          const items = exportItems(rows);
          if (parseRoute().key !== route.key) return;
          save(exportFilename(route), toCsv(items));
          status.textContent = `Exported ${items.length} ${items.length === 1 ? "item" : "items"}.`;
        } catch (error) {
          if (objectUrl) releaseObjectUrl();
          debugError("CSV export failed", error);
          if (!active2) return;
          status.textContent = failureHint2(error, target);
        } finally {
          if (active2) {
            busy = false;
            button2.disabled = false;
            button2.textContent = "Export CSV";
          }
        }
      }
      button2.addEventListener("click", run);
      return {
        node,
        destroy() {
          active2 = false;
          button2.removeEventListener("click", run);
          releaseObjectUrl();
          node.remove();
        }
      };
    }
  };

  // src/actions.js
  var PLACEHOLDER_HELP = "Placeholders: {title} {year} {tmdb} {imdb} {imdbnum} {episodeimdb} {episodeimdbnum} {tvdb} {type} {season} {episode} {id} {plural}\nServer hosts: {jellyfin} {emby} {radarr} {sonarr} {seerr}";
  function parseCustomLink(answer) {
    const separator = answer.indexOf("|");
    if (separator < 0) return { error: 'Use "Label | URL": the | separator is missing.' };
    const label = answer.slice(0, separator).trim();
    const url = answer.slice(separator + 1).trim();
    if (!label || !url) return { error: "Both a label and a URL are required." };
    if (!isCustomLinkUrl(url)) return { error: "The URL must start with http://, https://, or a server placeholder." };
    return { label, url };
  }
  async function promptAddCustomLink() {
    const answer = await promptDialog(`Enter it as "Label | URL".

${PLACEHOLDER_HELP}`, {
      title: "Add custom link",
      label: "Label | URL",
      ok: "Add link",
      value: "My service | https://example.com/watch/{tmdb}?s={season}&e={episode}",
      validate: (text3) => parseCustomLink(text3).error ?? null
    });
    if (!answer) return null;
    const { label, url, error } = parseCustomLink(answer);
    if (error) {
      toast(error);
      return null;
    }
    addCustomLink({ label, url });
    toast(`Link "${label}" added.`);
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
    return { label, url };
  }
  async function promptRemoveCustomLink() {
    const links = getCustomLinks();
    if (!links.length) {
      toast("No custom links to remove.");
      return;
    }
    const answer = await promptDialog(`Type the label of the link to remove:

${links.map((entry) => `• ${entry.label}`).join("\n")}`, {
      title: "Remove custom link",
      label: "Label",
      ok: "Remove",
      value: links[0].label,
      validate: (text3) => links.some((entry) => entry.label === text3.trim()) ? null : `No link labelled "${text3.trim()}".`
    });
    if (!answer) return;
    const next = removeCustomLink(answer.trim());
    if (next.length === links.length) toast(`No link labelled "${answer.trim()}".`);
    else toast("Link removed.");
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
  }
  async function promptClientId() {
    const answer = await promptDialog(
      "Paste your Trakt API client ID. Create a free app at https://app.trakt.tv/settings/apps. The redirect URI can be anything, since this script only calls public endpoints. Leave it empty to clear it.",
      { title: "Trakt API client ID", label: "Client ID", ok: "Save", value: getClientId(), placeholder: "(none)" }
    );
    if (answer === null) return;
    const before = getClientId();
    const clean = setClientId(answer);
    if (getClientId() !== before) document.dispatchEvent(new Event("ogt:authchange"));
    toast(clean ? "Client ID saved." : "Client ID cleared.");
    document.dispatchEvent(new CustomEvent("ogt:refresh"));
  }

  // src/oauth-menu.js
  var CODE_TOAST_MS = 10 * 60 * 1e3;
  var QUIET = /* @__PURE__ */ new Set([DEVICE_MESSAGES[400], DEVICE_MESSAGES[429]]);
  function copyText(text3) {
    if (typeof GM_setClipboard !== "function") return false;
    try {
      GM_setClipboard(text3, "text");
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
      if (hasOwnSession()) {
        toast("Already signed in; sign out before changing accounts.");
        return;
      }
      const uri = await promptDialog("Enter the redirect URI registered for your Trakt app. It is used for token refresh.", {
        title: "Sign in to Trakt",
        label: "Redirect URI",
        ok: "Continue",
        value: getPrivateValue(STORAGE.redirectUri) || "http://localhost:5173/callback"
      });
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
      if (!hasOwnSession()) {
        toast(isSignedIn() ? "Signed in through og.trakt.tv; sign out there to end that session." : "Signed out of Trakt.");
        return;
      }
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
      } catch (error) {
        toast(error?.ogSession ? error.message : isSignedIn() ? "Could not load your Trakt profile." : "Trakt session expired; sign in again.");
      }
    });
  }

  // src/menu.js
  var ATTRIBUTION = `${NAME} uses Trakt but is not endorsed or certified by Trakt.`;
  var FEATURE_LABELS = {
    "custom-links": "Custom links",
    "season-chart": "Season chart",
    "summary-ratings": "Trakt ratings chart",
    "your-ratings": "Your ratings",
    playback: "Paused playback",
    pronunciation: "Name pronunciation",
    library: "Add to library",
    watchlist: "Add to watchlist",
    "watchlist-cards": "Watchlist card shortcuts",
    "watchlist-credits": "Watchlist credit shortcuts",
    "watchlist-pick": "Watchlist pick",
    "csv-export": "CSV export",
    "month-review": "Last month in review",
    "all-lists": "All lists",
    "list-preview": "List preview titles"
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
  var FEATURES = [customLinks, seasonChart, summaryRatings, yourRatings, playback, pronunciation, library, watchlist, watchlistCards, watchlistCredits, csvExport, watchlistPick, monthReview, allLists, listPreview];
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
    const authChanged = () => {
      host?.reset?.();
      sync();
    };
    document.addEventListener("ogt:authchange", authChanged);
    document.addEventListener("ogt:featurechange", sync);
    const announce = () => document.dispatchEvent(new Event("ogt:authchange"));
    onRemoteValueChange(STORAGE.clientId, announce);
    onRemoteValueChange(STORAGE.tokens, (before, after) => {
      if (Boolean(before?.access_token) !== Boolean(after?.access_token) || before?.client_id !== after?.client_id) announce();
    });
    const openGate = () => {
      if (canMount) return;
      canMount = true;
      rememberNativeResources(moduleWatch.entries.keys());
      moduleWatch.stop();
      injectStyles([successNotificationCss, DIALOG_CSS, ...FEATURES.map((feature) => feature.css).filter(Boolean)]);
      host = createFeatureHost(FEATURES, { isEnabled: isFeatureEnabled });
      createRouter({
        onRoute(next) {
          const changed = next.key !== route.key;
          route = next;
          if (changed) document.dispatchEvent(new CustomEvent("ogt:routechange", { detail: { route: next } }));
          sync();
        },
        // Every settled DOM change: re-mounts anything the app re-rendered away, and lets features
        // follow a query-only change that routechange cannot report.
        onSettle() {
          sync();
          document.dispatchEvent(new CustomEvent("ogt:settle"));
        }
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
