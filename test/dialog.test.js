import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(t) {
  const window = new Window({ url: 'https://og.trakt.tv/' });
  t.after(() => window.close());
  globalThis.window = window; globalThis.document = window.document; globalThis.Node = window.Node;
  t.after(() => { delete globalThis.window; delete globalThis.document; delete globalThis.Node; });
  window.confirm = () => assert.fail('no native confirm');
  window.prompt = () => assert.fail('no native prompt');
  return { window, document: window.document, ...(await import('../src/ui/dialog.js')) };
}

test('confirm opens a labelled modal dialog and resolves from its buttons, Esc and close', async (t) => {
  const { document, window, confirmDialog } = await setup(t);
  const answer = confirmDialog('Clear 2 items?\nThis cannot be undone.', { title: 'Clear paused playback', ok: 'Clear' });
  const dialog = document.querySelector('dialog.ogt-dialog');
  assert.equal(dialog.open, true);
  assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Clear paused playback');
  assert.match(document.getElementById(dialog.getAttribute('aria-describedby')).textContent, /cannot be undone/);
  assert.equal(document.activeElement, dialog.querySelector('.ogt-dialog__ok'));
  assert.equal(dialog.querySelector('.ogt-dialog__ok').textContent, 'Clear');
  dialog.querySelector('.ogt-dialog__ok').click();
  assert.equal(await answer, true);
  assert.equal(document.querySelector('dialog'), null);

  const cancelled = confirmDialog('Sure?');
  document.querySelector('.ogt-dialog__cancel').click();
  assert.equal(await cancelled, false);

  const escaped = confirmDialog('Sure?');
  document.querySelector('dialog').dispatchEvent(new window.Event('cancel', { cancelable: true }));
  assert.equal(await escaped, false);

  const closed = confirmDialog('Sure?');
  document.querySelector('.ogt-dialog__close').click();
  assert.equal(await closed, false);
});

test('prompt prefills and focuses its field, keeps itself open on invalid input and resolves text or null', async (t) => {
  const { document, window, promptDialog } = await setup(t);
  const answer = promptDialog('Set the saved progress.', { title: 'Save progress', label: 'Progress (%)', value: '42',
    validate: (text) => Number(text) >= 1 ? null : 'Enter a percentage from 1 to 100.' });
  const input = document.querySelector('.ogt-dialog__input');
  assert.equal(input.value, '42');
  assert.equal(document.activeElement, input);
  assert.equal(document.querySelector(`label[for="${input.id}"]`).textContent, 'Progress (%)');
  input.value = '0';
  document.querySelector('.ogt-dialog__ok').click();
  await wait();
  const error = document.querySelector('.ogt-dialog__error');
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'Enter a percentage from 1 to 100.');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(document.querySelector('dialog').open, true);
  input.value = '55';
  input.dispatchEvent(new window.Event('input'));
  assert.equal(error.hidden, true);
  document.querySelector('.ogt-dialog__ok').click();
  assert.equal(await answer, '55');

  const cancelled = promptDialog('Anything?');
  document.querySelector('.ogt-dialog__cancel').click();
  assert.equal(await cancelled, null);
  assert.equal(document.querySelector('dialog'), null);
});
