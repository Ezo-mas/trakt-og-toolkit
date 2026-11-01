import { nativeRootImports, discoverNativeModule } from '../../ui/native-modules.js';

let discovery;

export function nativeLibraryImports(source, layoutUrl, loaded) {
  return nativeRootImports(source, layoutUrl, loaded, alias =>
    ['start', 'stop', 'recheck'].every(method => source.includes(`${alias}.${method}(`)));
}

export function isNativeLibraryStore(source) {
  return source.length < 50000 && ['state', 'collectionCounts', 'refresh', 'recheck', 'patch']
    .every(name => new RegExp(`\\b${name}\\s*:`).test(source));
}

/** Ask OG to reread its own account, not to apply toolkit results to its local state. */
export function createNativeLibraryRefresh() {
  const pending = new Set();
  const prepare = async (route, { active = () => true } = {}) => {
    if (route.name !== 'title' || !['movie', 'show'].includes(route.kind) || !active() ||
        !document.querySelector('header.top-nav .profile')) return null;
    const url = await (discovery ??= discoverNativeModule(nativeLibraryImports, isNativeLibraryStore));
    return active() && document.querySelector('header.top-nav .profile') ? url : null;
  };
  return {
    // Resolve cached public modules during the save; native account reads still start only after success.
    prepare,
    async refresh(route, { active = () => true } = {}) {
      const url = await prepare(route, { active });
      if (!url) return false;
      return new Promise(resolve => {
        const id = `ogt:library-refresh:${crypto.randomUUID()}`;
        const script = document.createElement('script');
        const pagePath = location.pathname;
        script.id = id;
        let settled = false;
        const finish = result => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          document.removeEventListener(id, answered);
          document.removeEventListener('ogt:authchange', cancel);
          window.removeEventListener('popstate', cancel);
          script.remove();
          pending.delete(cancel);
          resolve(result && active());
        };
        const cancel = () => finish(false);
        const answered = event => finish(event.detail === 'refreshed');
        const timer = setTimeout(cancel, 10000);
        pending.add(cancel);
        document.addEventListener(id, answered);
        document.addEventListener('ogt:authchange', cancel);
        window.addEventListener('popstate', cancel);
        script.type = 'module';
        script.onerror = cancel;
        script.textContent = `(async () => {
          let result = 'unavailable';
          try {
            const module = await import(${JSON.stringify(url)});
            const store = Object.values(module).find(value => value &&
              ['state', 'collectionCounts', 'refresh', 'recheck', 'patch'].every(key => typeof value[key] === 'function'));
            if (store && document.getElementById(${JSON.stringify(id)}) &&
                location.pathname === ${JSON.stringify(pagePath).replace(/</g, '\\u003c')} &&
                document.querySelector('header.top-nav .profile')) {
              await store.refresh();
              result = 'refreshed';
            }
          } catch {}
          document.dispatchEvent(new CustomEvent(${JSON.stringify(id)}, { detail: result }));
        })();`;
        document.head.append(script);
      });
    },
    destroy() { for (const cancel of [...pending]) cancel(); },
  };
}
