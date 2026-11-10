export const CSS = String.raw`
.ogt-watchlist-pick { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-stat, 6px) 10px; min-inline-size: 0; }
.ogt-watchlist-pick [hidden] { display: none !important; }
.ogt-watchlist-pick__button {
  display: inline-flex; align-items: center; justify-content: center; block-size: var(--control-height, 36px);
  padding: 0 var(--button-padding-inline, 12px); border: 1px solid light-dark(#d4d4d4, #3b3b3b);
  border-radius: var(--radius-control, 6px); background: light-dark(#f2f2f2, #232323);
  color: light-dark(#333, #e6e6e6); font: inherit; font-size: var(--font-size-button-secondary, 13px);
  white-space: nowrap; cursor: pointer;
}
.ogt-watchlist-pick__button:is(:hover, :focus-visible):not(:disabled) {
  border-color: var(--brand-primary, #ed1c24); color: light-dark(#111, #fff);
}
.ogt-watchlist-pick__button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.ogt-watchlist-pick__button:disabled { opacity: .6; cursor: default; }
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
