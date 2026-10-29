/**
 * Custom links panel on title pages.
 *
 * Adds user-configured links with template placeholders like {title}, {tmdb},
 * {season}, {episode}. The links work from the DOM alone; a client ID only
 * improves the episode counts behind the season/episode pickers.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { fillTemplate, missingPlaceholders } from '../../core/text.js';
import { getSelection, setSelection, getCustomLinks, setCustomLinks, getClientId } from '../../settings.js';
import {
  addPresets,
  filterPresetsByKind,
  mergeSeasons,
  moveLink,
  presetAlreadyAdded,
  readSeasons,
  readTitleData,
  templateVars,
  validateCustomLinks,
} from './data.js';
import { PRESETS } from './presets.js';
import { getSeasons } from '../../core/trakt.js';

const PANEL_ID = 'ogt-custom-links';
const TITLE_ID = 'ogt-custom-links-title';

/** Where the panel belongs: under the summary's stats, above its full-width sections. */
function findMountPoint() {
  const top = document.querySelector('.summary-frame #overview .top') || document.querySelector('#overview .top');
  if (top?.parentElement) return { parent: top.parentElement, before: top.nextSibling };

  const overview = document.querySelector('#overview');
  if (overview) return { parent: overview, before: null };

  const hero = document.querySelector('.fanart-header');
  if (hero?.parentElement) return { parent: hero.parentElement, before: hero.nextSibling };

  return null;
}

function seasonLabel(number) {
  return number === 0 ? 'Specials' : `Season ${number}`;
}

function chip({ label, href, template }) {
  const link = el('a', {
    class: 'ogt-chip',
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
    text: label,
  });
  if (template) link.dataset.ogtTemplate = template;
  return link;
}

function createPanel(meta) {
  let cancelled = false;
  let seasons = [];
  const timers = [];
  let selection = getSelection(meta.kind, meta.id) || { season: null, episode: null };

  const linksRow = el('div', { class: 'ogt-row ogt-links' });
  const controlsRow = el('div', { class: 'ogt-row', hidden: true });
  const actionsRow = el('div', { class: 'ogt-row ogt-link-actions' });
  const tools = el('div', { class: 'ogt-link-tools', hidden: true });
  const editor = el('div', { class: 'ogt-editor', hidden: true });
  const presetChecklist = el('div', { class: 'ogt-presets', hidden: true });
  tools.append(editor, presetChecklist);
  const presetsButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Add presets…' });
  const editButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Edit links' });
  actionsRow.append(presetsButton, editButton);

  const node = el(
    'section',
    { class: 'ogt-panel', id: PANEL_ID, 'aria-labelledby': TITLE_ID },
    el(
      'div',
      { class: 'ogt-head' },
      el('h2', { class: 'ogt-title', id: TITLE_ID, text: 'Custom links' }),
      el('span', { class: 'ogt-badge', text: 'og toolkit' }),
    ),
    linksRow,
    controlsRow,
    actionsRow,
    tools,
  );

  const vars = () => templateVars(meta, selection);

  function updateLinkHrefs() {
    const values = vars();
    for (const link of linksRow.querySelectorAll('[data-ogt-template]')) {
      const template = link.dataset.ogtTemplate;
      if (missingPlaceholders(template, values).length) continue;
      link.setAttribute('href', fillTemplate(template, values));
    }
  }

  function renderLinks() {
    const values = vars();
    linksRow.replaceChildren();

    const links = getCustomLinks();
    if (!links.length) {
      linksRow.append(
        el('p', { class: 'ogt-hint', text: 'Add links to your own services: Plex, Jellyfin, Sonarr, or any URL.' }),
      );
    }

    for (const entry of links) {
      if (!/^https?:\/\//i.test(entry.url)) continue;
      if (missingPlaceholders(entry.url, values).length) continue;
      linksRow.append(chip({ label: entry.label, href: fillTemplate(entry.url, values), template: entry.url }));
    }

  }

  let currentView = null;
  let returnFocus = null;
  let draft = [];
  let nextDraftId = 0;
  let selectedPresets = new Set();

  function closeTools() {
    currentView = null;
    tools.hidden = true;
    editor.hidden = true;
    presetChecklist.hidden = true;
    const target = returnFocus;
    returnFocus = null;
    target?.focus();
  }

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
      renderLinks();
      if (meta.kind === 'show' && needsSelection()) {
        if (seasons.length) renderControls();
        else loadSeasons();
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
    currentView = 'editor';
    returnFocus = editButton;
    draft = getCustomLinks().map((link) => ({ ...link, id: nextDraftId++ }));
    tools.hidden = false;
    editor.hidden = false;
    presetChecklist.hidden = true;
    renderEditor(draft.length ? `${draft[0].id}-label` : 'add-link');
  }

  function renderPresetChecklist() {
    const links = getCustomLinks();
    const presets = filterPresetsByKind(PRESETS, meta.kind);
    const list = el('div', { class: 'ogt-preset-list' });
    selectedPresets = new Set();

    for (const [index, preset] of presets.entries()) {
      const added = presetAlreadyAdded(links, preset);
      const checkbox = el('input', {
        type: 'checkbox',
        value: preset.url,
        disabled: added,
        'aria-label': preset.label,
      });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedPresets.add(preset.url);
        else selectedPresets.delete(preset.url);
      });
      const label = el(
        'label',
        { class: 'ogt-preset-item', for: `ogt-preset-${index}` },
        checkbox,
        el('span', { text: preset.label }),
        added ? el('span', { class: 'ogt-preset-added', text: 'added' }) : null,
      );
      checkbox.id = `ogt-preset-${index}`;
      list.append(label);
    }

    const error = el('p', { class: 'ogt-hint', text: 'Choose the services you want to add.' });
    const confirm = el('button', { class: 'ogt-chip', type: 'button', text: 'Add selected' });
    confirm.addEventListener('click', () => {
      const selected = presets.filter((preset) => selectedPresets.has(preset.url));
      if (selected.length) {
        setCustomLinks(addPresets(getCustomLinks(), selected));
        renderLinks();
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
    currentView = 'presets';
    returnFocus = presetsButton;
    tools.hidden = false;
    editor.hidden = true;
    presetChecklist.hidden = false;
    renderPresetChecklist();
    const firstChoice = presetChecklist.querySelector('input[type="checkbox"]:not(:disabled)');
    (firstChoice || presetChecklist.querySelector('button'))?.focus();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && currentView) {
      event.preventDefault();
      closeTools();
    }
  }

  presetsButton.addEventListener('click', openPresets);
  editButton.addEventListener('click', openEditor);
  node.addEventListener('keydown', onKeyDown);

  function needsSelection() {
    return getCustomLinks().some((entry) => /\{(?:season|episode)\}/.test(entry.url));
  }

  function persistSelection() {
    if (selection.season != null) setSelection(meta.kind, meta.id, selection);
  }

  const seasonSelect = el('select', { class: 'ogt-select', 'aria-label': 'Season' });
  const episodeSlot = el('span', { class: 'ogt-episode' });
  const seasonField = el('label', { class: 'ogt-field' }, 'Season', seasonSelect);
  const episodeField = el('label', { class: 'ogt-field' }, 'Episode', episodeSlot);
  let controlsBuilt = false;

  function ensureControls() {
    if (controlsBuilt) return;
    seasonSelect.addEventListener('change', () => {
      selection.season = Number(seasonSelect.value);
      selection.episode = 1;
      persistSelection();
      renderEpisodeField();
      updateLinkHrefs();
    });
    controlsRow.replaceChildren(seasonField, episodeField);
    controlsBuilt = true;
  }

  function renderEpisodeField() {
    const season = seasons.find((entry) => entry.number === selection.season);
    const count = season?.episodes || null;
    if (!count || count < 1) {
      episodeSlot.replaceChildren(el('span', { text: '—' }));
      selection.episode = null;
      return;
    }

    if (selection.episode == null || selection.episode > count) selection.episode = 1;

    if (count > 8) {
      const input = el('input', {
        class: 'ogt-input',
        type: 'number',
        min: '1',
        max: String(count),
        value: String(selection.episode),
        'aria-label': 'Episode',
      });
      input.addEventListener('change', () => {
        const value = Number(input.value);
        if (Number.isInteger(value) && value >= 1 && value <= count) {
          selection.episode = value;
          persistSelection();
          updateLinkHrefs();
        } else {
          input.value = String(selection.episode);
        }
      });
      episodeSlot.replaceChildren(input);
      return;
    }

    const select = el('select', { class: 'ogt-select', 'aria-label': 'Episode' });
    for (let i = 1; i <= count; i++) {
      select.append(el('option', { value: String(i), text: `Episode ${i}` }));
    }
    select.value = String(selection.episode);
    select.addEventListener('change', () => {
      selection.episode = Number(select.value);
      persistSelection();
      updateLinkHrefs();
    });
    episodeSlot.replaceChildren(select);
  }

  function renderControls() {
    const hasSeasons = meta.kind === 'show' && seasons.length > 0 && needsSelection();
    if (!hasSeasons) {
      controlsRow.hidden = true;
      return;
    }

    ensureControls();
    seasonField.hidden = false;
    episodeField.hidden = false;
    controlsRow.hidden = false;

    const available = seasons.map((season) => season.number);
    if (selection.season == null || !available.includes(selection.season)) {
      selection.season = available.includes(1) ? 1 : available[0];
    }

    if (seasonSelect.options.length !== seasons.length) {
      seasonSelect.replaceChildren(
        ...seasons.map((season) => el('option', { value: String(season.number), text: seasonLabel(season.number) })),
      );
    }

    seasonSelect.value = String(selection.season);
    renderEpisodeField();
    // Re-render so templates that need {season}/{episode} appear now that they have values.
    renderLinks();
    updateLinkHrefs();
  }

  /** Trakt's API policy asks apps to use documented endpoints rather than read the site. When a client
   *  ID is configured, the API is the source of truth; the rendered season cards are only the instant
   *  first paint (and the fallback when there is no key). */
  function loadSeasons() {
    if (meta.kind !== 'show') return;

    seasons = readSeasons(document);
    if (seasons.length) renderControls();

    if (!getClientId()) {
      if (!seasons.length) retryFromDom();
      return;
    }

    getSeasons(meta.id)
      .then((list) => {
        if (cancelled || !list.length) return;
        seasons = mergeSeasons(list, seasons);
        renderControls();
      })
      .catch((error) => {
        debugError('season lookup failed', error);
        if (!cancelled && !seasons.length) retryFromDom();
      });
  }

  /** Season cards can be lazy-rendered, so re-read the DOM for a moment. */
  function retryFromDom() {
    let attempt = 0;
    const retry = () => {
      if (cancelled) return;
      seasons = readSeasons(document);
      if (seasons.length) {
        renderControls();
        return;
      }
      attempt += 1;
      if (attempt < 4) timers.push(setTimeout(retry, 400 * attempt));
    };
    timers.push(setTimeout(retry, 400));
  }

  function onRefresh() {
    renderLinks();
    if (meta.kind === 'show' && needsSelection()) {
      if (seasons.length) renderControls();
      else loadSeasons();
    } else {
      controlsRow.hidden = true;
    }
  }

  renderLinks();
  if (meta.kind === 'show' && needsSelection()) loadSeasons();
  else renderControls();
  document.addEventListener('ogt:refresh', onRefresh);

  return {
    node,
    destroy() {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
      document.removeEventListener('ogt:refresh', onRefresh);
      node.remove();
    },
  };
}

export const customLinks = {
  id: 'custom-links',
  match(route) {
    return route.kind === 'movie' || route.kind === 'show';
  },
  mount(route) {
    if (document.getElementById(PANEL_ID)) return null;

    const meta = readTitleData(document, route);
    if (!meta.id) return null;

    const mount = findMountPoint();
    if (!mount) return null;

    const panel = createPanel(meta);
    mount.parent.insertBefore(panel.node, mount.before);
    return panel;
  },
};
