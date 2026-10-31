import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { isSignedIn } from '../../core/trakt.js';
import { STORAGE, setPrivateValue } from '../../core/store.js';
import { loadReview } from './api.js';
import { fanart } from './data.js';
import { CSS } from './styles.js';
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
        el('strong', { text: data[key].toLocaleString() }), el('span', { text: key })));
      grid.append(el('div', { class: 'ogt-review__first' }, el('small', { text: `First play of ${span.label}` }),
        el('div', {}, el('strong', { text: media?.title || 'Untitled' }),
          first.episode ? `${first.episode.season}×${String(first.episode.number).padStart(2, '0')} “${first.episode.title || 'Untitled episode'}”` : '')));
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
