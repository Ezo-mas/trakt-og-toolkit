/** Tampermonkey/Violentmonkey menu entries. No-ops when the API is absent. */
import { promptAddCustomLink, promptRemoveCustomLink, promptClientId } from './actions.js';
import { applyDebugSetting, isDebug, setDebug, getClientId, getCustomLinks } from './settings.js';
import { cacheSize, clearCache } from './core/http.js';
import { toast } from './ui/shell.js';
import { VERSION } from './meta.js';

/** @param {() => string} getRouteKey */
export function registerMenu(getRouteKey = () => location.pathname) {
  if (typeof GM_registerMenuCommand !== 'function') return;

  GM_registerMenuCommand('Trakt OG Toolkit: set API client ID', promptClientId);
  GM_registerMenuCommand('Trakt OG Toolkit: add custom link', promptAddCustomLink);
  GM_registerMenuCommand('Trakt OG Toolkit: remove custom link', promptRemoveCustomLink);
  GM_registerMenuCommand('Trakt OG Toolkit: toggle debug logging', () => {
    const next = setDebug(!isDebug());
    applyDebugSetting();
    toast(next ? 'Debug logging on — check the console.' : 'Debug logging off.');
  });
  GM_registerMenuCommand('Trakt OG Toolkit: diagnostics', () => {
    const summary =
      `v${VERSION} · ${getRouteKey()} · client ID ${getClientId() ? 'set' : 'missing'} · ` +
      `${getCustomLinks().length} custom links · ${cacheSize()} cached responses`;
    toast(summary);
    console.info('[OGT]', summary);
  });
  GM_registerMenuCommand('Trakt OG Toolkit: clear API cache', () => {
    clearCache();
    toast('API cache cleared.');
  });
}
