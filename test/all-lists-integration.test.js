/** Built-bundle tests for All lists on a captured og lists page; GM storage and API requests are mocked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { ALL_LISTS_HTML } from './fixtures.js';

const bundle = readFileSync(new URL('../dist/trakt-og-toolkit.user.js', import.meta.url), 'utf8');
const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const list = (id, overrides = {}) => ({
  name: `List ${id}`, description: '', privacy: 'public', type: 'personal', item_count: 3, likes: 2,
  allow_comments: true, comment_count: 1, ids: { trakt: id, slug: `list-${id}` },
  user: { username: 'owner', name: 'Owner', ids: { slug: 'owner' } }, images: { posters: [] }, ...overrides,
});

/** Answers by path; `pages` adds Trakt's page-count header to authenticated pages. */
function boot({ url = 'https://og.trakt.tv/users/justin/lists', html = ALL_LISTS_HTML, signedIn = false, clientId = 'client',
  collaborations = [list(1, { privacy: 'link' })], liked = () => [{ liked_at: '2026-11-01T00:00:00Z', list: list(2) }],
  fail = () => false, viewer = 'viewer', viewerLiked = [] } = {}) {
  const window = new Window({ url });
  const store = new Map();
  if (clientId) store.set('trakt.clientId', clientId);
  if (signedIn) {
    store.set('trakt.oauth.tokens', { client_id: 'client', access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 });
  }
  const requests = [];
  window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  window.GM_setValue = (key, value) => store.set(key, value);
  window.GM_deleteValue = (key) => store.delete(key);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  window.IntersectionObserver = undefined; // happy-dom never reports intersections
  window.navigator.clipboard.writeText = async () => {};
  window.GM_xmlhttpRequest = (request) => {
    const { pathname, searchParams } = new URL(request.url);
    requests.push({ pathname, searchParams, auth: Boolean(request.headers?.Authorization) });
    let body = null;
    let headers = '';
    if (pathname.endsWith('/lists/collaborations')) body = typeof collaborations === 'function' ? collaborations() : collaborations;
    else if (pathname === `/users/${viewer}/likes/lists` && viewer !== 'justin') body = viewerLiked;
    else if (pathname.endsWith('/likes/lists')) {
      const page = Number(searchParams.get('page'));
      const result = liked(page);
      body = result.rows ?? result;
      if (result.pages) headers = `x-pagination-page-count: ${result.pages}`;
    } else if (pathname === '/users/me') body = { username: viewer, ids: { slug: viewer } };
    else if (pathname.startsWith('/lists/')) body = { images: { posters: ['media.trakt.tv/images/summary.jpg.webp'] } };
    const status = fail(pathname) ? 404 : 200; // 5xx would be retried
    queueMicrotask(() => request.onload({ status, responseText: JSON.stringify(body), responseHeaders: headers }));
    return { abort() {} };
  };
  window.document.write(`<!doctype html><html><head><title>Lists</title></head><body>${html}</body></html>`);
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document: window.document, requests };
}

const option = (document) => document.querySelector('#ogt-all-lists-option a');
const view = (document) => document.getElementById('ogt-all-lists');
const triggerLabel = (document) => document.querySelector('button[popovertarget]').textContent.replace(/\s+/g, ' ').trim();

test('All lists joins og\'s Lists menu after Collaborations and loads nothing until chosen', async (t) => {
  const { window, document, requests } = boot();
  t.after(() => window.close());
  await wait();
  const link = option(document);
  assert.equal(link.textContent, 'All lists');
  assert.equal(link.getAttribute('href'), '/users/justin/lists#ogt-all-lists');
  assert.equal(link.closest('li').previousElementSibling.querySelector('a').textContent, 'Collaborations');
  assert.equal(Boolean(view(document)), false);
  assert.equal(requests.length, 0);
});

test('choosing All lists appends collaborations and liked lists in og\'s own row markup, then Personal restores', async (t) => {
  const { window, document } = boot();
  t.after(() => window.close());
  await wait();
  const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  option(document).dispatchEvent(click);
  assert.equal(click.defaultPrevented, true, 'switches in place on the personal page');
  await wait();

  assert.equal(triggerLabel(document), 'Lists: All lists');
  assert.equal(option(document).getAttribute('aria-current'), 'page');
  assert.equal(document.querySelector('a[href="/users/justin/lists"]').hasAttribute('aria-current'), false);
  assert.equal(document.querySelector('.ogt-all-lists__personal-heading').textContent, 'Personal');
  const root = view(document);
  assert.ok(document.querySelector('section.lists').nextElementSibling === root);
  assert.ok(root.classList.contains('svelte-wj9vv6'), 'takes the section\'s own classes');
  assert.equal(root.classList.contains('ogt-all-lists--fallback'), false);

  const [collab, liked] = root.querySelectorAll('.list-row');
  assert.ok(collab.classList.contains('svelte-vtg29f'), 'ListRow scope class');
  assert.ok(collab.querySelector('.fan').classList.contains('svelte-vtg29f'));
  assert.equal(collab.querySelector('.chips .tag').textContent, 'Link');
  assert.ok(collab.querySelector('.chips .tag').classList.contains('svelte-1axs3vw'), 'og\'s tag classes');
  const counts = [...collab.querySelectorAll('.counts > *')];
  // og spaces the number and word with CSS, so its own counts read "38items" as text too.
  assert.deepEqual(counts.map((count) => count.textContent.replace(/\s+/g, '')), ['2likes', '3items', '1comment']);
  assert.ok(counts[0].classList.contains('glass-action'), 'og\'s likes pill, as a count');
  assert.equal(counts[0].tagName, 'SPAN');
  assert.equal(counts[2].getAttribute('href'), '/users/owner/lists/list-1/comments');
  assert.ok(counts[1].classList.contains('svelte-1c8x1ot'), 'og\'s count classes and icon');
  assert.equal(collab.querySelector('.tools .share button').getAttribute('title'), 'Copy Link');
  assert.equal(Boolean(collab.querySelector('.tools [popover]')), false, 'no copied tooltip');
  assert.equal(Boolean(collab.querySelector('.tools .progress')), false, 'progress needs a signed-in viewer');
  assert.equal(Boolean(collab.querySelector('.leave')), false);

  // Liked lists come without posters; each row's are read from the list summary.
  assert.equal(liked.querySelectorAll('.fan img.poster').length, 1);
  assert.equal(liked.querySelector('.fan img').getAttribute('src'), 'https://media.trakt.tv/images/summary.jpg.webp');
  assert.equal(liked.querySelectorAll('.poster.loading').length, 0);

  document.querySelector('a[href="/users/justin/lists"]').click();
  assert.equal(Boolean(view(document)), false);
  assert.equal(Boolean(document.querySelector('.ogt-all-lists__personal-heading')), false);
  assert.equal(triggerLabel(document), 'Lists: Personal');
  assert.equal(document.querySelector('a[href="/users/justin/lists"]').getAttribute('aria-current'), 'page');
  assert.equal(option(document).hasAttribute('aria-current'), false);
});

test('auth changes clear private rows and reload instead of reusing the old view', async (t) => {
  let account = 'a';
  const { window, document, requests } = boot({ signedIn: true,
    collaborations: () => [list(account === 'a' ? 1 : 9, { name: `List ${account}`, privacy: 'private' })] });
  t.after(() => window.close());
  await wait();
  option(document).click();
  await wait();
  assert.match(view(document).textContent, /List a/);
  const before = requests.filter((request) => request.pathname.endsWith('/lists/collaborations')).length;

  account = 'b';
  document.dispatchEvent(new window.Event('ogt:authchange'));
  assert.equal(view(document).querySelectorAll('.list-row').length, 0, 'old private rows disappear immediately');
  await wait();
  assert.match(view(document).textContent, /List b/);
  assert.doesNotMatch(view(document).textContent, /List a/);
  assert.ok(requests.filter((request) => request.pathname.endsWith('/lists/collaborations')).length > before,
    'the resolved loading promise does not prevent a reload');
});

test('liked lists read every page, publicly or with the toolkit sign-in', async (t) => {
  const many = (count, from) => Array.from({ length: count }, (_, i) => ({ liked_at: '2026-11-01T00:00:00Z', list: list(from + i, { images: { posters: ['media.trakt.tv/p.jpg'] } }) }));
  for (const signedIn of [false, true]) {
    const { window, document, requests } = boot({
      signedIn,
      // Public: a full page means there may be more. Signed in: Trakt's page count says so.
      liked: (page) => (signedIn ? { rows: many(page === 1 ? 3 : 2, page * 100), pages: 2 } : many(page === 1 ? 250 : 1, page * 1000)),
    });
    t.after(() => window.close());
    await wait();
    option(document).click();
    await wait(150);
    const pages = requests.filter((request) => request.pathname === '/users/justin/likes/lists');
    assert.deepEqual(pages.map((request) => request.searchParams.get('page')), ['1', '2']);
    assert.ok(pages.every((request) => request.searchParams.get('limit') === '250' && request.auth === signedIn));
    assert.equal(view(document).querySelectorAll('.ogt-all-lists__group--liked .list-row').length, signedIn ? 5 : 251);
    if (signedIn) {
      assert.equal(view(document).querySelector('.list-row .tools .progress').getAttribute('href'), '/users/viewer/progress?list=1');
    }
  }
});

test('other list pages link to the personal page, which opens All lists from the link', async (t) => {
  const liked = boot({ url: 'https://og.trakt.tv/users/justin/lists/liked' });
  t.after(() => liked.window.close());
  await wait();
  const click = new liked.window.MouseEvent('click', { bubbles: true, cancelable: true });
  option(liked.document).dispatchEvent(click);
  assert.equal(click.defaultPrevented, false, 'og\'s router follows the link');
  assert.equal(Boolean(view(liked.document)), false);

  const arrived = boot({ url: 'https://og.trakt.tv/users/justin/lists#ogt-all-lists' });
  t.after(() => arrived.window.close());
  await wait();
  assert.ok(view(arrived.document));
  assert.equal(arrived.window.location.hash, '');
});

test('single lists and smart lists pages are left alone', async (t) => {
  for (const path of ['/users/justin/lists/list-1', '/users/justin/smart-lists/new']) {
    const { window, document } = boot({ url: `https://og.trakt.tv${path}` });
    t.after(() => window.close());
    await wait();
    assert.equal(Boolean(option(document)), false, path);
  }
});

test('failures say what to do, and a page with no native rows uses the fallback styles', async (t) => {
  const noClient = boot({ clientId: null });
  t.after(() => noClient.window.close());
  await wait();
  option(noClient.document).click();
  await wait();
  assert.match(view(noClient.document).querySelector('.ogt-all-lists__error').textContent, /client ID/);

  const failing = boot({ fail: (path) => path.endsWith('/likes/lists'), html: ALL_LISTS_HTML.replace(/<article[\s\S]*<\/article>/, '') });
  t.after(() => failing.window.close());
  await wait();
  option(failing.document).click();
  await wait();
  const root = view(failing.document);
  assert.equal(root.querySelector('.ogt-all-lists__error').textContent, 'Some lists could not be loaded. Try again later.');
  assert.ok(root.classList.contains('ogt-all-lists--fallback'));
  assert.equal(root.querySelectorAll('.ogt-all-lists__group--collaborations .list-row').length, 1);
  assert.equal(root.querySelector('.ogt-all-lists__group--liked .ogt-all-lists__empty').textContent, 'No liked lists.');
});

test('rows show the viewer\'s likes, owners\' VIP labels and description line breaks, like og', async (t) => {
  const vip = { username: 'gary', name: 'Gary', vip: true, vip_ep: true, ids: { slug: 'gary' } };
  const rows = () => [
    { liked_at: '2026-11-01T00:00:00Z', list: list(2, { user: vip, description: 'Maintained by mdblist.com\nCreate your own\n\nUpdated daily' }) },
    { liked_at: '2026-11-01T00:00:00Z', list: list(3) },
  ];
  // On the viewer's own profile every liked list is liked; elsewhere, only those in the viewer's own likes.
  for (const [viewer, viewerLiked, expected] of [['justin', [], [true, true]], ['other', [{ list: list(3) }], [false, true]]]) {
    const { window, document } = boot({ signedIn: true, viewer, viewerLiked, liked: () => ({ rows: rows(), pages: 1 }) });
    t.after(() => window.close());
    await wait();
    option(document).click();
    await wait(100);
    const liked = [...view(document).querySelectorAll('.ogt-all-lists__group--liked .list-row')];
    assert.deepEqual(liked.map((row) => row.querySelector('.counts > .glass-action').classList.contains('selected')), expected, viewer);
    const filled = liked[1].querySelector('.counts > .glass-action');
    assert.equal(filled.classList.contains('glass'), false);
    assert.equal(filled.getAttribute('style'), '--action: var(--color-list-card-like)');
    if (viewer !== 'justin') continue;

    const label = liked[0].querySelector('.by .label-vip');
    assert.ok(label.classList.contains('svelte-lytdbn'), 'og\'s own VIP label');
    assert.equal(label.querySelector('.name').textContent, 'VIP');
    assert.equal(label.querySelector('abbr.tag').textContent, 'EP');
    assert.equal(Boolean(liked[1].querySelector('.label-vip')), false);
    const paragraphs = [...liked[0].querySelectorAll('.overview p')];
    assert.deepEqual(paragraphs.map((p) => p.textContent), ['Maintained by mdblist.comCreate your own', 'Updated daily']);
    assert.equal(paragraphs[0].querySelectorAll('br').length, 1);
  }
});

test('VIP owners get og\'s label even when no native row on the page has one to copy', async (t) => {
  const vip = { username: 'gary', name: 'Gary', vip: true, vip_ep: true, ids: { slug: 'gary' } };
  const { window, document } = boot({
    html: ALL_LISTS_HTML.replace(/<span class="label-vip[\s\S]*?<\/span><\/p>/g, '</p>'),
    liked: () => [{ liked_at: '2026-11-01T00:00:00Z', list: list(2, { user: vip }) }],
  });
  t.after(() => window.close());
  await wait();
  assert.equal(Boolean(document.querySelector('section.lists .label-vip')), false, 'fixture has no native label');
  option(document).click();
  await wait();
  const label = view(document).querySelector('.ogt-all-lists__group--liked .by .ogt-vip');
  assert.equal(label.querySelector('.ogt-vip__name').textContent, 'VIP');
  assert.equal(label.querySelector('.ogt-vip__tag').textContent, 'EP');
  assert.ok(label.querySelector('svg.icon path'));
});
