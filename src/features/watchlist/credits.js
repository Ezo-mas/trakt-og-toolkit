import { readCreditControl, readCreditRoute } from './data.js';
import { createWatchlistShortcuts } from './shortcuts.js';

/** Feature 13's card shortcut for person credit rows, which reuse og's card-sized list control. */
export const watchlistCredits = createWatchlistShortcuts({
  id: 'watchlist-credits',
  markerId: 'ogt-watchlist-credits',
  className: 'ogt-watchlist-credit',
  logLabel: 'credit',
  match: route => route?.name === 'person',
  targets: () => [...document.querySelectorAll('article.credit-row')].map(host => ({ host, control: readCreditControl(host) })),
  readRoute: readCreditRoute,
  css: `
    .ogt-watchlist-credit { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 32px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-credit[hidden] { display: none !important; }
    .ogt-watchlist-credit svg { width: 16px; height: 20px; stroke-linejoin: round; }
    .ogt-watchlist-credit:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-credit:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-credit:disabled { opacity: .6; cursor: default; }
  `,
});
