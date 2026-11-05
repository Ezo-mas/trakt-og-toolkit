import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { isSignedIn } from '../../core/trakt.js';
import { toast } from '../../ui/shell.js';
import { STORAGE, setPrivateValue } from '../../core/store.js';
import { loadFirstMonth, loadReview } from './api.js';
import { fanart, lastMonth, shiftMonth } from './data.js';
import { CSS } from './styles.js';
// Decorative SVGs keep the tiles crisp without depending on og's icon font.
function tileIcon(kind) {
  const paths = {
    plays: ['M7 3 22 12 7 21Z'],
    hours: ['M10 2h4M12 5v2M19 6l2-2', 'M12 8v5l3 2', 'M21 14a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
    ratings: ['M8 10 12 3c1-2 3-1 3 1v5h5c2 0 2 2 2 3l-2 7c0 1-1 2-3 2H8Z', 'M3 10h5v11H3Z'],
    comments: ['M22 11c0 5-4 8-10 8H8l-6 4 2-7a8 8 0 0 1-2-5c0-5 4-9 10-9s10 4 10 9Z'],
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', class: 'ogt-review__icon', 'aria-hidden': 'true', focusable: 'false',
    fill: ['ratings', 'comments'].includes(kind) ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })) svg.setAttribute(key, value);
  for (const d of paths[kind]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d); svg.append(path);
  }
  return svg;
}

/** The month-nav arrow is an SVG chevron so it centers in the chip regardless of font metrics. */
function chevron(dir) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true' })) svg.setAttribute(key, value);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7');
  svg.append(path);
  return svg;
}
export const monthReview = {
  id: 'month-review', css: CSS,
  match: (route) => route.name === 'dashboard' && isSignedIn(),
  mount() {
    const anchor = document.querySelector('nav.ribbon');
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
    const node = el('section', { class: 'ogt-review', id: 'ogt-month-review', hidden: true, 'aria-label': 'Month in review' });
    anchor.after(node);
    // Hide closes the whole card until next month, whichever month is on screen.
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
      if (earliest !== undefined || earliestFailed) return earliest;
      try {
        earliest = await loadFirstMonth();
      } catch (error) {
        earliestFailed = true;
        if (!destroyed && isSignedIn()) debugError('month review first history failed', error);
      }
      return earliest;
    };
    const navigate = async (delta) => {
      if (busy || !review) return;
      const target = shiftMonth(review.span, delta);
      if (delta > 0 && target.key > lastMonth().key) return;
      if (delta < 0) {
        busy = true; updateNav();
        try { await ensureEarliest(); } finally { if (!destroyed) { busy = false; updateNav(); } }
        if (destroyed) return;
        if (earliest && target.key < earliest.key) return;
      }
      await show(target);
    };
    const render = (data) => {
      review = data;
      const { span } = data;
      prevButton = el('button', { type: 'button', class: 'ogt-review__arrow', 'aria-label': 'Previous month', title: 'Previous month', on: { click: () => navigate(-1) } }, chevron(-1));
      nextButton = el('button', { type: 'button', class: 'ogt-review__arrow', 'aria-label': 'Next month', title: 'Next month', on: { click: () => navigate(1) } }, chevron(1));
      hideButton = el('button', { type: 'button', class: 'ogt-review__hide', text: '× Hide', on: { click: hide } });
      // Hide stays at the top right, but sized to the month-nav chips: fixed to the pair's combined
      // length so its edges line up with the ‹ › pair below - starts on the left chip's edge.
      const top = el('div', { class: 'ogt-review__top' },
        el('h2', {}, 'your ', el('em', { text: span.label.toLocaleLowerCase() }), ' in review'),
        hideButton);
      const nav = el('div', { class: 'ogt-review__nav' }, prevButton, nextButton);
      const inner = el('div', { class: 'ogt-review__inner' });
      const art = data.plays ? fanart(data.first) : null;
      // A fanart that fails to load leaves the plain background instead of a broken-image box.
      const image = art ? el('img', { class: 'ogt-review__art', src: art, alt: '', referrerpolicy: 'no-referrer' }) : null;
      image?.addEventListener('error', () => image.remove(), { once: true });
      inner.append(...(image ? [image] : []), top);
      if (data.plays) {
        const first = data.first;
        const media = first?.show || first?.movie;
        const grid = el('div', { class: 'ogt-review__grid' });
        for (const key of ['plays', 'hours', 'ratings', 'comments']) grid.append(el('div', { class: 'ogt-review__tile' },
          tileIcon(key), el('div', { class: 'ogt-review__value' },
            el('strong', { text: (data[key] || 0).toLocaleString() }), el('span', { text: key }))));
        grid.append(el('div', { class: 'ogt-review__first' }, el('small', {}, 'First play', el('span', {}, 'of ', el('b', { text: span.label }))),
          el('div', {}, el('strong', { class: 'ogt-review__title', text: media?.title || 'Untitled' }),
            first?.episode ? el('span', { class: 'ogt-review__episode' },
              el('b', { text: `${first.episode.season}x${String(first.episode.number).padStart(2, '0')}` }),
              ` “${first.episode.title || 'Untitled episode'}”`) : null)));
        inner.append(grid);
      } else {
        inner.append(el('p', { class: 'ogt-review__empty', text: `No plays in ${span.label} ${span.year}.` }));
      }
      inner.append(el('div', { class: 'ogt-review__bottom' }, el('a', { class: 'ogt-review__link', text: 'Month in Review →',
        href: `https://app.trakt.tv/users/${encodeURIComponent(data.user)}/mir/${span.year}/${span.month}`,
        target: '_blank', rel: 'noopener noreferrer' }), nav));
      node.className = 'ogt-review';
      node.setAttribute('aria-label', `${span.label} ${span.year} in review`);
      node.replaceChildren(inner);
      node.hidden = false;
      updateNav();
    };
    const show = async (span, initial = false) => {
      if (busy) return;
      busy = true; updateNav();
      const epoch = ++token;
      node.setAttribute('aria-busy', 'true');
      try {
        const data = await loadReview(span, new Date(), user);
        if (destroyed || epoch !== token || !isSignedIn()) return;
        if (!data) { node.hidden = true; return; }
        user = data.user;
        if (!data.plays && initial) { node.hidden = true; return; }
        render(data);
      } catch (error) {
        if (destroyed || epoch !== token || !isSignedIn()) return;
        debugError('month review failed', error);
        // A failed step while browsing keeps the month on screen and its arrows usable.
        if (!initial && review) { toast('Could not load that month’s review; try again later.'); return; }
        prevButton = nextButton = hideButton = null;
        node.className = 'ogt-review-hint';
        node.textContent = 'Could not load this month’s review; try again later.';
        node.hidden = false;
      } finally {
        if (epoch === token) {
          busy = false;
          node.removeAttribute('aria-busy');
          updateNav();
        }
      }
    };
    show(lastMonth(), true);
    return { node, destroy() { destroyed = true; token++; node.remove(); } };
  },
};
