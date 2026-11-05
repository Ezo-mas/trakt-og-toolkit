import { readCardRoute } from './data.js';
import { createWatchlistShortcuts } from './shortcuts.js';

const CARD = '.poster-card, .fanart-card';
const CONTROL = '.quick-icons .list-control.card, .quick-icons button.action.list';

export const watchlistCards = createWatchlistShortcuts({
  id: 'watchlist-cards',
  markerId: 'ogt-watchlist-cards',
  className: 'ogt-watchlist-card',
  logLabel: 'card',
  match: () => true,
  targets: () => [...document.querySelectorAll(CONTROL)].map(control => ({ control, host: control.closest(CARD) })),
  readRoute: readCardRoute,
  css: `
    .ogt-watchlist-card { display: grid; place-items: center; flex: 0 0 auto;
      inline-size: var(--action-width, 32px); block-size: var(--bar, 40px); min-block-size: 0;
      padding: 0; border: 0; border-radius: 0; background: none;
      color: var(--brand-fifth, #2b678f); cursor: pointer; }
    .ogt-watchlist-card[hidden] { display: none !important; }
    /* On a 1x desktop display, this is the troublesome 150–170% page-zoom band.
       Resolution includes display scaling; it is not a universal browser zoom API. */
    @media (1.5dppx <= resolution < 1.8dppx) {
      .poster-card .ogt-watchlist-card { display: none !important; }
    }
    .ogt-watchlist-card svg { width: 20px; height: 24px; stroke-linejoin: round; }
    .quick-icons.small .ogt-watchlist-card { block-size: calc(var(--bar, 35px) - 1px); }
    .quick-icons.small .ogt-watchlist-card svg { width: 16px; height: 20px; }
    .ogt-watchlist-card:is(:hover, :focus-visible):not(:disabled) {
      background: var(--brand-fifth, #2b678f); color: var(--color-card-text, white); }
    .ogt-watchlist-card:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
    .ogt-watchlist-card:disabled { opacity: .6; cursor: default; }
  `,
});
