import { el } from '../core/dom.js';
import { tryNativeToast } from './native-toast.js';
import { debugError } from '../core/log.js';

let root, observed, resize;
const notices = [];

function icon(path, circle = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (circle) {
    const node = document.createElementNS(svg.namespaceURI, 'circle');
    node.setAttribute('cx', '12'); node.setAttribute('cy', '12'); node.setAttribute('r', '11');
    node.setAttribute('fill', 'currentColor'); svg.append(node);
  }
  const node = document.createElementNS(svg.namespaceURI, 'path');
  for (const [key, value] of Object.entries({ d: path, fill: 'none', stroke: circle ? '#163516' : 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) node.setAttribute(key, value);
  svg.append(node);
  return svg;
}

/**
 * Shared fallback; retain the watchlist CSS classes so existing notices/styles remain compatible.
 * `onUndo` adds a button inside the notice because OG's native notifier cannot take one.
 */
export function showSuccessToast(message = 'You added this title to your watchlist.', { onUndo, active = () => true } = {}) {
  if (!root?.isConnected) {
    resize?.disconnect();
    root = el('div', { class: 'ogt-toast ogt-watchlist-toasts' });
    document.body.append(root);
  }
  const native = document.querySelector('.toaster');
  const position = () => root?.style.setProperty('--ogt-native-toast-height', `${native?.isConnected && native.children.length ? native.getBoundingClientRect().height + 8 : 0}px`);
  if (native !== observed) {
    resize?.disconnect(); observed = native;
    if (native && typeof ResizeObserver === 'function') { resize = new ResizeObserver(position); resize.observe(native); }
  }
  position();
  const close = el('button', { type: 'button', class: 'ogt-watchlist-toast__close', 'aria-label': 'Close' }, icon('M6 6l12 12M18 6 6 18'));
  const line = el('span', { class: 'ogt-watchlist-toast__timer', 'aria-hidden': 'true' });
  const actions = el('div', { class: 'ogt-watchlist-toast__actions' });
  const undo = typeof onUndo === 'function'
    ? el('button', { type: 'button', class: 'ogt-watchlist-toast__undo', text: 'Undo' })
    : null;
  if (undo) actions.append(undo);
  actions.append(close);
  const error = el('p', { class: 'ogt-watchlist-toast__error', 'aria-live': 'polite' });
  const node = el('div', { class: 'ogt-watchlist-toast', role: 'status', 'aria-atomic': 'true' },
    el('span', { class: 'ogt-watchlist-toast__icon' }, icon('m7 12 3 3 7-7', true)),
    el('p', { class: 'ogt-watchlist-toast__message', text: message }), actions, error, line);
  root.prepend(node);
  let timer, animation, fraction = 1, started, duration, removed = false, undoing = false;
  const holds = new Set();
  const remove = () => {
    if (removed) return;
    removed = true;
    clearTimeout(timer); animation?.cancel();
    node.remove();
    const index = notices.indexOf(remove); if (index >= 0) notices.splice(index, 1);
    if (!notices.length) { resize?.disconnect(); observed = null; root?.remove(); root = null; }
  };
  const start = ms => {
    duration = ms; started = Date.now();
    animation?.cancel();
    animation = line.animate?.([{ transform: `scaleX(${fraction})` }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards' });
    animation?.finished?.catch(() => {}); // Closing/restarting legitimately cancels the countdown.
    timer = setTimeout(remove, ms);
  };
  const hold = kind => {
    if (holds.has(kind)) return;
    if (!holds.size) { fraction *= Math.max(0, 1 - (Date.now() - started) / duration); clearTimeout(timer); animation?.pause(); }
    holds.add(kind);
  };
  const release = kind => { if (holds.delete(kind) && !holds.size) start(1000); };
  const runUndo = async () => {
    if (!undo || undoing || removed) return;
    // The page that made the save is gone, so its Undo can no longer restore the button.
    if (!active()) { undo.remove(); error.textContent = 'Undo is only available on the page you saved from.'; return; }
    undoing = true;
    hold('undo');
    undo.disabled = true;
    undo.textContent = 'Undoing…';
    error.textContent = '';
    try {
      if (await onUndo() === false) throw new Error('Undo was not confirmed.');
      remove();
    } catch (undoError) {
      debugError('success notice undo failed', undoError);
      if (removed) return;
      error.textContent = 'Could not undo. Try again.';
      undoing = false;
      undo.disabled = false;
      undo.textContent = 'Undo';
      release('undo');
    }
  };
  close.addEventListener('click', remove);
  undo?.addEventListener('click', runUndo);
  node.addEventListener('pointerenter', () => hold('pointer'));
  node.addEventListener('pointerleave', () => release('pointer'));
  node.addEventListener('focusin', () => hold('focus'));
  node.addEventListener('focusout', event => { if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) release('focus'); });
  notices.unshift(remove);
  while (notices.length > 3) notices.at(-1)();
  start(5000);
  return { node, destroy: remove };
}

/**
 * Native notice wins when it can carry the message. Undoable saves use the matching fallback
 * directly, because OG's native notifier cannot take an Undo button.
 */
export async function notifySuccess(message, active = () => true, { undo } = {}) {
  if (typeof undo === 'function') {
    if (!active()) return { native: false, handle: null };
    return { native: false, handle: showSuccessToast(message, { onUndo: undo, active }) };
  }
  try { if (await tryNativeToast(message, active)) return { native: true }; }
  catch (error) { debugError('native success toast unavailable', error); }
  if (!active()) return { native: false, handle: null };
  return { native: false, handle: showSuccessToast(message) };
}
