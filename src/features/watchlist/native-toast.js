import { debugError } from '../../core/log.js';

let earlyResources = [];
let discovery;
export function rememberToastResources(names) { earlyResources = [...names]; }

const chunkUrl = (value, base) => {
  try {
    const url = new URL(value, base);
    return url.origin === new URL(base).origin && /^\/_app\/immutable\/chunks\/[\w.-]+\.js$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
};

/** Find the store imported by the root layout's actual Toaster, without fixing build hashes or export aliases. */
export function nativeToastImports(source, layoutUrl, loaded) {
  const result = [];
  for (const match of source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const url = chunkUrl(match[2], layoutUrl);
    if (!url || !loaded.includes(url)) continue;
    for (const spec of match[1].split(',')) {
      const alias = spec.trim().split(/\s+as\s+/).at(-1);
      if (!/^[\w$]+$/.test(alias)) continue;
      if (source.includes(`${alias}.dismiss(`) && source.includes(`${alias}.list`)) result.push(url);
    }
  }
  return [...new Set(result)];
}
export function isNativeToastStore(source) {
  return source.length < 16000 && /\bget\s+list\s*\(/.test(source) &&
    /\bsuccess\s*:/.test(source) && /\berror\s*:/.test(source) && /\bdismiss\s*:/.test(source);
}

async function discover() {
  if (!document.querySelector('.toaster')) return null;
  const names = [...new Set([...earlyResources, ...(performance.getEntriesByType?.('resource') ?? []).map(entry => entry.name)])];
  const layout = names.find(name => {
    try { const url = new URL(name); return url.origin === location.origin && /^\/_app\/immutable\/nodes\/0\.[\w-]+\.js$/.test(url.pathname); }
    catch { return false; }
  });
  if (!layout) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  const read = async url => {
    // Public, already-loaded static assets only. No session credentials or authenticated requests.
    const response = await fetch(url, { cache: 'force-cache', credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error('Native toast module unavailable.');
    return response.text();
  };
  try {
    const source = await read(layout);
    for (const url of nativeToastImports(source, layout, names)) {
      if (isNativeToastStore(await read(url))) return url;
    }
  } catch (error) { debugError('native toast discovery failed', error); }
  finally { clearTimeout(timer); }
  return null;
}

/** Page-realm import reuses OG's existing Svelte singleton; a sandbox import would create a separate store. */
export async function tryNativeWatchlistToast(message, active = () => true) {
  if (!active()) return false;
  const url = await (discovery ??= discover());
  if (!url || !active() || !document.querySelector('.toaster')) return false;
  return new Promise(resolve => {
    const eventName = `ogt:watchlist-toast:${crypto.randomUUID()}`;
    const script = document.createElement('script');
    let settled = false;
    const finish = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      document.removeEventListener(eventName, answered);
      script.remove();
      resolve(ok);
    };
    const answered = event => finish(event.detail === 'shown');
    const timer = setTimeout(() => finish(false), 1000);
    document.addEventListener(eventName, answered);
    script.type = 'module';
    script.onerror = () => finish(false);
    script.textContent = `(async () => {
      let result = 'unavailable';
      try {
        const module = await import(${JSON.stringify(url)});
        const store = Object.values(module).find(value => value && typeof value.success === 'function' &&
          typeof value.dismiss === 'function' && Array.isArray(value.list));
        if (store && document.querySelector('.toaster')) { store.success(${JSON.stringify(message).replace(/</g, '\\u003c')}); result = 'shown'; }
      } catch {}
      document.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)}, { detail: result }));
    })();`;
    document.head.append(script);
  });
}
