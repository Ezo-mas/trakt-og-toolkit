/**
 * Custom links below the summary poster, with compact service marks and a Watch Now integration.
 *
 * The saved `watch.customLinks` list is still the only configuration: the compact strip, its management
 * dialog and the extra Watch Now section all resolve the same entries, in the same order, through
 * `resolveCustomLinks`. Links are ordinary anchors; nothing here intercepts clicks or triggers playback.
 */
import { el } from '../../core/dom.js';
import { getSelection } from '../../settings.js';
import { readPersonData, readTitleData, selectionForRoute } from './data.js';
import { createLinks } from './links.js';
import { createPicker } from './picker.js';
import { createManager } from './manager.js';

const PANEL_ID = 'ogt-custom-links';
const TITLE_ID = 'ogt-custom-links-title';
const FALLBACK_ATTR = 'data-ogt-watch-fallback';
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

function createPanel(meta, route) {
  // Season/episode pages take their values from the route; only title pages use the picker.
  const fixedSelection = route.name === 'season' || route.name === 'episode';
  const state = {
    meta, route, fixedSelection,
    selection: meta.kind === 'person'
      ? { season: null, episode: null }
      : selectionForRoute(route, fixedSelection ? null : getSelection(meta.kind, meta.id)),
    cancelled: false, seasons: [], timers: [],
    linksRow: el('div', { class: 'ogt-links' }),
    controlsRow: el('div', { class: 'ogt-row ogt-fields', hidden: true }),
    watchFallback: el('div', { class: 'ogt-watch-fallback', hidden: true, [FALLBACK_ATTR]: '' }),
    renderLinks: () => renderLinks(),
    needsSelection: () => needsSelection(),
    renderControls: () => renderControls(),
    loadSeasons: () => loadSeasons(),
    onRefresh: () => onRefresh(),
  };
  const { linksRow, controlsRow, watchFallback } = state;
  const managerView = createManager(state);
  const { manager, presetsButton, serversButton, editButton } = managerView;

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

  const links = createLinks(state);
  const { renderLinks, syncWatchNow } = links;

  const picker = createPicker(state);
  const { needsSelection, renderControls, loadSeasons } = picker;

  function onRefresh() {
    renderLinks();
    if (meta.kind === 'show' && needsSelection()) {
      if (state.seasons.length) renderControls();
      else loadSeasons();
    } else {
      controlsRow.hidden = true;
    }
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
    if (state.cancelled || watchTimer) return;
    watchTimer = setTimeout(() => {
      watchTimer = null;
      if (state.cancelled) return;
      place();
      syncWatchNow();
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
      state.cancelled = true;
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = null;
      picker.destroy();
      observer.disconnect();
      document.removeEventListener('ogt:refresh', onRefresh);
      links.destroy();
      managerView.destroy();
      node.remove();
    },
  };
}

export const customLinks = {
  id: 'custom-links',
  match(route) {
    return route.kind === 'movie' || route.kind === 'show' || route.kind === 'person';
  },
  mount(route) {
    if (document.getElementById(PANEL_ID)) return null;

    const meta = route.kind === 'person' ? readPersonData(document, route) : readTitleData(document, route);
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
