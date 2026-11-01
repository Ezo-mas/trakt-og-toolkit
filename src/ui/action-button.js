/** Shared presentation only; each feature owns its requests and native-state handling. */
export function findActionStack(doc = document) {
  return doc.querySelector('.summary-frame #overview .top .actions .action-buttons') ||
    doc.querySelector('.summary-frame #overview .top .actions');
}

export function actionButtonCss(prefix, color) {
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
