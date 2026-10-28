/** Prompts shared by the panel and the userscript menu. */
import { addCustomLink, removeCustomLink, getCustomLinks, setClientId, getClientId } from './settings.js';
import { toast } from './ui/shell.js';

const PLACEHOLDER_HELP =
  'Placeholders: {title} {year} {tmdb} {imdb} {type} {season} {episode} {id}';

/** Ask for a "Label | URL template" pair and store it. */
export function promptAddCustomLink() {
  const answer = window.prompt(
    `Add a custom link as "Label | URL".\n\n${PLACEHOLDER_HELP}`,
    'My service | https://example.com/watch/{tmdb}?s={season}&e={episode}',
  );
  if (!answer) return null;

  const separator = answer.indexOf('|');
  if (separator < 0) {
    toast('Use "Label | URL" — the | separator is missing.');
    return null;
  }

  const label = answer.slice(0, separator).trim();
  const url = answer.slice(separator + 1).trim();
  if (!label || !url) {
    toast('Both a label and a URL are required.');
    return null;
  }
  if (!/^https?:\/\//i.test(url)) {
    toast('The URL must start with http:// or https://.');
    return null;
  }

  addCustomLink({ label, url });
  toast(`Link "${label}" added.`);
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
  return { label, url };
}

export function promptRemoveCustomLink() {
  const links = getCustomLinks();
  if (!links.length) {
    toast('No custom links to remove.');
    return;
  }

  const answer = window.prompt(
    `Type the label of the link to remove:\n\n${links.map((entry) => `• ${entry.label}`).join('\n')}`,
    links[0].label,
  );
  if (!answer) return;

  const next = removeCustomLink(answer.trim());
  if (next.length === links.length) toast(`No link labelled "${answer.trim()}".`);
  else toast('Link removed.');
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
}

export function promptClientId() {
  const answer = window.prompt(
    'Paste your Trakt API client ID.\n\n' +
      'Create a free app at https://app.trakt.tv/settings/apps — the redirect URI can be anything, ' +
      'since this script only calls public endpoints.\n\nCurrent: ' +
      (getClientId() || '(none)'),
    getClientId(),
  );
  if (answer === null) return;

  const clean = setClientId(answer);
  toast(clean ? 'Client ID saved.' : 'Client ID cleared.');
  document.dispatchEvent(new CustomEvent('ogt:refresh'));
}
