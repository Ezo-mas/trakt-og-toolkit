import { el } from '../../core/dom.js';

/**
 * A rating badge in the top-left corner of a poster, matching OG's CornerRating geometry.
 * Returns a div with position: absolute that overlays its container.
 */
export function cornerRating(rating, label = `Your rating: ${rating}`) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) return null;
  const corner = el('div', {
    class: 'ogt-corner-rating',
    role: 'img',
    'aria-label': label,
    style: `--rating-color: var(--rating-${rating})`,
  });
  const text = el('span', { class: 'ogt-corner-rating-text', 'aria-hidden': 'true' }, String(rating));
  corner.appendChild(text);
  return corner;
}

export const cornerRatingStyles = `
:root {
  --rating-1: #616161;
  --rating-2: #675b5b;
  --rating-3: #705252;
  --rating-4: #7a4747;
  --rating-5: #863c3c;
  --rating-6: #922f30;
  --rating-7: #9e2424;
  --rating-8: #a81918;
  --rating-9: #b11010;
  --rating-10: #b70a0a;
}

.ogt-corner-rating {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  width: 30px;
  height: 30px;
  background-color: var(--rating-color);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  pointer-events: none;
}

/* OG's geometry: a 15 by 30 box, 7px in, text on its top 12px, turned 45 degrees. */
.ogt-corner-rating-text {
  position: absolute;
  top: 0;
  left: 7px;
  width: 15px;
  height: 30px;
  color: var(--color-card-text, #fff);
  font-family: var(--font-headings, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif);
  font-weight: var(--font-weight-headings-heavy, 700);
  font-size: var(--font-size-card-subtitle, 11px);
  line-height: 12px;
  text-align: center;
  rotate: 45deg;
}
`;
