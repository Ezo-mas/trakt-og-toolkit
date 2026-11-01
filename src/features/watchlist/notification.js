import { el } from '../../core/dom.js';
import { tryNativeWatchlistToast } from './native-toast.js';
import { debugError } from '../../core/log.js';

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

/** Independent markup, using OG's design tokens. Keep it below any existing native notices. */
export function showWatchlistToast() {
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
  const node = el('div', { class: 'ogt-watchlist-toast', role: 'status', 'aria-atomic': 'true' },
    el('span', { class: 'ogt-watchlist-toast__icon' }, icon('m7 12 3 3 7-7', true)),
    el('p', { class: 'ogt-watchlist-toast__message', text: 'Added to your watchlist.' }), close, line);
  root.prepend(node);
  let timer, animation, fraction = 1, started, duration, removed = false;
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
  close.addEventListener('click', remove);
  node.addEventListener('pointerenter', () => hold('pointer'));
  node.addEventListener('pointerleave', () => release('pointer'));
  node.addEventListener('focusin', () => hold('focus'));
  node.addEventListener('focusout', event => { if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) release('focus'); });
  notices.unshift(remove);
  while (notices.length > 3) notices.at(-1)();
  start(5000);
  return { node, destroy: remove };
}

export async function notifyWatchlistAdded({ active = () => true } = {}) {
  try { if (await tryNativeWatchlistToast(active)) return; }
  catch (error) { debugError('native watchlist toast unavailable', error); }
  if (active()) showWatchlistToast();
}
