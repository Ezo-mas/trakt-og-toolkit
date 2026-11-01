export function watchlistIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 28', fill: 'none', stroke: 'currentColor', 'stroke-width': '1', 'aria-hidden': 'true' })) {
    svg.setAttribute(name, value);
  }
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M5 2h14v24l-7-5-7 5Z');
  svg.append(path);
  return svg;
}
