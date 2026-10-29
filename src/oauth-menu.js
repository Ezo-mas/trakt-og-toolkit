/** OAuth is menu-only; no playback UI or automatic sign-in. */
import { signIn, cancelSignIn, signOut, isSignedIn, DEVICE_MESSAGES } from './core/oauth.js';
import { apiAuth } from './core/trakt.js';
import { getClientId } from './settings.js';
import { STORAGE, getPrivateValue, setPrivateValue } from './core/store.js';
import { toast } from './ui/shell.js';

const CODE_TOAST_MS = 10 * 60 * 1000; // Trakt device codes last 10 minutes
const QUIET = new Set([DEVICE_MESSAGES[400], DEVICE_MESSAGES[429]]);

/** Copy without a page click; menu commands don't count as a user gesture for navigator.clipboard. */
function copyText(text) {
  if (typeof GM_setClipboard !== 'function') return false;
  try {
    GM_setClipboard(text, 'text');
    return true;
  } catch {
    return false;
  }
}

/** signIn only passes Trakt's own https URLs, so this can't be pointed elsewhere. */
function openTab(url) {
  if (typeof GM_openInTab !== 'function') return false;
  try {
    GM_openInTab(url, { active: true, insert: true });
    return true;
  } catch {
    return false;
  }
}

export function registerAuthMenu() {
  GM_registerMenuCommand('Trakt OG Toolkit: sign in', async () => {
    if (!getClientId()) { toast('Set your Trakt client ID first.'); return; }
    if (isSignedIn()) { toast('Already signed in; sign out before changing accounts.'); return; }
    // Refresh's documented payload requires the app's registered redirect URI,
    // even though device authorization itself never redirects the browser.
    const uri = window.prompt('Enter the redirect URI registered for your Trakt app (used for token refresh).',
      getPrivateValue(STORAGE.redirectUri) || 'http://localhost:5173/callback');
    if (uri === null) return;
    if (!uri.trim()) { toast('Enter the redirect URI registered for your Trakt app.'); return; }
    try {
      setPrivateValue(STORAGE.redirectUri, uri.trim());
      await signIn({
        // A long toast instead of a native prompt, so the page keeps working while polling.
        // The next sign-in message (signed in, cancelled, expired, …) replaces it.
        onCode: ({ user_code, verification_url }) => {
          const copied = copyText(user_code);
          const opened = openTab(verification_url);
          toast(
            `${copied ? `Code ${user_code} copied; paste it` : `Enter ${user_code}`} at ${verification_url}` +
            `${opened ? ' (opened in a new tab)' : ''}, then come back. Use "cancel sign-in" in the menu to stop.`,
            { duration: CODE_TOAST_MS });
        },
        // Pending and slow-down are expected while waiting; keep the code on screen.
        onMessage: (message) => { if (!QUIET.has(message)) toast(message); },
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
