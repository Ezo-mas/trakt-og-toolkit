import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { isSignedIn } from '../../core/trakt.js';
import { STORAGE, setPrivateValue } from '../../core/store.js';
import { loadReview } from './api.js';
import { fanart } from './data.js';
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
export const monthReview = {
  id: 'month-review', css: CSS,
  match: (route) => route.name === 'dashboard' && isSignedIn(),
  mount() {
    const anchor = document.querySelector('nav.ribbon');
    if (!anchor) return null;
    let destroyed = false;
    const node = el('section', { class: 'ogt-review', id: 'ogt-month-review', hidden: true, 'aria-label': 'Last month in review' });
    anchor.after(node);
    const hide = () => { if (review) setPrivateValue(STORAGE.dismissedReview(review.user), review.span.key); node.hidden = true; };
    let review;
    loadReview().then((data) => {
      if (destroyed || !isSignedIn() || !data?.plays) return;
      review = data;
      const { span, first } = data;
      const media = first.show || first.movie;
      const art = fanart(first);
      const grid = el('div', { class: 'ogt-review__grid' });
      for (const key of ['plays', 'hours', 'ratings', 'comments']) grid.append(el('div', { class: 'ogt-review__tile' },
        tileIcon(key), el('div', { class: 'ogt-review__value' },
          el('strong', { text: data[key].toLocaleString() }), el('span', { text: key }))));
      grid.append(el('div', { class: 'ogt-review__first' }, el('small', {}, 'First play', el('span', { text: `of ${span.label}` })),
        el('div', {}, el('strong', { text: media?.title || 'Untitled' }),
          first.episode ? el('span', { class: 'ogt-review__episode', text: `${first.episode.season}x${String(first.episode.number).padStart(2, '0')} “${first.episode.title || 'Untitled episode'}”` }) : null)));
      node.append(...(art ? [el('img', { class: 'ogt-review__art', src: art, alt: '', referrerpolicy: 'no-referrer' })] : []),
        el('button', { type: 'button', class: 'ogt-review__hide', text: '× Hide', on: { click: hide } }),
        el('div', { class: 'ogt-review__inner' }, el('h2', {}, 'your ', el('em', { text: span.label.toLocaleLowerCase() }), ' in review'), grid,
          el('a', { class: 'ogt-review__link', text: 'Month in Review →', href: `https://app.trakt.tv/users/${encodeURIComponent(data.user)}/mir/${span.year}/${span.month}`, target: '_blank', rel: 'noopener noreferrer' })));
      node.hidden = false;
    }).catch((error) => {
      if (destroyed || !isSignedIn()) return;
      debugError('month review failed', error);
      node.className = 'ogt-review-hint'; node.textContent = 'Could not load last month’s review; try again later.'; node.hidden = false;
    });
    return { node, destroy() { destroyed = true; node.querySelector('button')?.removeEventListener('click', hide); node.remove(); } };
  },
};
