/**
 * Shared helpers for the controls the list and watchlist features add to og's title bar.
 */

/** Insert `node` before og's share control; false when the title bar is not there. */
export function mountInTitleBar(node) {
  const actions = document.querySelector('section.title-row .title-bar .actions');
  if (!actions) return false;
  const share = [...actions.children].find((child) => child.classList.contains('share'));
  actions.insertBefore(node, share ?? null);
  return true;
}

/**
 * The button rules the title-bar features share. `className` is the feature's own class, so the markup and the
 * computed styles stay exactly as they were.
 */
export function titleBarButtonCss(className) {
  return String.raw`.${className} {
  display: inline-flex; align-items: center; justify-content: center; block-size: var(--control-height, 36px);
  padding: 0 var(--button-padding-inline, 12px); border: 1px solid light-dark(#d4d4d4, #3b3b3b);
  border-radius: var(--radius-control, 6px); background: light-dark(#f2f2f2, #232323);
  color: light-dark(#333, #e6e6e6); font: inherit; font-size: var(--font-size-button-secondary, 13px);
  white-space: nowrap; cursor: pointer;
}
.${className}:is(:hover, :focus-visible):not(:disabled) {
  border-color: var(--brand-primary, #ed1c24); color: light-dark(#111, #fff);
}
.${className}:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.${className}:disabled { opacity: .6; cursor: default; }`;
}
