/** Style injection, toasts and the trailer modal. */
import { CSS } from './styles.js';
import { el } from '../core/dom.js';

const STYLE_ID = 'ogt-styles';

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  if (typeof GM_addStyle === 'function') {
    try {
      GM_addStyle(CSS);
      return;
    } catch {
      /* fall through to a plain <style> */
    }
  }

  const style = el('style', { id: STYLE_ID, text: CSS });
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

/**
 * A minimal modal. Returns a close function; it restores focus to whatever was
 * focused before opening and closes on Escape or a backdrop click.
 */
export function showModal({ label, content, actions = [], onClose }) {
  const previouslyFocused = document.activeElement;
  const box = el('div', { class: 'ogt-modal__box', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, content);

  const close = el('button', { class: 'ogt-modal__close', type: 'button', text: 'Close' });
  box.append(el('div', { class: 'ogt-modal__bar' }, ...actions, close));

  const root = el('div', { class: 'ogt-modal' }, box);

  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      teardown();
    }
  };

  function teardown() {
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    onClose?.();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
  }

  root.addEventListener('mousedown', (event) => {
    if (event.target === root) teardown();
  });
  close.addEventListener('click', teardown);
  document.addEventListener('keydown', onKey, true);

  document.body.append(root);
  close.focus({ preventScroll: true });

  return teardown;
}

export function showTrailer({ key, title }) {
  if (!key) return null;

  // og sets <meta name="referrer" content="same-origin">, which strips the Referer
  // on the cross-origin iframe request and makes YouTube refuse to play (error 153).
  // referrerpolicy on the iframe overrides the document policy for that request.
  const frame = el('iframe', {
    src: `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`,
    title: title || 'Trailer',
    referrerpolicy: 'strict-origin-when-cross-origin',
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowfullscreen: true,
  });

  const openOnYouTube = el('a', {
    class: 'ogt-modal__link',
    href: `https://www.youtube.com/watch?v=${key}`,
    target: '_blank',
    rel: 'noopener noreferrer',
    text: 'Open on YouTube',
  });

  return showModal({ label: title || 'Trailer', content: frame, actions: [openOnYouTube] });
}
