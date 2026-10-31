import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { getClientId } from '../../settings.js';
import {
  averageRating,
  barPath,
  chartGeometry,
  mapApiEpisodes,
  ratedEpisodes,
  ratingLevel,
  readSeasonEpisodes,
} from './data.js';
import { isSignedIn } from '../../core/trakt.js';
import { ratingsApi } from '../your-ratings/api.js';
import { averageLabel, forShow, mapStats } from '../your-ratings/data.js';
import { drawExtras } from './extra.js';
import { getEpisodeStats, getSeasonEpisodes } from './api.js';
import { CSS } from './styles.js';

const PANEL_ID = 'ogt-season-chart';
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 720;
const MIN_WIDTH = 320;
const MAX_BAR = 24;

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

function drawChart(chart, episodes, average, targetWidth, personal = [], stats = null) {
  const scale = [...episodes, ...personal.map((p) => ({ ...p, rating: p.rating * 10 }))];
  const geometry = chartGeometry(episodes, episodes, average, targetWidth, scale, stats ? 64 : 12);
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

  const barWidth = Math.min(MAX_BAR, geometry.slot * 0.6);
  const rated = points.map(({ episode }) => episode.rating);
  const best = Math.max(...rated);
  const worst = Math.min(...rated);
  let bestLabelled = false;
  let worstLabelled = false;
  const values = [];

  for (const { episode, x, y } of points) {
    const label = `${episodeName(episode)}, ${voteLabel(episode.votes)}`;
    const lowVotes = episode.votes != null && episode.votes < 10;
    const link = svg('a', { href: episode.href || '#', tabindex: '0', 'aria-label': label });
    const bar = svg('path', {
      class: `ogt-season-chart__bar${lowVotes ? ' ogt-season-chart__bar--low-votes' : ''}`,
      d: barPath(x, y, barWidth, geometry.baseY),
      style: `--ogt-bar: var(--rating-${ratingLevel(episode.rating)}, var(--brand-primary, #ed1c24))`,
    });
    // A transparent full-height target, so short bars are as easy to hover and click as tall ones.
    const target = svg('rect', {
      class: 'ogt-season-chart__target',
      x: x - geometry.slot / 2,
      y: plot.top,
      width: geometry.slot,
      height: geometry.baseY - plot.top,
    });
    link.append(svg('title', {}, label), target, bar);
    chart.append(link, svg('text', { class: 'ogt-season-chart__episode-number', x, y: height - 7 }, String(episode.number)));

    // Direct labels on the best and worst episode only; the rest are in the tooltips and the summary line.
    const isBest = episode.rating === best && !bestLabelled && best !== worst;
    const isWorst = episode.rating === worst && !worstLabelled && best !== worst;
    if (isBest || isWorst) {
      if (isBest) bestLabelled = true;
      else worstLabelled = true;
      values.push(svg('text', { class: 'ogt-season-chart__value', x, y: y - 6 }, formatPercent(episode.rating)));
    }
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
  // Labels last, so they sit above the average line.
  chart.append(...values);
  drawExtras(chart, episodes, geometry, personal, stats);
}

function createPanel(episodes, route) {
  let personal = [];
  let stats = null;
  let moreOpen = false;
  let statsFlight = false;
  let authRevision = 0;
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

  const legend = el('div', { class: 'ogt-season-chart__legend', hidden: true });
  const more = el('button', { class: 'ogt-chip', type: 'button', text: 'More', 'aria-expanded': 'false' });
  const hint = el('span', { class: 'ogt-hint', role: 'status' });
  node.append(legend, el('div', { class: 'ogt-row' }, more, hint));
  async function toggleMore() {
    moreOpen = !moreOpen;
    more.setAttribute('aria-expanded', String(moreOpen));
    more.textContent = moreOpen ? 'Less' : 'More';
    hint.hidden = !moreOpen;
    render(currentEpisodes);
    if (!moreOpen || stats || statsFlight) return;
    if (currentEpisodes.length > 30) { hint.textContent = 'Episode statistics skipped for seasons over 30 episodes.'; return; }
    if (!getClientId()) { hint.textContent = 'Set a Trakt client ID to load episode statistics.'; return; }
    statsFlight = true;
    hint.textContent = 'Loading episode statistics…';
    try {
      const result = await Promise.all(currentEpisodes.map(async (episode) => ({
        number: episode.number, ...mapStats(await getEpisodeStats(route.id, route.season, episode.number)),
      })));
      if (cancelled) return;
      stats = result; hint.textContent = ''; render(currentEpisodes);
    } catch (error) {
      if (!cancelled) { hint.textContent = 'Episode statistics unavailable.'; debugError('episode statistics failed', error); }
    } finally { statsFlight = false; }
  }
  more.addEventListener('click', toggleMore);
  async function loadPersonal() {
    const revision = ++authRevision;
    personal = [];
    render(currentEpisodes);
    if (!isSignedIn()) return;
    try {
      const rows = await ratingsApi.load();
      if (cancelled || revision !== authRevision) return;
      personal = forShow(rows, route.id).filter((item) => item.season === route.season);
      render(currentEpisodes);
    } catch (error) { if (!cancelled) debugError('personal season ratings failed', error); }
  }
  document.addEventListener('ogt:authchange', loadPersonal);

  function render(nextEpisodes) {
    if (cancelled) return;
    currentEpisodes = nextEpisodes;
    const rated = ratedEpisodes(currentEpisodes);
    const average = averageRating(currentEpisodes);
    node.hidden = rated.length < 2 && personal.length < 2;
    const visiblePersonal = personal.filter((p) => currentEpisodes.some((e) => e.number === p.number));
    summaryLine.textContent = [summary(currentEpisodes, average), averageLabel(visiblePersonal, currentEpisodes.length)].filter(Boolean).join(' · ');
    legend.replaceChildren(el('span', { text: 'Trakt community (bars)' }));
    if (visiblePersonal.length) legend.append(el('span', { class: 'ogt-season-chart__legend-personal', text: 'Your ratings (blue line)' }));
    if (moreOpen && stats) legend.append(el('span', { text: 'Watchers (green) · Comments (purple dashed) · Counts: right axis' }));
    legend.hidden = !visiblePersonal.length && !(moreOpen && stats);
    drawChart(chart, currentEpisodes, average, chartWidth(), visiblePersonal, moreOpen ? stats : null);
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
  loadPersonal();

  return {
    node,
    render,
    destroy() {
      cancelled = true;
      resize?.disconnect();
      authRevision++;
      document.removeEventListener('ogt:authchange', loadPersonal);
      more.removeEventListener('click', toggleMore);
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
    const panel = createPanel(fallback, route);
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
