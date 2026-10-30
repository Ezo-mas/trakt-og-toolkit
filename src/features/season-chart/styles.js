export const CSS = String.raw`
.ogt-season-chart__summary {
  margin: 0 0 8px;
  color: var(--ogt-fg);
}

.ogt-season-chart__svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
  overflow: visible;
}

.ogt-season-chart__gridline {
  stroke: light-dark(#dedede, #484848);
  stroke-width: 1;
}

.ogt-season-chart__axis,
.ogt-season-chart__episode-number {
  fill: light-dark(#767676, #a7a7a7);
  font: 11px system-ui, sans-serif;
}

.ogt-season-chart__episode-number {
  text-anchor: middle;
}

.ogt-season-chart__average {
  stroke: light-dark(#767676, #a7a7a7);
  stroke-dasharray: 5 4;
  stroke-width: 1.5;
}

.ogt-season-chart__bar {
  fill: var(--ogt-bar);
}

.ogt-season-chart__bar--low-votes {
  fill: var(--ogt-surface);
  stroke: var(--ogt-bar);
  stroke-width: 2;
}

.ogt-season-chart__target {
  fill: transparent;
}

.ogt-season-chart a:hover .ogt-season-chart__bar {
  filter: brightness(1.25);
}

.ogt-season-chart__value {
  fill: var(--ogt-fg);
  font: 600 11px system-ui, sans-serif;
  text-anchor: middle;
  /* A halo in the panel colour keeps the label readable over the average line. */
  paint-order: stroke;
  stroke: var(--ogt-surface);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.ogt-season-chart a:focus-visible {
  outline: none;
}

.ogt-season-chart a:focus-visible .ogt-season-chart__bar {
  stroke: light-dark(#111111, #ffffff);
  stroke-width: 2;
}
`;
