import { debugError } from '../../core/log.js';
import { getClientId, getCustomLinks, getServers } from '../../settings.js';
import { personTemplateVars, templateVars, showTemplateData } from './data.js';
import { presetTemplateUrls } from './presets.js';
import { getEpisode, getShowDetails } from './api.js';

export function createLookups(state) {
  const { meta, route, selection, fixedSelection } = state;

  // Episode IMDb ids from the API, by "season:episode": the picker on a show page (and an episode page whose IMDb link
  // og didn't render) has no other source for them. `null` means looked up (or in flight) without an id.
  const episodeImdbs = new Map();
  const episodeKey = () => `${selection.season}:${selection.episode}`;
  const vars = () => meta.kind === 'person'
    ? personTemplateVars(meta)
    : templateVars(
      meta.episodeImdb ? meta : { ...meta, episodeImdb: episodeImdbs.get(episodeKey()) ?? null },
      selection,
      getServers(),
    );

  let showRequested = false;
  /** Season/episode pages: fetch the show once a link needs what og's page doesn't give (the show's year, an episode
   *  page's IMDb id). This runs on every render, so a link added in the editor triggers it too. Without a client ID
   *  those links stay hidden rather than point at the season or episode. */
  function lookUpShow() {
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
      .catch((error) => { if (!state.cancelled) debugError('show lookup failed', error); });
  }

  /** The picked episode's own IMDb id, so IMDb and OpenSubtitles open that episode rather than its season. Until it
   *  returns (or without a client ID) those links keep their season route. Each episode is asked for once. */
  function lookUpEpisode() {
    if (meta.kind !== 'show' || meta.episodeImdb || !getClientId()) return;
    const { season, episode } = selection;
    if (season == null || episode == null) return;
    const key = episodeKey();
    if (episodeImdbs.has(key)) return;
    if (!getCustomLinks().some((entry) =>
      presetTemplateUrls(entry.url, meta.kind).some((template) => /\{episodeimdb(?:num)?\}/.test(template))))
      return;
    episodeImdbs.set(key, null);
    getEpisode(meta.id, season, episode)
      .then((data) => {
        if (state.cancelled) return;
        const imdb = typeof data?.ids?.imdb === 'string' && /^tt\d+$/.test(data.ids.imdb) ? data.ids.imdb : null;
        episodeImdbs.set(key, imdb);
        if (imdb && key === episodeKey()) state.renderLinks();
      })
      .catch((error) => {
        if (state.cancelled) return;
        episodeImdbs.delete(key); // picking the episode again retries
        debugError('episode lookup failed', error);
      });
  }

  /** Fill in the show's own values once its lookup returns, keeping what og's page already gave. */
  function setMeta(next) {
    if (state.cancelled || !next) return;
    for (const [key, value] of Object.entries(next)) if (value != null) meta[key] = value;
    state.renderLinks();
  }

  return { vars, lookUpShow, lookUpEpisode };
}
