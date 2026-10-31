import { linePath } from '../your-ratings/data.js';
const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}
/** Overlay shares the chart's episode slots and ratings scale; counts have their own right axis. */
export function drawExtras(chart, episodes, geometry, personal, stats) {
  const { plot, width, height, slot, axisBottom } = geometry;
  const first = Math.min(...episodes.map((e) => e.number));
  const x = (number) => plot.left + (number - first + .5) * slot;
  const y = (rating) => plot.top + (100 - rating) / (100 - axisBottom) * (height - plot.top - plot.bottom);
  const points = episodes.filter((e) => personal.some((p) => p.number === e.number))
    .map((e) => ({ ...e, x: x(e.number), y: y(personal.find((p) => p.number === e.number).rating * 10) }));
  chart.append(svg('path', { class: 'ogt-season-chart__personal', d: linePath(points) }));
  for (const point of points) {
    const label = `Your rating, Episode ${point.number}: ${personal.find((p) => p.number === point.number).rating} of 10`;
    const link = svg('a', { href: point.href, tabindex: '0', 'aria-label': label });
    link.append(svg('title', {}, label), svg('circle', { class: 'ogt-season-chart__personal-dot', cx: point.x, cy: point.y, r: 4 }));
    chart.append(link);
  }
  if (!stats) return;
  const max = Math.max(1, ...stats.flatMap((s) => [s.watchers, s.comments]));
  const countY = (count) => plot.top + (1 - count / max) * (height - plot.top - plot.bottom);
  for (const count of [0, Math.round(max / 2), max]) {
    chart.append(svg('text', { class: 'ogt-season-chart__axis', x: width - plot.right + 5, y: countY(count) + 4 }, String(count)));
  }
  for (const key of ['watchers', 'comments']) {
    const series = stats.map((s) => ({ number: s.number, x: x(s.number), y: countY(s[key]) }));
    chart.append(svg('path', { class: `ogt-season-chart__counts ogt-season-chart__${key}`, d: linePath(series) }));
    for (const point of series) {
      const label = `Episode ${point.number}: ${stats.find((s) => s.number === point.number)[key]} ${key}`;
      const dot = svg('circle', { class: `ogt-season-chart__counts ogt-season-chart__${key}`, cx: point.x, cy: point.y, r: 3, tabindex: '0', role: 'img', 'aria-label': label });
      dot.append(svg('title', {}, label)); chart.append(dot);
    }
  }
}
