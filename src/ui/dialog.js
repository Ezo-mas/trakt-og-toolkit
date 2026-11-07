/**
 * Confirm and prompt dialogs in og's own look, instead of the browser's `confirm()` / `prompt()`.
 * A native modal `<dialog>` like og's `Dialog.svelte`: title bar, body, a footer with Cancel and the red primary
 * button, focus kept inside while open and handed back on close. Esc and the corner close button cancel.
 * Both return promises; without `showModal` (very old engines) they fall back to the native dialogs.
 */
import { el } from '../core/dom.js';

let counter = 0;
const CLOSE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function supported() {
  return Boolean(document.body) && typeof document.createElement('dialog').showModal === 'function';
}

/**
 * @param {{ kind: 'confirm' | 'prompt', title: string, message: string, ok: string, cancel: string,
 *   value?: string, label?: string, placeholder?: string, inputMode?: string, validate?: (value: string) => string | null,
 * }} options
 */
function open(options) {
  const id = `ogt-dialog-${++counter}`;
  const prompt = options.kind === 'prompt';
  const message = el('p', { class: 'ogt-dialog__message', id: `${id}-message`, text: options.message });
  const error = el('p', { class: 'ogt-dialog__error', id: `${id}-error`, role: 'alert', hidden: true });
  const input = prompt ? el('input', {
    class: 'ogt-dialog__input', type: 'text', id: `${id}-input`, autocomplete: 'off', spellcheck: 'false',
    placeholder: options.placeholder, inputmode: options.inputMode, 'aria-describedby': `${id}-message ${id}-error`,
  }) : null;
  if (input) input.value = options.value ?? '';
  const ok = el('button', { type: 'submit', class: 'ogt-dialog__ok', text: options.ok });
  const cancel = el('button', { type: 'button', class: 'ogt-dialog__cancel', text: options.cancel });
  const close = el('button', { type: 'button', class: 'ogt-dialog__close', 'aria-label': 'Close' });
  close.innerHTML = CLOSE_ICON;
  const form = el('form', { class: 'ogt-dialog__form', novalidate: true },
    el('div', { class: 'ogt-dialog__body' }, message,
      input && el('label', { class: 'ogt-dialog__label', for: input.id, text: options.label ?? 'Value' }), input, error),
    el('footer', { class: 'ogt-dialog__footer' }, cancel, ok));
  const dialog = el('dialog', { class: 'ogt-dialog', 'aria-labelledby': `${id}-title`, 'aria-describedby': `${id}-message`,
    dataset: { kind: options.kind } },
  el('div', { class: 'ogt-dialog__panel' }, el('h2', { class: 'ogt-dialog__title', id: `${id}-title`, text: options.title }),
    form, close));

  return new Promise((resolve) => {
    let result = prompt ? null : false;
    const finish = (value) => {
      result = value;
      if (dialog.open) dialog.close();
      else done();
    };
    const done = () => { dialog.remove(); resolve(result); };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!prompt) { finish(true); return; }
      const problem = options.validate?.(input.value) ?? null;
      if (problem) {
        error.textContent = problem;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      finish(input.value);
    });
    input?.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
    cancel.addEventListener('click', () => finish(prompt ? null : false));
    close.addEventListener('click', () => finish(prompt ? null : false));
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(prompt ? null : false); });
    dialog.addEventListener('close', done, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    if (input) { input.focus(); input.select?.(); } else ok.focus();
  });
}

/** Resolves true for the primary button, false for Cancel, Esc or close. */
export function confirmDialog(message, { title = 'Are you sure?', ok = 'OK', cancel = 'Cancel' } = {}) {
  if (!supported()) return Promise.resolve(window.confirm(message));
  return open({ kind: 'confirm', title, message, ok, cancel });
}

/**
 * Resolves the entered text, or null when cancelled. `validate` returns an error message to keep the dialog open
 * and show it under the field, or null to accept.
 */
export function promptDialog(message, { title = 'Enter a value', value = '', ok = 'Save', cancel = 'Cancel', label,
  placeholder, inputMode, validate } = {}) {
  if (!supported()) {
    for (;;) {
      const answer = window.prompt(message, value);
      if (answer === null) return Promise.resolve(null);
      const problem = validate?.(answer) ?? null;
      if (!problem) return Promise.resolve(answer);
      window.alert(problem);
      value = answer;
    }
  }
  return open({ kind: 'prompt', title, message, ok, cancel, value, label, placeholder, inputMode, validate });
}

export const DIALOG_CSS = String.raw`
.ogt-dialog {
  box-sizing: border-box;
  inline-size: var(--dialog-width-notes, 440px);
  max-inline-size: 90%;
  max-block-size: calc(100dvh - 40px);
  padding: 0;
  overflow: visible;
  border: 0;
  background: none;
  color: var(--color-text, light-dark(#333, #e6e6e6));
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
}
.ogt-dialog *, .ogt-dialog *::before, .ogt-dialog *::after { box-sizing: inherit; }
.ogt-dialog [hidden] { display: none !important; }
.ogt-dialog[open] { display: flex; flex-direction: column; }
.ogt-dialog::backdrop { background-color: var(--color-backdrop, rgb(0 0 0 / 0.7)); }
.ogt-dialog__panel {
  position: relative;
  min-block-size: 0;
  overflow-y: auto;
  border: 1px solid var(--color-dialog-art-border, transparent);
  border-radius: var(--radius-dialog, 6px);
  background-color: var(--color-dialog-bg, light-dark(#f5f5f7, #1d1d1d));
  box-shadow: var(--shadow-dialog, 0 0 20px #000);
}
.ogt-dialog__title {
  margin: 0;
  padding: var(--space-panel, 15px) calc(var(--space-dialog-inline, 25px) + 24px) var(--space-panel, 15px) var(--space-dialog-inline, 25px);
  border-block-end: 1px solid var(--color-dialog-title-border, light-dark(#ddd, #444));
  background-color: var(--color-dialog-title-bg, light-dark(#eee, #161616));
  color: var(--color-dialog-title-text, light-dark(#444, #999));
  font-family: var(--font-headings, inherit);
  font-size: var(--font-size-dialog-title, 13px);
  font-weight: var(--font-weight-headings, 600);
  text-transform: uppercase;
}
.ogt-dialog__close {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  display: grid;
  place-items: center;
  inline-size: 46px;
  block-size: 46px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-dialog-close, #ccc);
  cursor: pointer;
}
.ogt-dialog__close:hover { color: var(--color-dialog-title-text, light-dark(#444, #fff)); }
.ogt-dialog__body {
  display: grid;
  gap: 10px;
  padding: var(--dialog-art-body-top, 20px) var(--dialog-art-inline, 22px);
}
.ogt-dialog__message { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
.ogt-dialog__label {
  margin-block-start: 4px;
  color: var(--color-dialog-art-label, light-dark(#666, #aaa));
  font-size: 12px;
  font-weight: 600;
}
.ogt-dialog__input {
  display: block;
  inline-size: 100%;
  padding: var(--dialog-art-field-padding, 9px 12px);
  border: 1px solid var(--color-control-border, light-dark(#d6d6d6, #3b3b3b));
  border-radius: var(--radius-control, 4px);
  background-color: var(--color-control-bg, light-dark(#fff, #232323));
  color: var(--color-control-text, light-dark(#111, #fff));
  font: inherit;
  font-size: var(--font-size-dialog-art-field, 14px);
}
.ogt-dialog__input:hover { border-color: var(--color-control-border-hover, light-dark(#9a9a9a, #5c5c5c)); }
.ogt-dialog__input:focus {
  border-color: var(--color-input-border-focus, #66afe9);
  outline: none;
  box-shadow: var(--shadow-dialog-art-field-focus, 0 0 0 3px rgb(102 175 233 / 0.2));
}
.ogt-dialog__input[aria-invalid='true'] { border-color: var(--brand-danger, var(--brand-primary, #ed1c24)); }
.ogt-dialog__error { margin: 0; color: var(--color-dialog-art-danger-text, light-dark(#a94442, #ffb3b5)); font-size: 12px; }
.ogt-dialog__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--dialog-art-footer-gap, 10px);
  padding: var(--dialog-art-footer-padding, 14px 22px);
  border-block-start: 1px solid var(--color-dialog-art-border, light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.08)));
  background-color: var(--color-dialog-art-footer-bg, light-dark(#ececef, #181818));
  border-end-start-radius: inherit;
  border-end-end-radius: inherit;
}
.ogt-dialog__footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--dialog-art-button-height, 40px);
  padding: var(--dialog-art-button-padding, 0 18px);
  border: 1px solid var(--color-control-border, light-dark(#d6d6d6, #3b3b3b));
  border-radius: var(--radius-control, 4px);
  background: none;
  color: var(--color-control-text, light-dark(#111, #fff));
  font-family: var(--font-headings, inherit);
  font-size: var(--font-size-dialog-art-button, 13px);
  font-weight: var(--font-weight-headings-heavy, 700);
  line-height: 1;
  cursor: pointer;
}
.ogt-dialog__footer .ogt-dialog__cancel:hover {
  border-color: var(--color-control-border-hover, light-dark(#9a9a9a, #5c5c5c));
  background-color: var(--color-dialog-art-button-hover, light-dark(rgb(0 0 0 / 0.04), rgb(255 255 255 / 0.04)));
}
.ogt-dialog__footer .ogt-dialog__ok {
  border-color: var(--brand-primary, #ed1c24);
  background-color: var(--brand-primary, #ed1c24);
  color: var(--color-text-inverse, #fff);
}
.ogt-dialog__footer .ogt-dialog__ok:hover {
  border-color: var(--brand-primary-darken, #c61017);
  background-color: var(--brand-primary-darken, #c61017);
}
.ogt-dialog__panel :focus-visible { outline: 2px solid var(--color-input-border-focus, #66afe9); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .ogt-dialog[open], .ogt-dialog[open]::backdrop {
    transition: opacity 0.3s linear;
    @starting-style { opacity: 0; }
  }
}
`;
