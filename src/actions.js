/** Prompts shared by the panel and the userscript menu. */
import {
  addCustomLink,
  removeCustomLink,
  getCustomLinks,
  setClientId,
  getClientId,
  isCustomLinkUrl,
} from './settings.js';
import { toast } from './ui/shell.js';
import { promptDialog } from './ui/dialog.js';

const PLACEHOLDER_HELP =
  'Placeholders: {title} {year} {tmdb} {imdb} {imdbnum} {episodeimdb} {episodeimdbnum} {tvdb} {type} {season} {episode} {id} {plural}\n' +
  'Server hosts: {jellyfin} {emby} {radarr} {sonarr} {seerr}';

/** Split "Label | URL"; returns an error message or the parts. */
function parseCustomLink(answer) {
  const separator = answer.indexOf('|');
  if (separator < 0) return { error: 'Use "Label | URL": the | separator is missing.' };
  const label = answer.slice(0, separator).trim();
  const url = answer.slice(separator + 1).trim();
  if (!label || !url) return { error: 'Both a label and a URL are required.' };
  if (!isCustomLinkUrl(url)) return { error: 'The URL must start with http://, https://, or a server placeholder.' };
  return { label, url };
}

/** Ask for a "Label | URL template" pair and store it. */
export async function promptAddCustomLink() {
  const answer = await promptDialog(`Enter it as "Label | URL".\n\n${PLACEHOLDER_HELP}`, {
    title: 'Add custom link', label: 'Label | URL', ok: 'Add link',
    value: 'My service | https://example.com/watch/{tmdb}?s={season}&e={episode}',
    validate: (text) => parseCustomLink(text).error ?? null,
  });
  if (!answer) return null;
  const { label, url, error } = parseCustomLink(answer);
  if (error) { toast(error); return null; }

  addCustomLink({ label, url });
  toast(`Link "${label}" added.`);
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
  return { label, url };
}

export async function promptRemoveCustomLink() {
  const links = getCustomLinks();
  if (!links.length) {
    toast('No custom links to remove.');
    return;
  }

  const answer = await promptDialog(`Type the label of the link to remove:\n\n${links.map((entry) => `• ${entry.label}`).join('\n')}`, {
    title: 'Remove custom link', label: 'Label', ok: 'Remove', value: links[0].label,
    validate: (text) => links.some((entry) => entry.label === text.trim()) ? null : `No link labelled "${text.trim()}".`,
  });
  if (!answer) return;

  const next = removeCustomLink(answer.trim());
  if (next.length === links.length) toast(`No link labelled "${answer.trim()}".`);
  else toast('Link removed.');
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
}

export async function promptClientId() {
  const answer = await promptDialog(
    'Paste your Trakt API client ID. Create a free app at https://app.trakt.tv/settings/apps. The redirect URI ' +
      'can be anything, since this script only calls public endpoints. Leave it empty to clear it.',
    { title: 'Trakt API client ID', label: 'Client ID', ok: 'Save', value: getClientId(), placeholder: '(none)' },
  );
  if (answer === null) return;

  const clean = setClientId(answer);
  toast(clean ? 'Client ID saved.' : 'Client ID cleared.');
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
}
