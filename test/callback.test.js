import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('callback discards authorization parameters without storing or forwarding them', () => {
  const calls = [];
  runInNewContext(readFileSync(new URL('../site/callback.js', import.meta.url), 'utf8'), {
    location: { pathname: '/trakt-og-toolkit/callback.html', search: '?code=private&state=attempt', hash: '#private' },
    history: { replaceState: (...args) => calls.push(args) },
  });
  assert.deepEqual(calls, [[null, '', '/trakt-og-toolkit/callback.html']]);
});
