/** OAuth is menu-only; no playback UI or automatic sign-in. */
import { signIn, cancelSignIn, signOut, isSignedIn } from './core/oauth.js';
import { apiAuth } from './core/trakt.js';
import { getClientId } from './settings.js';
import { STORAGE, getPrivateValue, setPrivateValue } from './core/store.js';
import { toast } from './ui/shell.js';

export function registerAuthMenu() {
  GM_registerMenuCommand('Trakt OG Toolkit: sign in', async () => {
    if (!getClientId()) { toast('Set your Trakt client ID first.'); return; }
    if (isSignedIn()) { toast('Already signed in; sign out before changing accounts.'); return; }
    // Refresh's documented payload requires the app's registered redirect URI,
    // even though device authorization itself never redirects the browser.
    const uri = window.prompt('Enter the redirect URI registered for your Trakt app (used for token refresh).',
      getPrivateValue(STORAGE.redirectUri) || '');
    if (uri === null) return;
    if (!/^https:\/\/[^\s]+$/.test(uri.trim())) { toast('Enter your registered HTTPS redirect URI.'); return; }
    try {
      setPrivateValue(STORAGE.redirectUri, uri.trim());
      await signIn({
        onCode: ({ user_code, verification_url }) => {
          // A persistent native prompt keeps the code available without inserting
          // DOM before hydration. Cancel here or use the cancel sign-in menu.
          const answer = window.prompt(`Visit ${verification_url} in another tab and enter this code.\nCancel stops sign-in; OK continues waiting.`, user_code);
          if (answer === null) cancelSignIn();
        },
        onMessage: (message) => toast(message),
      });
    } catch { toast('Sign-in requires userscript GM storage.'); }
  });
  GM_registerMenuCommand('Trakt OG Toolkit: cancel sign-in', cancelSignIn);
  GM_registerMenuCommand('Trakt OG Toolkit: sign out', async () => {
    try { await signOut(); toast('Signed out of Trakt.'); }
    catch { toast('Signed out locally; revoke this app in Trakt settings if needed.'); }
  });
  GM_registerMenuCommand('Trakt OG Toolkit: show signed-in user', async () => {
    if (!isSignedIn()) { toast('Signed out of Trakt.'); return; }
    try {
      const user = await apiAuth('GET', '/users/me');
      // Only display an explicitly selected profile field, never raw responses.
      toast(`Signed in to Trakt as ${user.username || 'a Trakt user'}.`);
    } catch { toast(isSignedIn() ? 'Could not load your Trakt profile.' : 'Trakt session expired; sign in again.'); }
  });
}
