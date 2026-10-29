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
import { getSelection, setSelection, getCustomLinks, getClientId } from '../../settings.js';
import { promptAddCustomLink } from '../../actions.js';
import { readTitleData, readSeasons, mergeSeasons, templateVars } from './data.js';
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

  const linksRow = el('div', { class: 'ogt-row' });
  const controlsRow = el('div', { class: 'ogt-row', hidden: true });

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

    const add = el('button', { class: 'ogt-chip', type: 'button', text: '+ Add link' });
    add.addEventListener('click', () => promptAddCustomLink());
    linksRow.append(add);
  }

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
