/** Static checks for the public og modules the toolkit bridges to. No page realm, no sign-in. */
import { nativeToastImports, isNativeToastStore } from '../src/ui/native-toast.js';
import { nativeLibraryImports, isNativeLibraryStore } from '../src/features/library/native-refresh.js';

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

/**
 * Finds the root layout from a live page, reads its static imports and validates the
 * toast and library stores used by the native bridges. Returns drift details.
 */
export async function checkNativeModules({ html, pageUrl, read }) {
  let layoutUrl = nodeModulePath(html, pageUrl);
  if (!layoutUrl) {
    const appPath = appEntryPath(html);
    if (!appPath) return ['native modules: root layout not found'];
    const appUrl = new URL(appPath, pageUrl).href;
    let appSource;
    try { appSource = await read(appUrl); }
    catch (error) { return [`native modules: ${error.message}`]; }
    layoutUrl = nodeModulePath(appSource, appUrl);
  }
  if (!layoutUrl) return ['native modules: root layout not found'];

  let layout;
  try { layout = await read(layoutUrl); }
  catch (error) { return [`native modules: ${error.message}`]; }
  const loaded = staticImportUrls(layout, layoutUrl);
  const details = [];
  const toast = await validate('native toast', nativeToastImports(layout, layoutUrl, loaded), isNativeToastStore, read);
  if (toast) details.push(toast);
  const library = await validate('native library refresh', nativeLibraryImports(layout, layoutUrl, loaded), isNativeLibraryStore, read);
  if (library) details.push(library);
  return details;
}
