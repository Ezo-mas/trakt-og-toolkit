import { debugError } from '../core/log.js';

let earlyResources = [];
export function rememberNativeResources(names) { earlyResources = [...names]; }

const chunkUrl = (value, base) => {
  try {
    const url = new URL(value, base);
    return url.origin === new URL(base).origin && /^\/_app\/immutable\/chunks\/[\w.-]+\.js$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
};

/** Follow only already-loaded, same-origin root-layout imports with the expected usage. */
export function nativeRootImports(source, layoutUrl, loaded, uses) {
  const result = [];
  for (const match of source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const url = chunkUrl(match[2], layoutUrl);
    if (!url || !loaded.includes(url)) continue;
    for (const spec of match[1].split(',')) {
      const alias = spec.trim().split(/\s+as\s+/).at(-1);
      if (/^[\w$]+$/.test(alias) && uses(alias)) result.push(url);
    }
  }
  return [...new Set(result)];
}

export async function discoverNativeModule(imports, validate) {
  const names = [...new Set([...earlyResources, ...(performance.getEntriesByType?.('resource') ?? []).map(entry => entry.name)])];
  const layout = names.find(name => {
    try { const url = new URL(name); return url.origin === location.origin && /^\/_app\/immutable\/nodes\/0\.[\w-]+\.js$/.test(url.pathname); }
    catch { return false; }
  });
  if (!layout) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  const read = async url => {
    const response = await fetch(url, { cache: 'force-cache', credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error('Native module unavailable.');
    return response.text();
  };
  try {
    const source = await read(layout);
    for (const url of imports(source, layout, names)) if (validate(await read(url))) return url;
  } catch (error) { debugError('native module discovery failed', error); }
  finally { clearTimeout(timer); }
  return null;
}
