/** Tampermonkey/Violentmonkey menu entries. No-ops when the API is absent. */
import { promptAddCustomLink, promptRemoveCustomLink, promptClientId } from './actions.js';
import { applyDebugSetting, isDebug, setDebug, getClientId, getCustomLinks } from './settings.js';
import { cacheSize, clearCache } from './core/http.js';
import { registerAuthMenu } from './oauth-menu.js';
import { ping } from './core/trakt.js';
import { toast } from './ui/shell.js';
import { NAME, VERSION } from './meta.js';

const ATTRIBUTION = `${NAME} uses Trakt but is not endorsed or certified by Trakt.`;

/** @param {() => string} getRouteKey */
export function registerMenu(getRouteKey = () => location.pathname) {
  if (typeof GM_registerMenuCommand !== 'function') return;

  registerAuthMenu();

  GM_registerMenuCommand('Trakt OG Toolkit: about', () => {
    toast(`${NAME} v${VERSION}`, { duration: 5000 });
    console.info(`[OGT] ${NAME} v${VERSION}\n${ATTRIBUTION}\nMIT licensed.`);
  });
  GM_registerMenuCommand('Trakt OG Toolkit: set API client ID', promptClientId);
  GM_registerMenuCommand('Trakt OG Toolkit: test API connection', async () => {
    if (!getClientId()) {
      toast('No client ID yet — use "set API client ID" first.');
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
