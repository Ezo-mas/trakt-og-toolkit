import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { getClientId, getCustomLinks, setSelection } from '../../settings.js';
import { getSeasons } from '../../core/trakt.js';
import { mergeSeasons, readSeasons } from './data.js';
import { presetTemplateUrls } from './presets.js';

function seasonLabel(number) {
  return number === 0 ? 'Specials' : `Season ${number}`;
}

export function createPicker(state) {
  const { meta, fixedSelection, selection, controlsRow, timers } = state;

  function needsSelection() {
    return !fixedSelection && getCustomLinks().some((entry) =>
      presetTemplateUrls(entry.url, meta.kind).some((template) => /\{(?:season|episode)\}/.test(template)));
  }

  function persistSelection() {
    if (!fixedSelection && selection.season != null) setSelection(meta.kind, meta.id, selection);
  }

  const seasonSelect = el('select', { class: 'ogt-select', 'aria-label': 'Season' });
  const episodeSlot = el('span', { class: 'ogt-episode' });
  const seasonField = el('label', { class: 'ogt-field' }, el('span', { class: 'ogt-visually-hidden', text: 'Season' }), seasonSelect);
  const episodeField = el('label', { class: 'ogt-field' }, el('span', { class: 'ogt-visually-hidden', text: 'Episode' }), episodeSlot);
  let controlsBuilt = false;

  function ensureControls() {
    if (controlsBuilt) return;
    seasonSelect.addEventListener('change', () => {
      selection.season = Number(seasonSelect.value);
      selection.episode = 1;
      persistSelection();
      renderEpisodeField();
      state.renderLinks();
    });
    controlsRow.replaceChildren(seasonField, episodeField);
    controlsBuilt = true;
  }

  function renderEpisodeField() {
    const season = state.seasons.find((entry) => entry.number === selection.season);
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
          state.renderLinks();
        } else {
          input.value = String(selection.episode);
        }
      });
      // A bare number box would read as just "1"; the select's options already say "Episode 1".
      episodeSlot.replaceChildren(el('span', { class: 'ogt-field-prefix', 'aria-hidden': 'true', text: 'Ep.' }), input);
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
      state.renderLinks();
    });
    episodeSlot.replaceChildren(select);
  }

  function renderControls() {
    const hasSeasons = !fixedSelection && meta.kind === 'show' && state.seasons.length > 0 && needsSelection();
    if (!hasSeasons) {
      controlsRow.hidden = true;
      return;
    }

    ensureControls();
    seasonField.hidden = false;
    episodeField.hidden = false;
    controlsRow.hidden = false;

    const available = state.seasons.map((season) => season.number);
    if (selection.season == null || !available.includes(selection.season)) {
      selection.season = available.includes(1) ? 1 : available[0];
    }

    if (seasonSelect.options.length !== state.seasons.length) {
      seasonSelect.replaceChildren(
        ...state.seasons.map((season) => el('option', { value: String(season.number), text: seasonLabel(season.number) })),
      );
    }

    seasonSelect.value = String(selection.season);
    renderEpisodeField();
    // Re-render so templates that need {season}/{episode} appear now that they have values.
    state.renderLinks();
  }

  /** Trakt's API policy asks apps to use documented endpoints rather than read the site. When a client
   *  ID is configured, the API is the source of truth; the rendered season cards are only the instant
   *  first paint (and the fallback when there is no key). */
  function loadSeasons() {
    if (meta.kind !== 'show' || fixedSelection) return;

    state.seasons = readSeasons(document);
    if (state.seasons.length) renderControls();

    if (!getClientId()) {
      if (!state.seasons.length) retryFromDom();
      return;
    }

    getSeasons(meta.id)
      .then((list) => {
        if (state.cancelled || !list.length) return;
        state.seasons = mergeSeasons(list, state.seasons);
        renderControls();
      })
      .catch((error) => {
        debugError('season lookup failed', error);
        if (!state.cancelled && !state.seasons.length) retryFromDom();
      });
  }

  /** Season cards can be lazy-rendered, so re-read the DOM for a moment. */
  function retryFromDom() {
    let attempt = 0;
    const retry = () => {
      if (state.cancelled) return;
      state.seasons = readSeasons(document);
      if (state.seasons.length) {
        renderControls();
        return;
      }
      attempt += 1;
      if (attempt < 4) timers.push(setTimeout(retry, 400 * attempt));
    };
    timers.push(setTimeout(retry, 400));
  }

  return { needsSelection, renderControls, loadSeasons, destroy() {
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
  } };
}
