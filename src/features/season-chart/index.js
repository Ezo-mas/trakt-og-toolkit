import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { getClientId } from '../../settings.js';
import { averageRating, chartGeometry, mapApiEpisodes, ratedEpisodes, readSeasonEpisodes } from './data.js';
import { getSeasonEpisodes } from './api.js';
import { CSS } from './styles.js';

const PANEL_ID = 'ogt-season-chart';
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 720;
const MIN_WIDTH = 320;

function svg(tag, attributes = {}, content = '') {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (content) node.textContent = content;
  return node;
}

function formatPercent(value) {
  return `${Number(value.toFixed(1))}%`;
}

function episodeName(episode) {
  return `Episode ${episode.number}: ${episode.title}, ${formatPercent(episode.rating)}`;
}

function voteLabel(votes) {
  return votes == null ? 'votes unknown' : `${new Intl.NumberFormat('en-US').format(votes)} votes`;
}

function summary(episodes, average) {
  const rated = ratedEpisodes(episodes);
  if (!rated.length) return `Season average: ${average == null ? '—' : formatPercent(average)}`;
  const best = rated.reduce((current, episode) => (episode.rating > current.rating ? episode : current));
  const worst = rated.reduce((current, episode) => (episode.rating < current.rating ? episode : current));
  const averageText = average == null ? '—' : formatPercent(average);
  return `Season average: ${averageText} · Best: ${episodeName(best)} · Worst: ${episodeName(worst)}`;
}

function drawChart(chart, episodes, average, targetWidth) {
  const geometry = chartGeometry(episodes, episodes, average, targetWidth);
  const { width, height, plot, ticks, points, averageY } = geometry;
  chart.replaceChildren();
  chart.setAttribute('viewBox', `0 0 ${width} ${height}`);

  for (const tick of ticks) {
    const y = plot.top + ((100 - tick) / (100 - geometry.axisBottom)) * (height - plot.top - plot.bottom);
    chart.append(
      svg('line', {
        class: 'ogt-season-chart__gridline',
        x1: plot.left,
        x2: width - plot.right,
        y1: y,
        y2: y,
      }),
      svg('text', { class: 'ogt-season-chart__axis', x: plot.left - 7, y: y + 4, 'text-anchor': 'end' }, `${tick}%`),
    );
  }

  if (averageY != null) {
    chart.append(
      svg('line', {
        class: 'ogt-season-chart__average',
        x1: plot.left,
        x2: width - plot.right,
        y1: averageY,
        y2: averageY,
      }),
    );
  }

  if (points.length > 1) {
    chart.append(
      svg('polyline', {
        class: 'ogt-season-chart__line',
        points: points.map(({ x, y }) => `${x},${y}`).join(' '),
      }),
    );
  }

  for (const { episode, x, y } of points) {
    const label = `${episodeName(episode)}, ${voteLabel(episode.votes)}`;
    const link = svg('a', { href: episode.href || '#', tabindex: '0', 'aria-label': label });
    const dot = svg('circle', {
      class: `ogt-season-chart__point${episode.votes != null && episode.votes < 10 ? ' ogt-season-chart__point--low-votes' : ''}`,
      cx: x,
      cy: y,
      r: 5,
    });
    link.append(svg('title', {}, label), dot);
    chart.append(link, svg('text', { class: 'ogt-season-chart__episode-number', x, y: height - 7 }, String(episode.number)));
  }
}

function createPanel(episodes) {
  let cancelled = false;
  let currentEpisodes = episodes;
  const headingId = `${PANEL_ID}-title`;
  const summaryLine = el('p', { class: 'ogt-season-chart__summary' });
  const chart = svg('svg', {
    class: 'ogt-season-chart__svg',
    role: 'group',
    'aria-label': 'Episode ratings by episode number',
  });
  // ResizeObserver reports an <svg>'s drawing bounds, not its box, so measure and observe this wrapper instead.
  const plot = el('div', { class: 'ogt-season-chart__plot' }, chart);
  const node = el(
    'section',
    { class: 'ogt-panel ogt-season-chart', id: PANEL_ID, 'aria-labelledby': headingId },
    el('div', { class: 'ogt-head' }, el('h2', { class: 'ogt-title', id: headingId, text: 'Episode ratings' })),
    summaryLine,
    plot,
  );

  function render(nextEpisodes) {
    if (cancelled) return;
    currentEpisodes = nextEpisodes;
    const rated = ratedEpisodes(currentEpisodes);
    const average = averageRating(currentEpisodes);
    node.hidden = rated.length < 2;
    summaryLine.textContent = summary(currentEpisodes, average);
    drawChart(chart, currentEpisodes, average, chartWidth());
  }

  // Draw at the panel's real width so the chart fills it without scaling text and dots up.
  let drawnWidth = 0;
  function chartWidth() {
    drawnWidth = Math.max(MIN_WIDTH, Math.round(plot.getBoundingClientRect().width) || DEFAULT_WIDTH);
    return drawnWidth;
  }
  const resize = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
      if (cancelled || node.hidden) return;
      if (Math.abs(Math.round(plot.getBoundingClientRect().width) - drawnWidth) > 1) render(currentEpisodes);
    })
    : null;
  resize?.observe(plot);

  render(currentEpisodes);

  return {
    node,
    render,
    destroy() {
      cancelled = true;
      resize?.disconnect();
      node.remove();
    },
  };
}

export const seasonChart = {
  id: 'season-chart',
  css: CSS,
  match(route) {
    return route.kind === 'show' && route.name === 'season';
  },
  mount(route) {
    if (document.getElementById(PANEL_ID)) return null;
    const episodesSection = document.querySelector('section.episodes');
    if (!episodesSection) return null;

    const fallback = readSeasonEpisodes(document);
    const panel = createPanel(fallback);
    episodesSection.parentElement.insertBefore(panel.node, episodesSection);

    if (getClientId()) {
      getSeasonEpisodes(route.id, route.season)
        .then((episodes) => {
          if (episodes.length) {
            panel.render(mapApiEpisodes(episodes, {
              showId: route.id,
              season: route.season,
              fallback,
            }));
          }
        })
        .catch((error) => {
          if (!panel.node.isConnected) return;
          debugError('season episode lookup failed', error);
        });
    }

    return {
      node: panel.node,
      destroy() {
        panel.destroy();
      },
    };
  },
};
