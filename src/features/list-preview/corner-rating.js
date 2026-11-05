import { el } from '../../core/dom.js';

/**
 * Your rating as a coloured triangle in a poster's top-right corner, matching og's `CornerRating`.
 * Colours are og's own `--rating-N` tokens.
 */
export function cornerRating(rating, label = `Your rating: ${rating}`) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) return null;
  return el('div', { class: 'ogt-corner-rating', role: 'img', 'aria-label': label, style: `--ogt-rating-color: var(--rating-${rating})` },
    el('span', { class: 'ogt-corner-rating-text', 'aria-hidden': 'true' }, String(rating)));
}

/*
 * A fan slot is a sliver showing the left edge of a full-width poster, so the corner sits at the poster's own
 * right edge (og's `--poster-width`) and shows when that poster opens up. In og's narrow layout the slots hold
 * whole posters side by side, so it sits at the slot's edge.
 */
export const cornerRatingStyles = `
.ogt-corner-rating {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(var(--poster-width, 100%) - 30px);
  z-index: 10;
  inline-size: 30px;
  block-size: 30px;
  background-color: var(--ogt-rating-color);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  pointer-events: none;
}
@container (width < 520px) {
  .list-row .ogt-corner-rating { inset-inline-start: auto; inset-inline-end: 0; }
}
/* og's geometry: a 15 by 30 box, 7px in, text on its top 12px, turned 45 degrees. */
.ogt-corner-rating-text {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 7px;
  inline-size: 15px;
  block-size: 30px;
  color: var(--color-card-text, #fff);
  font-family: var(--font-headings, sans-serif);
  font-weight: var(--font-weight-headings-heavy, 700);
  font-size: var(--font-size-card-subtitle, 11px);
  line-height: 12px;
  text-align: center;
  rotate: 45deg;
}
`;
