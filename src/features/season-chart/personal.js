import { linePath } from '../your-ratings/data.js';

const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attributes, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

/** Overlay the viewer's ratings on the community chart's episode slots and 0–100 scale. */
export function drawPersonal(chart, episodes, geometry, personal) {
  const { plot, height, slot, axisBottom } = geometry;
  const first = Math.min(...episodes.map((episode) => episode.number));
  const x = (number) => plot.left + (number - first + 0.5) * slot;
  const y = (rating) => plot.top + ((100 - rating) / (100 - axisBottom)) * (height - plot.top - plot.bottom);
  const points = episodes
    .filter((episode) => personal.some((rating) => rating.number === episode.number))
    .map((episode) => ({
      ...episode,
      x: x(episode.number),
      y: y(personal.find((rating) => rating.number === episode.number).rating * 10),
    }));

  chart.append(svg('path', { class: 'ogt-season-chart__personal', d: linePath(points) }));
  for (const point of points) {
    const rating = personal.find((entry) => entry.number === point.number).rating;
    const label = `Your rating, Episode ${point.number}: ${rating} of 10`;
    const link = svg('a', { href: point.href, tabindex: '0', 'aria-label': label });
    link.append(
      svg('title', {}, label),
      svg('circle', { class: 'ogt-season-chart__personal-dot', cx: point.x, cy: point.y, r: 4 }),
    );
    chart.append(link);
  }
}
