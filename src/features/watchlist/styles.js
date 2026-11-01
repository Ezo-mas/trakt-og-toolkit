import { actionButtonCss } from '../../ui/action-button.js';

export const css = actionButtonCss('ogt-watchlist', 'var(--brand-secondary, light-dark(#2474ae, #59a9e2))') + `
  .ogt-watchlist-toasts {
    inset-block-start: calc(var(--header-height, 70px) + var(--toast-offset, 12px) + var(--ogt-native-toast-height, 0px));
    inset-block-end: auto; inset-inline-start: auto; inset-inline-end: var(--toast-offset, 12px);
    z-index: var(--z-toast, 30); inline-size: min(var(--toast-width, 360px), calc(100vw - 2 * var(--toast-offset, 12px)));
    display: flex; flex-direction: column; justify-content: normal; gap: var(--toast-gap, 8px);
  }
  .ogt-watchlist-toast {
    position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center;
    gap: var(--toast-icon-gap, 10px); padding: var(--toast-padding, 11px 8px 11px 14px); overflow: hidden;
    border: 1px solid var(--color-toast-border, #ffffff20); border-radius: var(--radius-toast, 12px);
    background: var(--color-toast-bg, #171717ed); color: var(--color-toast-text, white);
    box-shadow: var(--shadow-toast, 0 12px 32px #0007); backdrop-filter: var(--blur-toast, blur(16px));
    font: var(--font-size-toast, 14px)/1.4 var(--font-body, system-ui); pointer-events: auto;
  }
  .ogt-watchlist-toast__icon { display: flex; color: var(--color-toast-success, #6cc96c); }
  .ogt-watchlist-toast__icon svg { inline-size: var(--font-size-toast-icon, 18px); block-size: var(--font-size-toast-icon, 18px); }
  .ogt-watchlist-toast__message { margin: 0; overflow-wrap: anywhere; }
  .ogt-watchlist-toast__close {
    display: grid; place-items: center; min-block-size: 0; padding: 0; border: 0;
    inline-size: var(--toast-close-size, 28px); block-size: var(--toast-close-size, 28px);
    border-radius: var(--radius-toast-close, 4px); background: none; color: var(--color-toast-close, #bbb); cursor: pointer;
  }
  .ogt-watchlist-toast__close svg { inline-size: var(--font-size-toast-close, 14px); block-size: var(--font-size-toast-close, 14px); }
  .ogt-watchlist-toast__close:is(:hover, :focus-visible) { background: var(--color-toast-close-hover, #ffffff15); color: var(--color-toast-text, white); }
  .ogt-watchlist-toast__close:focus-visible { outline: 2px solid currentColor; }
  .ogt-watchlist-toast__timer { position: absolute; inset: auto 0 0; block-size: var(--toast-timer-height, 2px);
    background: var(--color-toast-success, #6cc96c); transform-origin: left; }
  @media (prefers-reduced-motion: reduce) { .ogt-watchlist-toast__timer { display: none; } }
`;
