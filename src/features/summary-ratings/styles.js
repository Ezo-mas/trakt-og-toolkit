/* Sized to CHART_HEIGHT (104px) in data.js; fits() reserves that plus the 20px gap above. */
export const CSS = String.raw`
.ogt-summary-ratings {
  --ogt-sr-fg: light-dark(#333, #ddd);
  --ogt-sr-muted: light-dark(#767676, #999);
  --ogt-sr-faint: light-dark(#a3a3a3, #777);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 18px 1fr;
  gap: 8px;
  block-size: 104px;
  margin-block-start: 20px;
  max-inline-size: 560px;
  color: var(--ogt-sr-fg);
  font-size: 11px;
  line-height: 1;
}

.ogt-summary-ratings[hidden] {
  display: none;
}

.ogt-summary-ratings *,
.ogt-summary-ratings *::before,
.ogt-summary-ratings *::after {
  box-sizing: inherit;
}

.ogt-sr-head {
  display: inline-flex;
  align-items: baseline;
  justify-self: start;
  gap: 8px;
  color: var(--ogt-sr-fg);
  text-decoration: none;
}

.ogt-sr-head:hover,
.ogt-sr-head:focus,
.ogt-sr-head:focus-visible {
  color: var(--ogt-sr-fg);
  text-decoration: none;
}

.ogt-sr-head:focus-visible {
  outline: 2px solid var(--brand-primary, #ed1c24);
  outline-offset: 3px;
  border-radius: 3px;
}

.ogt-sr-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ogt-sr-meta {
  color: var(--ogt-sr-muted);
  font-size: 12px;
}

.ogt-sr-arrow {
  align-self: center;
  inline-size: 13px;
  block-size: 13px;
  color: var(--ogt-sr-muted);
  transition: transform 120ms ease, color 120ms ease;
}

.ogt-sr-head:hover .ogt-sr-arrow,
.ogt-sr-head:focus-visible .ogt-sr-arrow {
  color: var(--ogt-sr-fg);
  transform: translateX(2px);
}

.ogt-sr-plot {
  position: relative;
  min-block-size: 0;
}

.ogt-sr-bars {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  block-size: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ogt-sr-column {
  display: grid;
  grid-template-rows: 12px 1fr 14px;
  gap: 3px;
  min-inline-size: 0;
  text-align: center;
}

.ogt-sr-count {
  overflow: hidden;
  color: var(--ogt-sr-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ogt-sr-track {
  display: flex;
  align-items: flex-end;
  min-block-size: 0;
  border-block-end: 1px solid light-dark(#d6d6d6, #3a3a3a);
}

.ogt-sr-bar {
  inline-size: 100%;
  block-size: var(--ogt-sr-height);
  border-radius: 3px 3px 0 0;
  background: var(--ogt-sr-color);
}

.ogt-sr-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--ogt-sr-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.ogt-sr-heart {
  inline-size: 10px;
  block-size: 10px;
  color: var(--ogt-sr-color);
}

.ogt-sr-column--top .ogt-sr-count,
.ogt-sr-column--top .ogt-sr-score {
  color: var(--ogt-sr-fg);
  font-weight: 700;
}

/* The average sits across the bar tracks only: below the counts row, above the score row. */
.ogt-sr-average {
  position: absolute;
  inset-block: 15px 17px;
  inset-inline-start: var(--ogt-sr-average);
  border-inline-start: 1px dashed var(--ogt-sr-faint);
  pointer-events: none;
}
`;
