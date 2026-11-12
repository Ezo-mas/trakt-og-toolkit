import { el } from '../../core/dom.js';
import { getCustomLinks, setCustomLinks } from '../../settings.js';
import { moveLink, validateCustomLinks } from './data.js';

export function createEditor(state, editor, editButton, openManager, closeTools) {
  const { meta, controlsRow } = state;
  let draft = [];
  let nextDraftId = 0;

  function renderEditor(focusKey) {
    editor.replaceChildren();
    const list = el('div', { class: 'ogt-editor-list' });
    for (const [index, entry] of draft.entries()) {
      const labelInput = el('input', {
        class: 'ogt-editor-input',
        type: 'text',
        value: entry.label,
        'aria-label': 'Link label',
        'data-focus': `${entry.id}-label`,
      });
      labelInput.addEventListener('input', () => {
        entry.label = labelInput.value;
      });
      const urlInput = el('input', {
        class: 'ogt-editor-input',
        type: 'text',
        value: entry.url,
        'aria-label': 'Link URL',
        'data-focus': `${entry.id}-url`,
      });
      urlInput.addEventListener('input', () => {
        entry.url = urlInput.value;
      });

      const up = el('button', {
        class: 'ogt-mini-button',
        type: 'button',
        text: '↑',
        'aria-label': 'Move up',
        disabled: index === 0,
        'data-focus': `${entry.id}-up`,
      });
      up.addEventListener('click', () => {
        draft = moveLink(draft, index, -1);
        renderEditor(`${entry.id}-up`);
      });
      const down = el('button', {
        class: 'ogt-mini-button',
        type: 'button',
        text: '↓',
        'aria-label': 'Move down',
        disabled: index === draft.length - 1,
        'data-focus': `${entry.id}-down`,
      });
      down.addEventListener('click', () => {
        draft = moveLink(draft, index, 1);
        renderEditor(`${entry.id}-down`);
      });
      const remove = el('button', {
        class: 'ogt-mini-button',
        type: 'button',
        text: 'Delete',
        'aria-label': 'Delete link',
      });
      remove.addEventListener('click', () => {
        draft = draft.filter((link) => link.id !== entry.id);
        const nextEntry = draft[Math.min(index, draft.length - 1)];
        renderEditor(nextEntry ? `${nextEntry.id}-label` : 'add-link');
      });

      list.append(
        el(
          'div',
          { class: 'ogt-editor-row' },
          el('label', { class: 'ogt-editor-field' }, 'Label', labelInput),
          el('label', { class: 'ogt-editor-field' }, 'URL', urlInput),
          el('div', { class: 'ogt-editor-actions' }, up, down, remove),
        ),
      );
    }

    const error = el('p', { class: 'ogt-editor-error', role: 'alert', hidden: true });
    const add = el('button', {
      class: 'ogt-chip',
      type: 'button',
      text: 'Add link',
      'data-focus': 'add-link',
    });
    add.addEventListener('click', () => {
      const entry = { id: nextDraftId++, label: '', url: '' };
      draft.push(entry);
      renderEditor(`${entry.id}-label`);
    });
    const save = el('button', { class: 'ogt-chip', type: 'button', text: 'Save links' });
    save.addEventListener('click', () => {
      const errors = validateCustomLinks(draft);
      if (errors.length) {
        const first = errors[0];
        error.textContent = first.message;
        error.hidden = false;
        const entry = draft[first.index];
        editor.querySelector(`[data-focus="${entry.id}-${first.field}"]`)?.focus();
        return;
      }

      setCustomLinks(draft.map(({ label, url }) => ({ label: label.trim(), url: url.trim() })));
      state.renderLinks();
      if (meta.kind === 'show' && state.needsSelection()) {
        if (state.seasons.length) state.renderControls();
        else state.loadSeasons();
      } else {
        controlsRow.hidden = true;
      }
      closeTools();
    });
    const cancel = el('button', { class: 'ogt-chip', type: 'button', text: 'Cancel' });
    cancel.addEventListener('click', closeTools);

    editor.append(
      el('div', { class: 'ogt-editor-list-wrap' }, list),
      error,
      el('div', { class: 'ogt-row ogt-editor-footer' }, add, save, cancel),
    );
    if (focusKey) editor.querySelector(`[data-focus="${focusKey}"]`)?.focus();
  }

  function openEditor() {
    draft = getCustomLinks().map((link) => ({ ...link, id: nextDraftId++ }));
    openManager('editor', editButton, () => renderEditor(draft.length ? `${draft[0].id}-label` : 'add-link'));
  }

  return { openEditor };
}
