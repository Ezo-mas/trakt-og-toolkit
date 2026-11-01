import { rememberNativeResources, nativeRootImports, discoverNativeModule } from './native-modules.js';

let discovery;
export const rememberToastResources = rememberNativeResources;

export function nativeToastImports(source, layoutUrl, loaded) {
  return nativeRootImports(source, layoutUrl, loaded, alias =>
    source.includes(`${alias}.dismiss(`) && source.includes(`${alias}.list`));
}
export function isNativeToastStore(source) {
  return source.length < 16000 && /\bget\s+list\s*\(/.test(source) &&
    /\bsuccess\s*:/.test(source) && /\berror\s*:/.test(source) && /\bdismiss\s*:/.test(source);
}

async function discover() {
  return document.querySelector('.toaster') ? discoverNativeModule(nativeToastImports, isNativeToastStore) : null;
}

/** Page-realm import reuses OG's existing Svelte singleton; a sandbox import would create a separate store. */
export async function tryNativeToast(message, active = () => true) {
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
