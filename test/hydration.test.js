import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import {
  isModuleResource,
  readRouteNodeIds,
  routeNodeId,
  watchModuleResources,
} from '../src/core/hydration.js';

function docWithScripts(scripts) {
  const window = new Window({ url: 'https://og.trakt.tv/movies/verity-2026' });
  for (const source of scripts) {
    const script = window.document.createElement('script');
    script.textContent = source;
    window.document.body.append(script);
  }
  return window;
}

test('reads the route node ids from SvelteKit inline bootstrap script', (t) => {
  const window = docWithScripts([
    'console.log("not the bootstrap")',
    'kit.start(app, element, { node_ids: [0, 1, 50], data: [] });',
  ]);
  t.after(() => window.close());

  assert.deepEqual(readRouteNodeIds(window.document), [1, 50]);
});

test('returns no ids when the page is not bootstrapped by SvelteKit', (t) => {
  const window = docWithScripts(['console.log("plain page")']);
  t.after(() => window.close());

  assert.deepEqual(readRouteNodeIds(window.document), []);
});

test('recognises SvelteKit module and route node resources', () => {
  assert.equal(
    isModuleResource('https://og.trakt.tv/_app/immutable/nodes/50.CdMLLo3_.js'),
    true,
  );
  assert.equal(
    isModuleResource('https://og.trakt.tv/_app/immutable/chunks/D8NKahmi.js?v=1'),
    true,
  );
  assert.equal(isModuleResource('https://og.trakt.tv/_app/immutable/assets/Icon.I1qKja_D.css'), false);
  assert.equal(isModuleResource('https://og.trakt.tv/_app/immutable/entry/app.BwW2BTd1.js'), false);

  assert.equal(routeNodeId('https://og.trakt.tv/_app/immutable/nodes/50.CdMLLo3_.js'), 50);
  assert.equal(routeNodeId('https://og.trakt.tv/_app/immutable/chunks/D8NKahmi.js'), null);
});

test('watchModuleResources keeps its own copy of module entries', () => {
  const moduleEntry = { name: 'https://og.trakt.tv/_app/immutable/nodes/50.CdMLLo3_.js' };
  const chunkEntry = { name: 'https://og.trakt.tv/_app/immutable/chunks/D8NKahmi.js?v=1' };
  const cssEntry = { name: 'https://og.trakt.tv/_app/immutable/assets/Icon.I1qKja_D.css' };
  const observers = [];

  class FakeObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }

  const win = {
    performance: { getEntriesByType: () => [moduleEntry, cssEntry] },
    PerformanceObserver: FakeObserver,
  };

  const watch = watchModuleResources(win);
  assert.equal(watch.entries.size, 1);
  assert.equal(watch.entries.get(moduleEntry.name), moduleEntry);

  // Entries arriving after the watcher started are recorded too.
  observers[0].callback({ getEntries: () => [chunkEntry, cssEntry] });
  assert.equal(watch.entries.size, 2);
  assert.equal(watch.entries.get(chunkEntry.name), chunkEntry);

  watch.stop();
  assert.equal(observers[0].disconnected, true);
});
