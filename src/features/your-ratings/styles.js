export const CSS = String.raw`
/* Follows a season card's "13 episodes" subtitle: " · ♥ 7.5". */
.ogt-your-average { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
  color: light-dark(#075c86, #83d5ff); font-weight: 600; }
.ogt-your-average::before { content: "·"; margin-inline: 5px 2px; color: light-dark(#767676, #a7a7a7); font-weight: 400; }
.ogt-your-average svg { inline-size: 0.95em; block-size: 0.95em; fill: currentColor; }
.ogt-season-chart__legend-community { color: light-dark(#c4161c, #ff6b6b); }
.ogt-season-chart__personal { stroke: light-dark(#075c86, #83d5ff); fill: none; stroke-width: 2; }
.ogt-season-chart__personal-dot { fill: light-dark(#075c86, #83d5ff); stroke: var(--ogt-surface); stroke-width: 1; }
.ogt-season-chart__counts { fill: none; stroke-width: 1.5; }
.ogt-season-chart__watchers { stroke: light-dark(#397a27, #a3d78e); }
.ogt-season-chart__comments { stroke: light-dark(#8250a0, #d7a8f0); stroke-dasharray: 4 3; }
.ogt-season-chart__legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0; font-size: .85rem; }
.ogt-season-chart__legend-personal { color: light-dark(#075c86, #83d5ff); }
.ogt-season-chart a:focus-visible circle { stroke: light-dark(#111, #fff); stroke-width: 3; }
`;
