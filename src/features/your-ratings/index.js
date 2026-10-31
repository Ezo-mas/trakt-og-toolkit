import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { ratingsApi } from './api.js';
import { averageLabel, forShow } from './data.js';
import { CSS } from './styles.js';

export const yourRatings = {
  id: 'your-ratings', css: CSS,
  match: (route) => route.kind === 'show' && ['title', 'seasons'].includes(route.name) && isSignedIn(),
  mount(route) {
    const section = document.querySelector('section.seasons');
    if (!section || document.getElementById('ogt-your-ratings')) return null;
    const node = el('p', { id: 'ogt-your-ratings', class: 'ogt-your-average', hidden: true });
    section.prepend(node);
    let cancelled = false;
    let items = [];
    const badges = new Set();
    function render() {
      if (cancelled) return;
      const label = averageLabel(items);
      if (node.textContent !== label) node.textContent = label;
      if (node.hidden !== !label) node.hidden = !label;
      for (const card of section.querySelectorAll('article.poster-card')) {
        if (card.querySelector('.ogt-your-average')) continue;
        const href = card.querySelector('a[href*="/seasons/"]')?.getAttribute('href');
        const match = href?.match(/\/seasons\/(\d+)\/?$/);
        if (!match) continue;
        const rows = items.filter((item) => item.season === Number(match[1]));
        const text = averageLabel(rows);
        if (!text) continue;
        const badge = el('span', { class: 'ogt-your-average', text });
        (card.querySelector('.quick-icons') || card).append(badge);
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
