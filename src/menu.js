/** Tampermonkey/Violentmonkey menu entries. No-ops when the API is absent. */
import { promptAddCustomLink, promptRemoveCustomLink, promptClientId } from './actions.js';
import { applyDebugSetting, isDebug, setDebug, getClientId, getCustomLinks, isFeatureEnabled, setFeatureEnabled } from './settings.js';
import { cacheSize, clearCache } from './core/http.js';
import { registerAuthMenu } from './oauth-menu.js';
import { ping } from './core/trakt.js';
import { toast } from './ui/shell.js';
import { STORAGE, onRemoteValueChange } from './core/store.js';
import { NAME, VERSION } from './meta.js';

const ATTRIBUTION = `${NAME} uses Trakt but is not endorsed or certified by Trakt.`;

export const FEATURE_LABELS = {
  'custom-links': 'Custom links',
  'season-chart': 'Season chart',
  'summary-ratings': 'Trakt ratings chart',
  'your-ratings': 'Your ratings',
  playback: 'Paused playback',
  pronunciation: 'Name pronunciation',
  library: 'Add to library',
  watchlist: 'Add to watchlist',
  'watchlist-cards': 'Watchlist card shortcuts',
  'watchlist-credits': 'Watchlist credit shortcuts',
  'watchlist-pick': 'Watchlist pick',
  'csv-export': 'CSV export',
  'month-review': 'Last month in review',
  'all-lists': 'All lists',
  'list-preview': 'List preview titles',
};

/** @param {() => string} getRouteKey */
export function registerMenu(getRouteKey = () => location.pathname, features = []) {
  if (typeof GM_registerMenuCommand !== 'function') return;

  GM_registerMenuCommand('About', () => {
    toast(`${NAME} v${VERSION}`, { duration: 5000 });
    console.info(`[OGT] ${NAME} v${VERSION}\n${ATTRIBUTION}\nMIT licensed.`);
  });
  GM_registerMenuCommand('Set API client ID', promptClientId);
  GM_registerMenuCommand('Test API connection', async () => {
    if (!getClientId()) {
      toast('No client ID yet — use "Set API client ID" first.');
      return;
    }
    toast('Testing the Trakt API…', { duration: 1500 });
    try {
      const ms = await ping();
      toast(`Trakt API OK — ${ms} ms.`);
      console.info(`[OGT] Trakt API OK in ${ms} ms`);
    } catch (error) {
      const reason =
        error?.status === 401 || error?.status === 403
          ? 'the client ID was rejected'
          : error?.status
            ? `HTTP ${error.status}`
            : error?.message || 'network error';
      toast(`Trakt API failed — ${reason}.`);
      console.warn('[OGT] Trakt API failed', error);
    }
  });
  registerAuthMenu();
  GM_registerMenuCommand('Add custom link', promptAddCustomLink);
  GM_registerMenuCommand('Remove custom link', promptRemoveCustomLink);
  GM_registerMenuCommand('Diagnostics', () => {
    const summary =
      `v${VERSION} · ${getRouteKey()} · client ID ${getClientId() ? 'set' : 'missing'} · ` +
      `${getCustomLinks().length} custom links · ${cacheSize()} cached responses`;
    toast(summary);
    console.info('[OGT]', summary);
  });
  GM_registerMenuCommand('Clear API cache', () => {
    clearCache();
    toast('API cache cleared.');
  });
  registerToggles(features);
  // Another tab can switch a feature or debug logging; keep this tab's labels honest.
  onRemoteValueChange(STORAGE.features, () => registerToggles(features));
  onRemoteValueChange(STORAGE.debug, () => registerToggles(features));
}

const ON = '✅';
const OFF = '⬜';
let toggleIds = [];

/** `GM_unregisterMenuCommand` lets the labels follow the state; without it they keep the plain "Toggle" wording. */
function canRelabel() {
  return typeof GM_unregisterMenuCommand === 'function';
}

export function toggleCaption(label, enabled, relabel = canRelabel()) {
  return relabel ? `${enabled ? ON : OFF} ${label}` : `Toggle ${label}`;
}

/**
 * Debug logging and one toggle per feature, last in the menu so re-registering them keeps their order. Disabled ids
 * are stored, so new features stay on by default.
 */
function registerToggles(features) {
  const relabel = canRelabel();
  if (relabel) for (const id of toggleIds) GM_unregisterMenuCommand(id);
  else if (toggleIds.length) return;
  toggleIds = [];
  const add = (label, enabled, onClick) => {
    const caption = toggleCaption(label, enabled, relabel);
    const id = GM_registerMenuCommand(caption, () => {
      onClick();
      if (relabel) registerToggles(features);
    }, { autoClose: false });
    // Older Violentmonkey builds return nothing and unregister by caption.
    toggleIds.push(id ?? caption);
  };

  add('Debug logging', isDebug(), () => {
    const next = setDebug(!isDebug());
    applyDebugSetting();
    toast(next ? 'Debug logging on — check the console.' : 'Debug logging off.');
  });
  for (const feature of features) {
    const label = FEATURE_LABELS[feature.id] || feature.id.replace(/-/g, ' ');
    add(label, isFeatureEnabled(feature.id), () => {
      const enabled = setFeatureEnabled(feature.id, !isFeatureEnabled(feature.id));
      toast(`${label} ${enabled ? 'on' : 'off'}.`);
      document.dispatchEvent(new CustomEvent('ogt:featurechange', { detail: { id: feature.id, enabled } }));
    });
  }
}
