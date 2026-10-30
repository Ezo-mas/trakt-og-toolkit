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

.ogt-season-chart__line {
  fill: none;
  stroke: var(--brand-primary, #ed1c24);
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-width: 2.5;
}

.ogt-season-chart__point {
  fill: var(--brand-primary, #ed1c24);
  stroke: var(--brand-primary, #ed1c24);
  stroke-width: 2;
}

.ogt-season-chart__point--low-votes {
  fill: var(--ogt-surface);
}

.ogt-season-chart a:focus-visible {
  outline: none;
}

.ogt-season-chart a:focus-visible .ogt-season-chart__point {
  stroke: light-dark(#111111, #ffffff);
  stroke-width: 4;
}
`;
