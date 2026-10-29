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
