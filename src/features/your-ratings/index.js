import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { ratingsApi } from './api.js';
import { averageLabel, forShow, personalAverage } from './data.js';
import { CSS } from './styles.js';

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z';

function heart() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', HEART);
  svg.append(path);
  return svg;
}

export const yourRatings = {
  id: 'your-ratings', css: CSS,
  match: (route) => route.kind === 'show' && ['title', 'seasons'].includes(route.name) && isSignedIn(),
  mount(route) {
    const section = document.querySelector('section.seasons');
    if (!section || document.getElementById('ogt-your-ratings')) return null;
    // Invisible marker: lets the host notice when og re-renders the section away.
    const node = el('span', { id: 'ogt-your-ratings', hidden: true });
    section.prepend(node);
    let cancelled = false;
    let items = [];
    const badges = new Set();
    function render() {
      if (cancelled) return;
      for (const card of section.querySelectorAll('article.poster-card')) {
        if (card.querySelector('.ogt-your-average')) continue;
        const href = card.querySelector('a[href*="/seasons/"]')?.getAttribute('href');
        const match = href?.match(/\/seasons\/(\d+)\/?$/);
        if (!match) continue;
        const rows = items.filter((item) => item.season === Number(match[1]));
        const average = personalAverage(rows);
        if (average == null) continue;
        const label = averageLabel(rows);
        const badge = el('span', { class: 'ogt-your-average', title: label, 'aria-label': label },
          heart(), el('span', { text: average.toFixed(1) }));
        // og's quick-icons strip is fixed-width and clips overflow; the subtitle ("13 episodes") has room.
        (card.querySelector('.titles-link .subtitle') || card).append(badge);
        badges.add(badge);
      }
    }
    const observer = new MutationObserver(render);
    observer.observe(section, { childList: true, subtree: true });
    ratingsApi.load().then((rows) => { items = forShow(rows, route.id); render(); })
      .catch((error) => debugError('personal ratings lookup failed', error));
    function onAuth() { cancelled = true; observer.disconnect(); node.remove(); for (const badge of badges) badge.remove(); }
    document.addEventListener('ogt:authchange', onAuth);
    return { node, destroy() { onAuth(); document.removeEventListener('ogt:authchange', onAuth); } };
  },
};
