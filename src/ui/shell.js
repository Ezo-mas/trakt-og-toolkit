/** Style injection and toasts. */
import { CSS } from './styles.js';
import { el } from '../core/dom.js';

const STYLE_ID = 'ogt-styles';

/** Inject the shared CSS plus any per-feature CSS (`feature.css`), once. */
export function injectStyles(extra = []) {
  if (document.getElementById(STYLE_ID)) return;
  const css = [CSS, ...extra].join('\n');

  if (typeof GM_addStyle === 'function') {
    try {
      GM_addStyle(css);
      return;
    } catch {
      /* fall through to a plain <style> */
    }
  }

  const style = el('style', { id: STYLE_ID, text: css });
  (document.head || document.documentElement).append(style);
}

let toastTimer = null;
let toastRoot = null;

export function toast(message, { duration = 3200 } = {}) {
  if (!message) return;

  if (!toastRoot) {
    toastRoot = el('div', { class: 'ogt-toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastRoot);
  }

  toastRoot.replaceChildren(el('div', { class: 'ogt-toast__body', text: message }));
  const body = toastRoot.firstElementChild;
  requestAnimationFrame(() => body?.setAttribute('data-open', ''));

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    body?.removeAttribute('data-open');
    setTimeout(() => toastRoot?.remove(), 200);
    toastRoot = null;
  }, duration);
}
