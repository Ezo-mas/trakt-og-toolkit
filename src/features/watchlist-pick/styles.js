import { titleBarButtonCss } from '../../ui/title-bar.js';

export const CSS = String.raw`
.ogt-watchlist-pick { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-stat, 6px) 10px; min-inline-size: 0; }
.ogt-watchlist-pick [hidden] { display: none !important; }
${titleBarButtonCss('ogt-watchlist-pick__button')}
.ogt-watchlist-pick__result {
  max-inline-size: 24ch; overflow: hidden; color: var(--color-text, light-dark(#222, #eee));
  font-family: var(--font-headings, inherit); font-size: var(--font-size-list-row-meta, 14px);
  text-decoration: none; text-overflow: ellipsis; white-space: nowrap;
}
.ogt-watchlist-pick__result:is(:hover, :focus-visible) { color: var(--color-link-hover, var(--brand-primary, #ed1c24)); text-decoration: underline; }
.ogt-watchlist-pick__result:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.ogt-watchlist-pick__status { margin: 0; color: var(--color-stat-noun, light-dark(#767676, #9a9a9a)); font-size: 12px; line-height: 1.4; }
.ogt-watchlist-pick__status:empty { display: none; }
`;
