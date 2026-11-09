import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { getClientId } from '../../settings.js';
import { getSummaryRatings } from './api.js';
import {
  BAR_COLORS,
  RATING_NAMES,
  averagePosition,
  barHeights,
  chartLabel,
  fits,
  fullCount,
  mostGiven,
  ratingsPath,
  shortCount,
  statsHref,
} from './data.js';
import { CSS } from './styles.js';

const NODE_ID = 'ogt-summary-ratings';
const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z';
const ARROW = 'M5 12h14M13 6l6 6-6 6';

function icon(d, className, { stroke = false } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  if (stroke) {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  } else {
    path.setAttribute('fill', 'currentColor');
  }
  svg.append(path);
  return svg;
}

/** The chart itself: a header link to og's stats page, then ten bars with counts above and scores below. */
export function renderChart(ratings, href) {
  const top = mostGiven(ratings.counts);
  const heights = barHeights(ratings.counts);

  const columns = ratings.counts.map((count, index) => {
    const score = index + 1;
    return el(
      'li',
      {
        class: `ogt-sr-column${score === top ? ' ogt-sr-column--top' : ''}`,
        style: `--ogt-sr-height:${(heights[index] * 100).toFixed(1)}%;--ogt-sr-color:${BAR_COLORS[index]}`,
      },
      el('span', { class: 'ogt-sr-count', 'aria-hidden': 'true', text: shortCount(count) }),
      el('span', { class: 'ogt-sr-track', 'aria-hidden': 'true' }, el('span', { class: 'ogt-sr-bar' })),
      el('span', { class: 'ogt-sr-score', 'aria-hidden': 'true' }, icon(HEART, 'ogt-sr-heart'), String(score)),
      el('span', {
        class: 'ogt-visually-hidden',
        text: `${score}, ${RATING_NAMES[index]}: ${fullCount(count)} ${count === 1 ? 'vote' : 'votes'}`,
      }),
    );
  });

  return [
    el(
      'a',
      { class: 'ogt-sr-head', href, 'aria-label': chartLabel(ratings) },
      el('span', { class: 'ogt-sr-title', text: 'Trakt ratings' }),
      el('span', { class: 'ogt-sr-meta', text: `${ratings.rating.toFixed(2)} average · ${fullCount(ratings.votes)} votes` }),
      icon(ARROW, 'ogt-sr-arrow', { stroke: true }),
    ),
    el(
      'div',
      { class: 'ogt-sr-plot' },
      el('ol', { class: 'ogt-sr-bars', 'aria-label': 'Votes for each score' }, columns),
      el('span', {
        class: 'ogt-sr-average',
        'aria-hidden': 'true',
        style: `--ogt-sr-average:${(averagePosition(ratings.rating) * 100).toFixed(2)}%`,
      }),
    ),
  ];
}

/**
 * Where a column's own content ends: its lowest visible child, skipping our chart. Both columns are grid items
 * stretched to the row's height, so their boxes say nothing about the empty space; their children do.
 */
function contentBottom(column, skip = null) {
  let bottom = column.getBoundingClientRect().top + window.scrollY;
  for (const child of column.children) {
    if (child === skip) continue;
    const rect = child.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    bottom = Math.max(bottom, rect.bottom + window.scrollY);
  }
  return bottom;
}

export const summaryRatings = {
  id: 'summary-ratings',
  css: CSS,
  match(route) {
    return Boolean(ratingsPath(route)) && Boolean(getClientId());
  },
  mount(route) {
    if (document.getElementById(NODE_ID)) return null;
    const top = document.querySelector('.summary-frame #overview .top') || document.querySelector('#overview .top');
    const details = top?.querySelector(':scope > .details');
    const actions = top?.querySelector(':scope > .actions');
    if (!details || !actions) return null;

    const node = el('section', { id: NODE_ID, class: 'ogt-summary-ratings', hidden: true, 'aria-label': 'Trakt ratings' });
    details.append(node);

    let cancelled = false;
    let ready = false;
    let timer = 0;

    /** Show the chart only while it fits beside the action stack; og's row height then never changes. */
    function fit() {
      timer = 0;
      if (cancelled || !ready) return;
      const show = fits({ contentBottom: contentBottom(details, node), columnBottom: contentBottom(actions) });
      if (node.hidden === show) node.hidden = !show;
    }
    // A timer rather than requestAnimationFrame: background tabs barely run frames, and the check only reads layout.
    function scheduleFit() {
      if (cancelled || timer) return;
      timer = setTimeout(fit, 0);
    }

    // The action stack grows when toolkit and og buttons arrive, and the overview grows on "Read more".
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleFit) : null;
    resize?.observe(actions);
    resize?.observe(details);
    for (const child of details.children) if (child !== node) resize?.observe(child);
    const mutation = new MutationObserver(scheduleFit);
    mutation.observe(top, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', scheduleFit);

    getSummaryRatings(route)
      .then((ratings) => {
        if (cancelled || !ratings) return;
        node.replaceChildren(...renderChart(ratings, statsHref(route)));
        ready = true;
        fit();
      })
      .catch((error) => { if (!cancelled) debugError('summary ratings lookup failed', error); });

    return {
      node,
      destroy() {
        cancelled = true;
        clearTimeout(timer);
        resize?.disconnect();
        mutation.disconnect();
        window.removeEventListener('resize', scheduleFit);
        node.remove();
      },
    };
  },
};
