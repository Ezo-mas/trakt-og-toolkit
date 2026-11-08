/** All styles in one place, injected once. Prefix is `ogt-` to avoid collisions. */
export const CSS = String.raw`
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
  min-inline-size: 0;
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
