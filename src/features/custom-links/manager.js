import { el } from '../../core/dom.js';
import { getCustomLinks, setCustomLinks, getServers, setServers, normalizeServerUrl } from '../../settings.js';
import { addPresets, filterPresetsByKind, presetAlreadyAdded } from './data.js';
import { PRESETS } from './presets.js';
import { createEditor } from './editor.js';

const MANAGER_ID = 'ogt-custom-links-manager';
const SERVER_FIELDS = [
  { key: 'jellyfin', label: 'Jellyfin', placeholder: 'http://192.168.1.20:8096' },
  { key: 'emby', label: 'Emby', placeholder: 'http://192.168.1.20:8096' },
  { key: 'radarr', label: 'Radarr', placeholder: 'http://192.168.1.20:7878' },
  { key: 'sonarr', label: 'Sonarr', placeholder: 'http://192.168.1.20:8989' },
  { key: 'seerr', label: 'Seerr', placeholder: 'http://192.168.1.20:5055' },
];

/**
 * Sidebar strip tiles, laid out like OG's `ul.external-links` grid: reference sites are square logo tiles, watch and
 * library services are wide logo-and-name tiles, and links without a known mark are wide text tiles.
 */
const ICON_ADD = 'M12 5v14M5 12h14';
const ICON_SERVER = 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01';
const ICON_EDIT = 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4';

/** A management button styled like og's square sidebar actions: a stroked icon over a short label. */
function manageButton(name, text, d) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  for (const [key, value] of Object.entries({ d, fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(key, value);
  svg.append(path);
  return el('button', { class: 'ogt-manage-button', type: 'button', 'aria-label': name, title: name },
    svg, el('span', { text }));
}

export function createManager(state) {
  const { meta, controlsRow } = state;
  const editor = el('div', { class: 'ogt-editor', hidden: true });
  const presetChecklist = el('div', { class: 'ogt-presets', hidden: true });
  const serversPanel = el('div', { class: 'ogt-servers', hidden: true });

  const presetsButton = manageButton('Add presets…', 'Presets', ICON_ADD);
  const serversButton = manageButton('Servers…', 'Servers', ICON_SERVER);
  const editButton = manageButton('Edit links', 'Edit', ICON_EDIT);
  const closeButton = el('button', { class: 'ogt-manager-close', type: 'button', text: 'Close' });

  const manager = el(
    'dialog',
    { class: 'ogt-manager', id: MANAGER_ID, 'aria-labelledby': `${MANAGER_ID}-title` },
    el(
      'div',
      { class: 'ogt-manager-panel' },
      el(
        'header',
        { class: 'ogt-manager-head' },
        el('h2', { class: 'ogt-manager-title', id: `${MANAGER_ID}-title`, text: 'Custom links' }),
        closeButton,
      ),
      el('div', { class: 'ogt-manager-body' }, editor, presetChecklist, serversPanel),
    ),
  );

  let currentView = null;
  let returnFocus = null;
  let selectedPresets = new Set();

  function restoreFocus(target) {
    if (state.cancelled || !target?.isConnected) return;
    target.focus?.();
  }

  function closeTools() {
    currentView = null;
    editor.hidden = true;
    presetChecklist.hidden = true;
    serversPanel.hidden = true;
    const target = returnFocus;
    returnFocus = null;
    if (manager.open) {
      manager.close();
      // The close event sees returnFocus already cleared, so restore here for the programmatic path.
      restoreFocus(target);
    } else {
      manager.removeAttribute('open');
      restoreFocus(target);
    }
  }

  function openManager(view, opener, render) {
    currentView = view;
    returnFocus = opener;
    editor.hidden = view !== 'editor';
    presetChecklist.hidden = view !== 'presets';
    serversPanel.hidden = view !== 'servers';
    if (typeof manager.showModal === 'function') {
      if (!manager.open) manager.showModal();
    } else {
      manager.setAttribute('open', '');
    }
    render();
  }

  const { openEditor } = createEditor(state, editor, editButton, openManager, closeTools);

  function renderServers() {
    serversPanel.replaceChildren();
    const servers = getServers();
    const list = el('div', { class: 'ogt-server-list' });
    const inputs = {};

    for (const field of SERVER_FIELDS) {
      const input = el('input', {
        class: 'ogt-editor-input',
        type: 'text',
        value: servers[field.key] || '',
        placeholder: field.placeholder,
        'aria-label': `${field.label} URL`,
        'data-focus': `${field.key}-url`,
      });
      inputs[field.key] = input;
      list.append(el('label', { class: 'ogt-editor-field' }, field.label, input));
    }

    const error = el('p', { class: 'ogt-editor-error', role: 'alert', hidden: true });
    const save = el('button', { class: 'ogt-chip', type: 'button', text: 'Save servers' });
    save.addEventListener('click', () => {
      const next = {};
      for (const field of SERVER_FIELDS) {
        const raw = inputs[field.key].value.trim();
        if (!raw) continue;
        const normalized = normalizeServerUrl(raw);
        if (!normalized) {
          error.textContent = `${field.label}: enter a valid host or http(s) URL.`;
          error.hidden = false;
          inputs[field.key].focus();
          return;
        }
        next[field.key] = normalized;
      }

      setServers(next);
      state.renderLinks();
      closeTools();
    });
    const cancel = el('button', { class: 'ogt-chip', type: 'button', text: 'Cancel' });
    cancel.addEventListener('click', closeTools);

    serversPanel.append(
      el('p', {
        class: 'ogt-hint',
        text: 'Enter the base URL of your own server. Bare hosts use http://; HTTPS and base paths are supported. Credentials, query strings and fragments are not.',
      }),
      list,
      error,
      el('div', { class: 'ogt-row ogt-editor-footer' }, save, cancel),
    );
    serversPanel.querySelector('input')?.focus();
  }

  function openServers() {
    returnFocus = serversButton;
    openManager('servers', serversButton, renderServers);
  }

  function renderPresetChecklist() {
    const links = getCustomLinks();
    const servers = getServers();
    const presets = filterPresetsByKind(PRESETS, meta.kind, meta.genres);
    const list = el('div', { class: 'ogt-preset-list' });
    selectedPresets = new Set();

    for (const [index, preset] of presets.entries()) {
      const added = presetAlreadyAdded(links, preset);
      const needsServer = Boolean(preset.requires && !servers[preset.requires]);
      const checkbox = el('input', {
        type: 'checkbox',
        value: preset.url,
        disabled: added || needsServer,
        'aria-label': preset.label,
      });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedPresets.add(preset.url);
        else selectedPresets.delete(preset.url);
      });
      const label = el(
        'label',
        { class: 'ogt-preset-item', for: `${MANAGER_ID}-preset-${index}` },
        checkbox,
        el('span', { text: preset.label }),
        added
          ? el('span', { class: 'ogt-preset-added', text: 'added' })
          : needsServer
            ? el('span', { class: 'ogt-preset-added', text: 'set server URL' })
            : null,
      );
      checkbox.id = `${MANAGER_ID}-preset-${index}`;
      list.append(label);
    }

    const error = el('p', {
      class: 'ogt-hint',
      text: 'Choose the services you want to add. Server presets need a URL under Servers… first.',
    });
    const confirm = el('button', { class: 'ogt-chip', type: 'button', text: 'Add selected' });
    confirm.addEventListener('click', () => {
      const selected = presets.filter((preset) => selectedPresets.has(preset.url));
      if (selected.length) {
        setCustomLinks(addPresets(getCustomLinks(), selected));
        state.onRefresh();
      }
      closeTools();
    });
    const cancel = el('button', { class: 'ogt-chip', type: 'button', text: 'Cancel' });
    cancel.addEventListener('click', closeTools);
    presetChecklist.replaceChildren(
      el('div', { class: 'ogt-preset-list-wrap' }, list),
      error,
      el('div', { class: 'ogt-row ogt-editor-footer' }, confirm, cancel),
    );
  }

  function openPresets() {
    returnFocus = presetsButton;
    openManager('presets', presetsButton, () => {
      renderPresetChecklist();
      const firstChoice = presetChecklist.querySelector('input[type="checkbox"]:not(:disabled)');
      (firstChoice || presetChecklist.querySelector('button'))?.focus();
    });
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && currentView) {
      event.preventDefault();
      closeTools();
    }
  }

  presetsButton.addEventListener('click', openPresets);
  serversButton.addEventListener('click', openServers);
  editButton.addEventListener('click', openEditor);
  closeButton.addEventListener('click', closeTools);
  manager.addEventListener('keydown', onKeyDown);
  function onCancel(event) {
    event.preventDefault();
    closeTools();
  }
  function onClose() {
    currentView = null;
    editor.hidden = true;
    presetChecklist.hidden = true;
    serversPanel.hidden = true;
    const target = returnFocus;
    returnFocus = null;
    restoreFocus(target);
  }
  manager.addEventListener('cancel', onCancel);
  manager.addEventListener('close', onClose);

  return { manager, presetsButton, serversButton, editButton, destroy() {
    if (manager.open) manager.close();
    presetsButton.removeEventListener('click', openPresets);
    serversButton.removeEventListener('click', openServers);
    editButton.removeEventListener('click', openEditor);
    closeButton.removeEventListener('click', closeTools);
    manager.removeEventListener('keydown', onKeyDown);
    manager.removeEventListener('cancel', onCancel);
    manager.removeEventListener('close', onClose);
    manager.remove();
  } };
}
