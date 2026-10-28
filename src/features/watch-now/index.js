/**
 * "Watch & links" panel on title pages.
 *
 * No Trakt auth is needed for the panel itself: the TMDb/IMDb ids come from the
 * rendered stats strip. The trailer needs a client ID (public, free) because it
 * hits the Trakt API, so it asks for one on first use.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { fillTemplate, missingPlaceholders } from '../../core/text.js';
import { DEFAULT_LINKS } from '../../config.js';
import {
  getClientId,
  setClientId,
  getCustomLinks,
  getSelection,
  setSelection,
} from '../../settings.js';
import { getTrailer, getSeasons, isAuthError } from '../../core/trakt.js';
import { showTrailer, toast } from '../../ui/shell.js';
import { promptAddCustomLink } from '../../actions.js';
import { readTitleData, readSeasons, templateVars } from './data.js';

const PANEL_ID = 'ogt-watch-now';
const TITLE_ID = 'ogt-watch-now-title';

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

function chip({ label, href, template, primary = false }) {
  const link = el('a', {
    class: primary ? 'ogt-chip ogt-chip--primary' : 'ogt-chip',
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

  const linksRow = el('div', { class: 'ogt-row', role: 'list' });
  const controlsRow = el('div', { class: 'ogt-row', hidden: true });

  const node = el(
    'section',
    { class: 'ogt-panel', id: PANEL_ID, 'aria-labelledby': TITLE_ID },
    el(
      'div',
      { class: 'ogt-head' },
      el('h2', { class: 'ogt-title', id: TITLE_ID, text: 'Watch & links' }),
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

    for (const entry of DEFAULT_LINKS) {
      if (entry.needs && (values[entry.needs] === undefined || values[entry.needs] === null || values[entry.needs] === '')) continue;
      if (missingPlaceholders(entry.url, values).length) continue;
      linksRow.append(
        chip({
          label: entry.label,
          href: fillTemplate(entry.url, values),
          template: entry.url,
          primary: entry.id === 'justwatch',
        }),
      );
    }

    for (const entry of getCustomLinks()) {
      if (!/^https?:\/\//i.test(entry.url)) continue;
      if (missingPlaceholders(entry.url, values).length) continue;
      linksRow.append(chip({ label: entry.label, href: fillTemplate(entry.url, values), template: entry.url }));
    }

    const add = el('button', { class: 'ogt-chip', type: 'button', text: '+ Add link' });
    add.addEventListener('click', () => promptAddCustomLink());
    linksRow.append(add);
  }

  function persistSelection() {
    if (selection.season != null) setSelection(meta.kind, meta.id, selection);
  }

  const seasonSelect = el('select', { class: 'ogt-select', 'aria-label': 'Season' });
  const episodeSlot = el('span', { class: 'ogt-episode' });
  const seasonField = el('label', { class: 'ogt-field' }, 'Season', seasonSelect);
  const episodeField = el('label', { class: 'ogt-field' }, 'Episode', episodeSlot);
  const trailerButton = el('button', { class: 'ogt-chip', type: 'button', text: 'Watch trailer' });
  trailerButton.addEventListener('click', () => openTrailer(trailerButton));
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
    controlsRow.replaceChildren(seasonField, episodeField, trailerButton);
    controlsBuilt = true;
  }

  function renderEpisodeField() {
    const season = seasons.find((entry) => entry.number === selection.season);
    const count = season?.episodes || null;
    if (selection.episode == null || (count && selection.episode > count)) selection.episode = 1;

    if (count) {
      const select = el(
        'select',
        { class: 'ogt-select', 'aria-label': 'Episode' },
        Array.from({ length: count }, (_, index) =>
          el('option', {
            value: String(index + 1),
            text: `Episode ${index + 1}`,
            selected: index + 1 === selection.episode,
          }),
        ),
      );
      select.addEventListener('change', () => {
        selection.episode = Number(select.value) || 1;
        persistSelection();
        updateLinkHrefs();
      });
      episodeSlot.replaceChildren(select);
      return;
    }

    const input = el('input', {
      class: 'ogt-select',
      type: 'number',
      min: '1',
      value: String(selection.episode || 1),
      'aria-label': 'Episode',
      style: 'inline-size: 5.5rem',
    });
    input.addEventListener('change', () => {
      selection.episode = Math.max(1, Number(input.value) || 1);
      persistSelection();
      updateLinkHrefs();
    });
    episodeSlot.replaceChildren(input);
  }

  function renderControls() {
    ensureControls();

    const hasSeasons = meta.kind === 'show' && seasons.length > 0;
    seasonField.hidden = !hasSeasons;
    episodeField.hidden = !hasSeasons;
    controlsRow.hidden = false;
    if (!hasSeasons) return;

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

  async function openTrailer(button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Loading…';

    try {
      if (!getClientId()) {
        const entered = window.prompt(
          'Trailers use the free Trakt API and need a client ID.\n\n' +
            'Create an app at https://app.trakt.tv/settings/apps (any redirect URI), then paste its Client ID here.',
          '',
        );
        if (!entered) return;
        setClientId(entered);
      }

      const trailer = await getTrailer(meta.kind, meta.id);
      if (cancelled) return;
      if (!trailer) {
        toast('No trailer found for this title.');
        return;
      }
      showTrailer(trailer);
    } catch (error) {
      if (cancelled) return;
      if (isAuthError(error)) toast('Trakt rejected that client ID. Set a valid one from the userscript menu.');
      else toast('Could not load the trailer.');
      debugError('trailer failed', error);
    } finally {
      if (!cancelled && button.isConnected) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  }

  /** Season cards can be lazy-rendered, so re-read the DOM for a moment. */
  function loadSeasons() {
    if (meta.kind !== 'show') return;

    seasons = readSeasons(document);
    if (seasons.length) {
      renderControls();
      return;
    }

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
      else loadSeasonsFromApi();
    };
    timers.push(setTimeout(retry, 400));
  }

  function loadSeasonsFromApi() {
    if (cancelled || !getClientId() || seasons.length) return;
    getSeasons(meta.id)
      .then((list) => {
        if (cancelled || seasons.length || !list.length) return;
        seasons = list;
        renderControls();
      })
      .catch((error) => debugError('season lookup failed', error));
  }

  function onRefresh() {
    renderLinks();
    if (controlsRow.hidden) loadSeasons();
  }

  renderLinks();
  renderControls();
  loadSeasons();
  document.addEventListener('ogt:refresh', onRefresh);

  return {
    node,
    destroy() {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      document.removeEventListener('ogt:refresh', onRefresh);
      node.remove();
    },
  };
}

export const watchNow = {
  id: 'watch-now',
  match: (route) => route.name === 'title',
  mount(route) {
    if (document.getElementById(PANEL_ID)) return null;

    const point = findMountPoint();
    if (!point) return null;

    const meta = readTitleData(document, route);
    if (!meta.title && !meta.tmdb && !meta.imdb) return null;

    const panel = createPanel(meta);
    if (point.before) point.parent.insertBefore(panel.node, point.before);
    else point.parent.append(panel.node);

    return panel;
  },
};
