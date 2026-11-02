/**
 * Built-bundle test for the all-lists panel on a real-shaped lists page.
 * happy-dom provides the DOM; GM requests are mocked (the endpoints need a client ID).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { LISTS_HTML, LISTS_COLLABORATIONS_JSON, LISTS_LIKED_JSON } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot({ url = 'https://og.trakt.tv/users/justin/lists', storage = {}, gmRequest } = {}) {
  const window = new Window({ url });
  const { document } = window;
  const store = new Map(Object.entries(storage));

  window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  if (gmRequest) window.GM_xmlhttpRequest = gmRequest;

  document.write(`<!doctype html><html><head><title>Test - Trakt OG Redux</title></head><body>${LISTS_HTML}</body></html>`);
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  return { window, document, store };
}

function apiStub(requested, { status = 200, bodyFor } = {}) {
  return (options) => {
    requested.push(options);
    const body = bodyFor ? bodyFor(options.url) : options.url.includes('/lists/collaborations')
      ? LISTS_COLLABORATIONS_JSON
      : LISTS_LIKED_JSON;
    setTimeout(() => options.onload({ status, responseHeaders: '', responseText: body }), 0);
    return { abort() {} };
  };
}

const panel = (document) => document.getElementById('ogt-all-lists');
const toggle = (document) => panel(document)?.querySelector('button.ogt-chip');

test('the personal lists page gets a button that appends both groups on demand', async (t) => {
  const requested = [];
  const { window, document } = boot({
    storage: { 'trakt.clientId': 'test-client' },
    gmRequest: apiStub(requested),
  });
  t.after(() => window.close());
  await wait(50);

  const node = panel(document);
  assert.ok(node, 'panel is mounted');
  assert.equal(document.querySelector('section.lists').nextElementSibling, node, 'panel follows the personal list');
  assert.equal(toggle(document).textContent, 'Show all lists');
  assert.equal(node.querySelector('.ogt-lists__groups').hidden, true, 'groups start closed');

  toggle(document).click();
  await wait(80);

  assert.deepEqual(
    requested.map((request) => new URL(request.url).pathname).sort(),
    ['/users/justin/likes/lists', '/users/justin/lists/collaborations'],
  );
  assert.ok(requested.every((request) => request.headers['trakt-api-key'] === 'test-client'));
  assert.equal(toggle(document).textContent, 'Hide all lists');
  assert.equal(node.querySelector('.ogt-lists__groups').hidden, false);
  assert.deepEqual(
    [...node.querySelectorAll('.ogt-lists__name')].map((link) => link.textContent),
    ['Sci-Fi Together', 'Documentaries', 'Noir Essentials'],
  );
  assert.equal(
    node.querySelector('.ogt-lists__name').getAttribute('href'),
    '/users/justin/lists/sci-fi-together',
  );
  assert.equal(node.querySelector('.ogt-lists__meta').textContent, '12 items · by Justin');
  assert.equal(node.querySelector('.ogt-lists__poster').getAttribute('src'), 'https://media.trakt.tv/images/lists/000/009/001/posters/medium/abc.jpg.webp');
  assert.equal(node.querySelector('[role="status"]').hidden, true, 'no error hint');

  toggle(document).click();
  assert.equal(node.querySelector('.ogt-lists__groups').hidden, true, 'the button collapses the groups');
  toggle(document).click();
  assert.equal(node.querySelector('.ogt-lists__groups').hidden, false, 'and opens them again');
  assert.equal(requested.length, 2, 'reopening does not refetch');

  window.history.pushState({}, '', '/dashboard');
  await wait(300);
  assert.equal(panel(document), null, 'panel is removed on navigation');
});

test('without a client ID the click explains what is missing and sends no request', async (t) => {
  const requested = [];
  const { window, document } = boot({ gmRequest: apiStub(requested) });
  t.after(() => window.close());
  await wait(50);

  toggle(document).click();
  await wait(60);

  assert.equal(requested.length, 0);
  const status = panel(document).querySelector('[role="status"]');
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /client ID/i);
  assert.equal(panel(document).querySelector('.ogt-lists__groups').hidden, true);
  assert.equal(toggle(document).textContent, 'Show all lists', 'the button stays available for a retry');
});

test('an API failure is a one-line hint with a retry, not an error box', async (t) => {
  const requested = [];
  const { window, document } = boot({
    storage: { 'trakt.clientId': 'test-client' },
    gmRequest: apiStub(requested, { status: 404 }),
  });
  t.after(() => window.close());
  await wait(50);

  toggle(document).click();
  await wait(80);

  const node = panel(document);
  const status = node.querySelector('[role="status"]');
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /Couldn’t load collaborations or liked lists/);
  assert.equal(node.querySelector('.ogt-lists__groups').hidden, true);
  assert.equal(toggle(document).textContent, 'Show all lists');
  const retry = [...node.querySelectorAll('button.ogt-chip')].find((button) => button.textContent === 'Try again');
  assert.ok(retry && !retry.hidden, 'a retry button is offered');
});

test('collaborations and liked list pages do not mount the panel', async (t) => {
  for (const path of ['/users/justin/lists/collaborations', '/users/justin/lists/liked']) {
    const window = new Window({ url: `https://og.trakt.tv${path}` });
    const { document } = window;
    window.GM_getValue = (_key, fallback) => fallback;
    window.GM_setValue = () => {};
    window.GM_addStyle = () => {};
    window.GM_registerMenuCommand = () => {};
    document.write(`<!doctype html><html><head><title>Test</title></head><body>${LISTS_HTML}</body></html>`);
    window.eval(bundle);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await wait(50);
    assert.equal(panel(document), null, path);
    window.close();
  }
});
