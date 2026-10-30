import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { libraryApi } from './api.js';
import { toast } from '../../ui/shell.js';

const ID = 'ogt-library';
export const library = {
  id: 'library',
  css: `
    .ogt-library { --action-color: var(--brand-quaternary, #129982); margin: 0; }
    .ogt-library[hidden] { display: none !important; }
    /* Use OG's design values without inheriting its component state selectors. */
    .ogt-library__button { display: flex; align-items: center; width: 100%;
      height: var(--summary-action-height, 60px); padding: 0; border: 0;
      border-radius: var(--radius-summary-action, 6px);
      background: color-mix(in srgb, var(--action-color) var(--summary-action-tint, 3%), var(--color-action-bg, #202020));
      box-shadow: inset 0 0 0 var(--summary-action-outline, 1px) color-mix(in srgb, var(--action-color) var(--summary-action-outline-mix, 65%), transparent);
      color: var(--action-color); font: inherit; text-align: start; cursor: pointer;
      transition: background-color var(--transition-summary-action, 150ms), color var(--transition-summary-action, 150ms); }
    .ogt-library__button:is(:hover, :focus-visible):not(:disabled) { background: var(--action-color); color: var(--color-text-inverse, white); box-shadow: none; }
    .ogt-library__glyph { display: grid; place-items: center; flex-shrink: 0; align-self: stretch; width: var(--action-icon-width, 48px); }
    .ogt-library__glyph svg { width: 24px; height: 28px; }
    .ogt-library__text { flex: 1; min-width: 0; font-family: var(--font-headings, inherit); }
    .ogt-library__title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: var(--font-size-action, 13px); font-weight: var(--font-weight-headings-heavy, 700);
      letter-spacing: var(--summary-action-tracking, .04em); line-height: var(--summary-action-title-line, 1.3); text-transform: uppercase; }
    .ogt-library__button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
    .ogt-library__button:disabled { opacity: .6; cursor: default; }
    .ogt-library__status { font: 12px/1.4 system-ui; margin: 6px 0 0; }
    .ogt-library__status:empty { display: none; }
  `,
  match: route => route.kind === 'movie' && route.name === 'title' || route.kind === 'show' && ['title', 'season', 'episode'].includes(route.name),
  mount(route) {
    const anchor = document.querySelector('.summary-frame #overview .top .actions .action-buttons') ||
      document.querySelector('.summary-frame #overview .top .actions');
    if (!anchor || document.getElementById(ID)) return null;
    let destroyed = false;
    let busy = false;
    let session = 0;
    let added = false;
    let wasCollected = false;
    const label = el('span', { class: 'ogt-library__title', text: 'Add to library' });
    const glyph = el('span', { class: 'ogt-library__glyph', 'aria-hidden': 'true' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 28', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' })) svg.setAttribute(name, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 2h17v24H3V4a2 2 0 0 1 2-2Z M3 5H1V2a2 2 0 0 1 2-2h17v2 M14 2v8l3-2 3 2V2');
    svg.append(path);
    glyph.append(svg);
    const button = el('button', { type: 'button', class: 'ogt-library__button',
      title: 'Add using the toolkit’s Trakt account' });
    button.append(glyph, el('span', { class: 'ogt-library__text' }, label));
    const status = el('p', { class: 'ogt-library__status', role: 'status', 'aria-live': 'polite' });
    const node = el('div', { id: ID, class: 'ogt-library' }, button, status);
    function syncVisibility() {
      const titles = [...anchor.querySelectorAll('.summary-action .title')].filter(title => !node.contains(title));
      const collected = titles.some(title => /\bin library\b/i.test(title.textContent));
      if (wasCollected && !collected) added = false;
      wasCollected = collected;
      const nativeLibrary = collected || titles.some(title => /\badd to library\b/i.test(title.textContent));
      node.hidden = added || nativeLibrary;
    }
    async function add() {
      if (busy || node.hidden) return;
      if (!isSignedIn()) { status.textContent = 'Sign in to Trakt through the toolkit menu first.'; return; }
      busy = true;
      const epoch = session;
      button.disabled = true;
      label.textContent = 'Adding to library…';
      status.textContent = '';
      const active = () => !destroyed && epoch === session;
      try {
        const result = await libraryApi.add(route, { confirm: message => window.confirm(message), active });
        if (!active()) return;
        if (!result.cancelled) {
          added = true;
          syncVisibility();
          toast('Added to your toolkit Trakt account’s library. Reload to update OG’s status.');
          return;
        }
      } catch (error) {
        if (active()) status.textContent = error.status === 429 ? 'Trakt rate limited this request; try again later.' :
          error.status ? 'Could not add to library. Check your toolkit sign-in and try again.' : error.message;
      } finally {
        if (active()) {
          busy = false;
          button.disabled = false;
          label.textContent = 'Add to library';
        }
      }
    }
    function authChanged() {
      session++;
      busy = false;
      button.disabled = false;
      added = false;
      wasCollected = false;
      label.textContent = 'Add to library';
      status.textContent = '';
      syncVisibility();
    }
    button.addEventListener('click', add);
    document.addEventListener('ogt:authchange', authChanged);
    // Keep OG's own controls intact; this is a separate manual-add action.
    const history = anchor.querySelector('.stacked');
    if (history) history.after(node);
    else anchor.append(node);
    const observer = new MutationObserver(syncVisibility);
    observer.observe(anchor, { childList: true, subtree: true, characterData: true });
    syncVisibility();
    return { node, destroy() {
      destroyed = true;
      observer.disconnect();
      button.removeEventListener('click', add);
      document.removeEventListener('ogt:authchange', authChanged);
      node.remove();
    } };
  },
};
