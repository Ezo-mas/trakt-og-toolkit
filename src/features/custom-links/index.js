/**
 * Custom links below the summary poster, with compact service marks and a Watch Now integration.
 *
 * The saved `watch.customLinks` list is still the only configuration: the compact strip, its management
 * dialog and the extra Watch Now section all resolve the same entries, in the same order, through
 * `resolveCustomLinks`. Links are ordinary anchors; nothing here intercepts clicks or triggers playback.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import {
  getSelection,
  setSelection,
  getCustomLinks,
  setCustomLinks,
  getClientId,
  getServers,
  setServers,
  normalizeServerUrl,
} from '../../settings.js';
import {
  addPresets,
  filterPresetsByKind,
  mergeSeasons,
  moveLink,
  presetAlreadyAdded,
  readSeasons,
  readTitleData,
  resolveCustomLinks,
  selectionForRoute,
  showTemplateData,
  templateVars,
  validateCustomLinks,
  watchNowLinks,
} from './data.js';
import { PRESETS, presetTemplateUrls } from './presets.js';
import { serviceColor, serviceIcon } from './icons.js';
import { getSeasons } from '../../core/trakt.js';
import { getShowDetails } from './api.js';

const PANEL_ID = 'ogt-custom-links';
const TITLE_ID = 'ogt-custom-links-title';
const MANAGER_ID = 'ogt-custom-links-manager';
const FALLBACK_ATTR = 'data-ogt-watch-fallback';
const WATCH_ATTR = 'data-ogt-watch-now';
const SERVER_FIELDS = [
  { key: 'jellyfin', label: 'Jellyfin', placeholder: 'http://192.168.1.20:8096' },
  { key: 'emby', label: 'Emby', placeholder: 'http://192.168.1.20:8096' },
  { key: 'radarr', label: 'Radarr', placeholder: 'http://192.168.1.20:7878' },
  { key: 'sonarr', label: 'Sonarr', placeholder: 'http://192.168.1.20:8989' },
  { key: 'seerr', label: 'Seerr', placeholder: 'http://192.168.1.20:5055' },
];

function desktopTarget(aside) {
  // Native external links are the last tools in the sidebar; sit right above them, below the poster/Watch Now.
  const external = aside.querySelector('ul.external-links');
  if (external) return { parent: external.parentElement, before: external };

  const watchNow = aside.querySelector('.watch-now');
  if (watchNow) {
    // Keep the panel after Watch Now's own dialog; inserting between an adjacent button and dialog can break og's
    // native positioning.
    const next = watchNow.nextElementSibling;
    return { parent: watchNow.parentElement, before: next?.tagName === 'DIALOG' ? next.nextSibling : watchNow.nextSibling };
  }

  const poster = aside.querySelector('.summary-poster');
  const holder = poster?.closest('a.poster-link') || poster;
  if (holder?.parentElement) return { parent: holder.parentElement, before: holder.nextSibling };

  return { parent: aside, before: null };
}

/** OG is desktop-only (phones and portrait tablets get a splash), so the summary sidebar is the one home. */
function findMountTarget() {
  const aside = document.querySelector('aside.sidebar');
  if (aside) return desktopTarget(aside);

  const top = document.querySelector('#overview .top') || document.querySelector('.summary-frame .top');
  if (top?.parentElement) return { parent: top.parentElement, before: top.nextSibling };

  return null;
}

function seasonLabel(number) {
  return number === 0 ? 'Specials' : `Season ${number}`;
}

/**
 * Sidebar strip tiles, laid out like OG's `ul.external-links` grid: reference sites are square logo tiles, watch and
 * library services are wide logo-and-name tiles, and links without a known mark are wide text tiles.
 */
function compactLink(entry) {
  const label = entry.label.trim() || 'Custom link';
  const icon = serviceIcon(entry.icon);
  const variant = !icon ? 'text' : entry.surface === 'reference' ? 'icon' : 'tile';
  return el(
    'a',
    {
      class: `ogt-service-link ogt-service-link--${variant}`,
      href: entry.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': label,
      'data-ogt-tooltip': label,
      'data-ogt-surface': entry.surface,
      style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : undefined,
    },
    icon,
    variant === 'icon' ? null : el('span', { class: 'ogt-service-label', text: label }),
  );
}

const SURFACE_NOTES = { watch: 'Your service', library: 'Add to library' };

/** A Watch Now tile shaped like OG's provider tiles: a 2:1 logo card with a note underneath. */
function watchLink(entry) {
  const label = entry.label.trim() || 'Custom link';
  return el(
    'a',
    {
      class: 'ogt-watch-now-link',
      href: entry.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': label,
      'data-ogt-surface': entry.surface,
      style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : undefined,
    },
    el('span', { class: 'ogt-watch-now-card' }, serviceIcon(entry.icon), el('span', { class: 'ogt-service-name', text: label })),
    el('span', { class: 'ogt-watch-now-note', text: SURFACE_NOTES[entry.surface] || 'Your link' }),
  );
}

function signatureFor(entries) {
  return JSON.stringify(entries.map(({ label, href, icon, surface }) => [label, href, icon, surface]));
}

/** Watch Now dialogs that belong to this summary: a `.watch-now` with a direct dialog sibling. */
function watchNowContainers() {
  const containers = [];
  for (const watchNow of document.querySelectorAll('.watch-now')) {
    const parent = watchNow.parentElement;
    if (!parent) continue;
    for (const child of parent.children) {
      if (child.tagName !== 'DIALOG') continue;
      const links = child.querySelector('.streaming-links');
      if (!links || !/watch now/i.test(child.textContent || '')) continue;
      if (!containers.includes(links)) containers.push(links);
    }
  }
  return containers;
}

function createPanel(meta, route) {
  let cancelled = false;
  let seasons = [];
  const timers = [];
  // Season/episode pages take their values from the route; only title pages use the picker.
  const fixedSelection = route.name === 'season' || route.name === 'episode';
  let selection = selectionForRoute(route, fixedSelection ? null : getSelection(meta.kind, meta.id));

  const linksRow = el('div', { class: 'ogt-links' });
  const controlsRow = el('div', { class: 'ogt-row ogt-fields', hidden: true });
  const watchFallback = el('div', { class: 'ogt-watch-fallback', hidden: true, [FALLBACK_ATTR]: '' });
  const editor = el('div', { class: 'ogt-editor', hidden: true });
  const presetChecklist = el('div', { class: 'ogt-presets', hidden: true });
  const serversPanel = el('div', { class: 'ogt-servers', hidden: true });

  const presetsButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Add presets…' });
  const serversButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Servers…' });
  const editButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Edit links' });
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

  const node = el(
    'section',
    { class: 'ogt-panel ogt-links-compact', id: PANEL_ID, 'aria-labelledby': TITLE_ID },
    el(
      'div',
      { class: 'ogt-links-head' },
      el('h2', { class: 'ogt-visually-hidden', id: TITLE_ID, text: 'Custom links' }),
      linksRow,
    ),
    watchFallback,
    controlsRow,
    el('div', { class: 'ogt-links-manage' }, presetsButton, serversButton, editButton),
  );

  const vars = () => templateVars(meta, selection, getServers());

  let currentView = null;
  let returnFocus = null;
  let draft = [];
  let nextDraftId = 0;
  let selectedPresets = new Set();
  let renderedEntries = [];

  function restoreFocus(target) {
    if (cancelled || !target?.isConnected) return;
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
    returnFocus = editButton;
    draft = getCustomLinks().map((link) => ({ ...link, id: nextDraftId++ }));
    openManager('editor', editButton, () => renderEditor(draft.length ? `${draft[0].id}-label` : 'add-link'));
  }

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
      renderLinks();
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
    const presets = filterPresetsByKind(PRESETS, meta.kind);
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
        onRefresh();
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
  manager.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTools();
  });
  manager.addEventListener('close', () => {
    currentView = null;
    editor.hidden = true;
    presetChecklist.hidden = true;
    serversPanel.hidden = true;
    const target = returnFocus;
    returnFocus = null;
    restoreFocus(target);
  });

  function renderLinks() {
    const values = vars();
    const entries = resolveCustomLinks(getCustomLinks(), values, meta.kind);
    renderedEntries = entries;
    linksRow.replaceChildren();

    if (!entries.length) {
      linksRow.append(
        el('p', { class: 'ogt-hint', text: 'Add links to your own services: Plex, Jellyfin, Sonarr, or any URL.' }),
      );
    }

    for (const entry of entries) linksRow.append(compactLink(entry));
    syncWatchNow(entries);
    lookUpShow(values);
  }

  /** Add only watch/play/library links to OG's own Watch Now dialogs; keep every native section and count. */
  function syncWatchNow(entries = renderedEntries) {
    const watch = watchNowLinks(entries);
    const containers = watchNowContainers();

    for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) {
      if (!containers.includes(section.parentElement)) section.remove();
    }

    if (!watch.length) {
      watchFallback.hidden = true;
      watchFallback.replaceChildren();
      delete watchFallback.dataset.ogtSignature;
      return;
    }

    const signature = signatureFor(watch);
    for (const container of containers) {
      const existing = container.querySelector(`:scope > [${WATCH_ATTR}]`);
      if (existing?.dataset.ogtSignature === signature) continue;
      existing?.remove();
      container.append(
        el(
          'div',
          { class: 'ogt-watch-now-section', [WATCH_ATTR]: '', 'data-ogt-signature': signature },
          el(
            'h3',
            { class: 'section-title' },
            'Your services',
            el('span', { class: 'count', text: String(watch.length) }),
          ),
          el('div', { class: 'tiles ogt-watch-now-tiles' }, watch.map(watchLink)),
        ),
      );
    }

    if (!containers.length) {
      if (watchFallback.dataset.ogtSignature !== signature) {
        watchFallback.replaceChildren(
          el(
            'div',
            { class: 'ogt-watch-fallback-head' },
            el('span', { class: 'ogt-watch-fallback-title', text: 'Watch Now' }),
            el('span', { class: 'ogt-watch-fallback-note', text: 'your links' }),
          ),
          el('div', { class: 'ogt-watch-now-tiles' }, watch.map(watchLink)),
        );
        watchFallback.dataset.ogtSignature = signature;
      }
      watchFallback.hidden = false;
    } else {
      watchFallback.hidden = true;
    }
  }

  let showRequested = false;
  /** Season/episode pages: fetch the show once a link needs what og's page doesn't give (the show's year, an episode
   *  page's IMDb id). This runs on every render, so a link added in the editor triggers it too. Without a client ID
   *  those links stay hidden rather than point at the season or episode. */
  function lookUpShow(values) {
    if (!fixedSelection || showRequested || !getClientId()) return;
    const missing = ['year', 'tmdb', 'imdb', 'tvdb'].filter((key) => meta[key] == null);
    if (!missing.length) return;
    // Deep preset routes may need the show's IMDb id even though the stored search URL doesn't.
    const needed = missing.flatMap((key) => (key === 'imdb' ? ['{imdb}', '{imdbnum}'] : [`{${key}}`]));
    if (!getCustomLinks().some((entry) =>
      presetTemplateUrls(entry.url, meta.kind).some((template) =>
        needed.some((placeholder) => template.includes(placeholder)))))
      return;
    showRequested = true;
    getShowDetails(route.id)
      .then((show) => setMeta(showTemplateData(show)))
      .catch((error) => { if (!cancelled) debugError('show lookup failed', error); });
  }

  function needsSelection() {
    return !fixedSelection && getCustomLinks().some((entry) =>
      presetTemplateUrls(entry.url, meta.kind).some((template) => /\{(?:season|episode)\}/.test(template)));
  }

  function persistSelection() {
    if (!fixedSelection && selection.season != null) setSelection(meta.kind, meta.id, selection);
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
      renderLinks();
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
          renderLinks();
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
      renderLinks();
    });
    episodeSlot.replaceChildren(select);
  }

  function renderControls() {
    const hasSeasons = !fixedSelection && meta.kind === 'show' && seasons.length > 0 && needsSelection();
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
  }

  /** Trakt's API policy asks apps to use documented endpoints rather than read the site. When a client
   *  ID is configured, the API is the source of truth; the rendered season cards are only the instant
   *  first paint (and the fallback when there is no key). */
  function loadSeasons() {
    if (meta.kind !== 'show' || fixedSelection) return;

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

  /** Fill in the show's own values once its lookup returns, keeping what og's page already gave. */
  function setMeta(next) {
    if (cancelled || !next) return;
    for (const [key, value] of Object.entries(next)) if (value != null) meta[key] = value;
    renderLinks();
  }

  /** Keep the one panel above og's sidebar external links when og re-renders around it. */
  function place() {
    const target = findMountTarget();
    if (!target) return;
    if (target.before) {
      if (node.parentElement === target.parent && node.nextSibling === target.before) return;
      target.parent.insertBefore(node, target.before);
    } else {
      if (node.parentElement === target.parent && !node.nextSibling) return;
      target.parent.append(node);
    }
  }


  let watchTimer = null;
  const observer = new MutationObserver(() => {
    if (cancelled || watchTimer) return;
    watchTimer = setTimeout(() => {
      watchTimer = null;
      if (cancelled) return;
      place();
      syncWatchNow(renderedEntries);
    }, 60);
  });

  /** Watch only the summary areas this feature can move between or inject into, not the whole page. */
  function observeAreas() {
    observer.disconnect();
    const roots = new Set();
    const aside = document.querySelector('aside.sidebar');
    const overview = document.querySelector('#overview');
    if (aside) roots.add(aside);
    if (overview) roots.add(overview);
    if (!roots.size) roots.add(document.querySelector('.summary-frame') || document.body);
    for (const root of roots) observer.observe(root, { childList: true, subtree: true });
  }

  document.addEventListener('ogt:refresh', onRefresh);
  observeAreas();
  renderLinks();
  if (meta.kind === 'show' && needsSelection()) loadSeasons();
  else renderControls();

  return {
    node,
    manager,
    place,
    destroy() {
      cancelled = true;
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = null;
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
      observer.disconnect();
      document.removeEventListener('ogt:refresh', onRefresh);
      for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) section.remove();
      watchFallback.replaceChildren();
      if (manager.open) manager.close();
      manager.remove();
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

    const target = findMountTarget();
    if (!target) return null;

    const panel = createPanel(meta, route);
    // Keep the modal outside the movable panel: moving a node that contains an open dialog closes it.
    document.body.append(panel.manager);
    target.parent.insertBefore(panel.node, target.before);
    panel.place();

    return panel;
  },
};
