/** Static checks for the public og modules the toolkit bridges to. No page realm, no token. */
import { nativeToastImports, isNativeToastStore } from '../src/ui/native-toast.js';
import { nativeLibraryImports, isNativeLibraryStore } from '../src/features/library/native-refresh.js';
import { ogSessionKey, OG_SESSION_AUTHORITY, OG_SESSION_CLIENT_ID } from '../src/core/og-session.js';

const originOf = (url) => new URL(url).origin;

/** Every same-origin static import in a layout module. */
export function staticImportUrls(source, baseUrl) {
  const urls = new Set();
  for (const match of source.matchAll(/\bimport\s*(?:\{[^}]*\}|\w+)\s*from\s*["']([^"']+)["']/g)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin === originOf(baseUrl)) urls.add(url.href);
    } catch { /* leave malformed imports to the bundle */ }
  }
  return [...urls];
}

/** The SvelteKit app entry is the only stable link from a page to the root node. */
export function appEntryPath(html) {
  return html.match(/\/_app\/immutable\/entry\/app\.[\w-]+\.js/)?.[0] ?? null;
}

/** Root layout is referenced either absolutely by a page or relatively by the app entry. */
export function nodeModulePath(source, baseUrl) {
  const absolute = source.match(/\/_app\/immutable\/nodes\/0\.[\w-]+\.js/);
  if (absolute) return new URL(absolute[0], baseUrl).href;
  const relative = source.match(/(?:\.\.?\/)+nodes\/0\.[\w-]+\.js/);
  return relative ? new URL(relative[0], baseUrl).href : null;
}

async function validate(label, urls, validateStore, read) {
  if (!urls.length) return `${label}: import not found`;
  // Same as the runtime: every candidate import is read until one validates.
  for (const url of urls) {
    try {
      if (validateStore(await read(url))) return null;
    } catch { /* try the next candidate; report not found below */ }
  }
  return `${label}: store not found`;
}

async function findRootLayout({ html, pageUrl, read }) {
  let layoutUrl = nodeModulePath(html, pageUrl);
  if (!layoutUrl) {
    const appPath = appEntryPath(html);
    if (!appPath) return { error: 'root layout not found' };
    const appUrl = new URL(appPath, pageUrl).href;
    let appSource;
    try { appSource = await read(appUrl); }
    catch (error) { return { error: error.message }; }
    layoutUrl = nodeModulePath(appSource, appUrl);
  }
  if (!layoutUrl) return { error: 'root layout not found' };
  return { url: layoutUrl };
}

/**
 * Finds the root layout from a live page, reads its static imports and validates the
 * toast and library stores used by the native bridges. Returns drift details.
 */
export async function checkNativeModules({ html, pageUrl, read }) {
  const root = await findRootLayout({ html, pageUrl, read });
  if (root.error) return [`native modules: ${root.error}`];

  let layout;
  try { layout = await read(root.url); }
  catch (error) { return [`native modules: ${error.message}`]; }
  const loaded = staticImportUrls(layout, root.url);
  const details = [];
  const toast = await validate('native toast', nativeToastImports(layout, root.url, loaded), isNativeToastStore, read);
  if (toast) details.push(toast);
  const library = await validate('native library refresh', nativeLibraryImports(layout, root.url, loaded), isNativeLibraryStore, read);
  if (library) details.push(library);
  return details;
}

const AUTHORITY_OPTION = /authority:\s*[`"']([^`"']+)[`"']/;
const CLIENT_ID_OPTION = /client_id:\s*[`"']([A-Za-z0-9_-]{8,200})[`"']/;
const USER_STORE_KEY = /user:\$\{[^}]+\}:\$\{[^}]+\}/;
const OIDC_STORE_PREFIX = /[`"']oidc\.[`"']/;

async function readModule(url, read) {
  try { return await read(url); } catch { return null; }
}

/**
 * og's session lives in localStorage under `oidc.user:<authority>:<client_id>`.
 * Checks that og still configures that authority/client ID and that oidc-client-ts
 * still builds its user-store key and `oidc.` prefix the same way. Returns drift details.
 */
export async function checkOgSessionStorage({ html, pageUrl, read }) {
  const root = await findRootLayout({ html, pageUrl, read });
  if (root.error) return [`og session: ${root.error}`];
  const layout = await readModule(root.url, read);
  if (layout == null) return ['og session: root layout unreadable'];

  // The user manager may sit in the layout or in one of its static imports.
  let manager = null;
  let managerUrl = null;
  for (const [source, url] of [[layout, root.url], ...staticImportUrls(layout, root.url).map((url) => [null, url])]) {
    const code = source ?? await readModule(url, read);
    if (!code || !AUTHORITY_OPTION.test(code) || !CLIENT_ID_OPTION.test(code)) continue;
    manager = code;
    managerUrl = url;
    break;
  }
  if (!manager) return ['og session: user manager not found'];

  const authority = manager.match(AUTHORITY_OPTION)[1];
  if (authority !== OG_SESSION_AUTHORITY) return [`og session: authority is ${authority}`];
  const clientId = manager.match(CLIENT_ID_OPTION)[1];
  if (clientId !== OG_SESSION_CLIENT_ID) return [`og session: client ID is ${clientId}`];

  let oidc = null;
  for (const url of staticImportUrls(manager, managerUrl)) {
    const code = await readModule(url, read);
    if (code && USER_STORE_KEY.test(code) && OIDC_STORE_PREFIX.test(code)) { oidc = code; break; }
  }
  if (!oidc) return ['og session: oidc user-store key not found'];

  return ogSessionKey(clientId) === `oidc.user:${authority}:${clientId}` ? [] : ['og session: key shape changed'];
}
