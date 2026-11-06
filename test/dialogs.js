/**
 * Answers the toolkit's own dialogs (src/ui/dialog.js) in a happy-dom window, the way window.confirm/prompt mocks
 * used to. `confirm(message)` returns a boolean; `prompt(message, value)` returns the text to enter, or null to
 * cancel. A prompt that stays open (its validation failed) records the error and is cancelled.
 */
export function answerDialogs(window, { confirm = () => true, prompt = (message, value) => value } = {}) {
  const seen = { confirms: [], prompts: [], errors: [], titles: [] };
  const original = window.HTMLDialogElement.prototype.showModal;
  window.HTMLDialogElement.prototype.showModal = function showModal(...args) {
    const result = original.apply(this, args);
    // happy-dom shares element classes between windows, so each helper only answers its own window's dialogs.
    if (this.ownerDocument !== window.document || !this.classList.contains('ogt-dialog')) return result;
    const dialog = this;
    setTimeout(() => {
      const message = dialog.querySelector('.ogt-dialog__message')?.textContent ?? '';
      seen.titles.push(dialog.querySelector('.ogt-dialog__title')?.textContent ?? '');
      if (dialog.dataset.kind === 'confirm') {
        seen.confirms.push(message);
        dialog.querySelector(confirm(message) ? '.ogt-dialog__ok' : '.ogt-dialog__cancel').click();
        return;
      }
      const input = dialog.querySelector('.ogt-dialog__input');
      seen.prompts.push({ message, value: input.value });
      const answer = prompt(message, input.value);
      if (answer === null) { dialog.querySelector('.ogt-dialog__cancel').click(); return; }
      input.value = answer;
      dialog.querySelector('.ogt-dialog__ok').click();
      if (dialog.isConnected && dialog.open) {
        seen.errors.push(dialog.querySelector('.ogt-dialog__error')?.textContent ?? '');
        dialog.querySelector('.ogt-dialog__cancel').click();
      }
    }, 0);
    return result;
  };
  return seen;
}
