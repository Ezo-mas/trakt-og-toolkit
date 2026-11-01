import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { nativeToastImports, isNativeToastStore } from '../src/ui/native-toast.js';
import { showSuccessToast } from '../src/ui/success-notification.js';

test('native toast discovery follows loaded layout imports and stable store properties, not build hashes', () => {
  const layout = 'https://og.trakt.tv/_app/immutable/nodes/0.new-build.js';
  const url = 'https://og.trakt.tv/_app/immutable/chunks/new-toast.js';
  const source = 'import{a as store,b as other}from"../chunks/new-toast.js";store.dismiss(id);store.list;';
  assert.deepEqual(nativeToastImports(source, layout, [url]), [url]);
  assert.deepEqual(nativeToastImports(source, layout, []), []);
  assert.deepEqual(nativeToastImports(source.replace('../chunks/new-toast.js', 'https://example.com/toast.js'), layout, ['https://example.com/toast.js']), []);
  assert.deepEqual(nativeToastImports(source.replace('../chunks/new-toast.js', '../chunks/new-toast.js?secret=value'), layout, [url + '?secret=value']), []);
  assert.equal(isNativeToastStore('const s={get list(){return a},success:show,error:show,dismiss:id=>{}};export{s as x};'), true);
  assert.equal(isNativeToastStore('export const s={success:show,error:show};'), false);
});

test('fallback success notification has native-position classes, close control and independent markup', t => {
  const window = new Window({ url: 'https://og.trakt.tv/movies/test' });
  const saved = {};
  for (const name of ['document', 'Node', 'ResizeObserver']) { saved[name] = globalThis[name]; globalThis[name] = window[name]; }
  const handles = [];
  t.after(() => {
    for (const handle of handles) handle.destroy();
    window.close();
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value;
    }
  });
  window.document.body.innerHTML = '<div class="toaster"><div class="toast success">Native notification</div></div>';
  const native = window.document.querySelector('.toaster').innerHTML;
  const first = showSuccessToast('You added Spider-Man: Brand New Day to your watchlist.'); handles.push(first);
  assert.equal(first.node.getAttribute('role'), 'status');
  assert.equal(first.node.querySelector('p').textContent, 'You added Spider-Man: Brand New Day to your watchlist.');
  assert.ok(first.node.querySelector('.ogt-watchlist-toast__timer'));
  assert.ok(first.node.querySelector('svg[aria-hidden="true"]'));
  assert.ok(first.node.parentElement.classList.contains('ogt-watchlist-toasts'));
  assert.equal(window.document.querySelector('.toaster').innerHTML, native);
  const second = showSuccessToast(); handles.push(second);
  assert.equal(second.node.parentElement.firstElementChild, second.node, 'newest first');
  first.node.querySelector('button[aria-label="Close"]').click();
  assert.equal(first.node.isConnected, false);
  second.destroy();
  assert.equal(window.document.querySelector('.ogt-watchlist-toasts'), null);
  assert.equal(window.document.querySelector('.toaster').innerHTML, native);
});

test('fallback renders punctuation and markup-looking titles as text', t => {
  const window = new Window();
  const saved = {};
  for (const name of ['document', 'Node', 'ResizeObserver']) { saved[name] = globalThis[name]; globalThis[name] = window[name]; }
  const message = 'You added A "title" </script><img src=x onerror=alert(1)> to your watchlist.';
  const handle = showSuccessToast(message);
  t.after(() => {
    handle.destroy(); window.close();
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value;
    }
  });
  assert.equal(handle.node.querySelector('p').textContent, message);
  assert.equal(handle.node.querySelector('img'), null);
});
