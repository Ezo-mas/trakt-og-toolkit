import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { checkSelectors, unreachableReason } from '../scripts/og-drift-checks.mjs';
import { MOVIE_HTML, SHOW_HTML, SEASON_HTML, PLAYBACK_EPISODE_HTML, PERSON_HTML, SEASON_PAGE_HTML, EPISODE_PAGE_HTML } from './fixtures.js';

function documentFor(html) {
  const window = new Window();
  window.document.write(`<script>node_ids: [0, 50]</script>${html}`);
  return window;
}

test('checks each page against its required markup', (t) => {
  for (const [page, html] of Object.entries({ movie: MOVIE_HTML, show: SHOW_HTML, season: SEASON_HTML, episode: PLAYBACK_EPISODE_HTML, person: PERSON_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    // The show-link checks run against the live season/episode captures below.
    assert.deepEqual(checkSelectors(window.document, page).filter((check) => !check.ok && !SHOW_CONTEXT(check)), [], page);
  }
});

const SHOW_CONTEXT = (check) => check.feature.startsWith('custom links (show');

test('season and episode pages still carry the show link and the show ids custom links read', (t) => {
  for (const [page, html] of Object.entries({ season: SEASON_PAGE_HTML, episode: EPISODE_PAGE_HTML })) {
    const window = documentFor(html);
    t.after(() => window.close());
    const checks = checkSelectors(window.document, page).filter(SHOW_CONTEXT);
    assert.equal(checks.length, page === 'season' ? 3 : 2, page);
    assert.deepEqual(checks.filter((check) => !check.ok), [], page);
  }
});

test('reports missing selectors by feature and checks the first episode row', (t) => {
  const window = documentFor(SEASON_HTML);
  t.after(() => window.close());
  window.document.querySelector('article.row .rating-trigger .value').remove();
  assert.deepEqual(checkSelectors(window.document, 'season').filter((check) => !check.ok && !SHOW_CONTEXT(check)), [
    { feature: 'season chart', selector: '.rating-trigger .value', ok: false },
  ]);
});

test('requires an inline hydration script and a nonempty person name', (t) => {
  const window = documentFor(PERSON_HTML);
  t.after(() => window.close());
  window.document.querySelector('script').setAttribute('src', '/bootstrap.js');
  window.document.querySelector('.summary .summary-title h1').textContent = '  ';
  assert.deepEqual(checkSelectors(window.document, 'person').filter((check) => !check.ok).map((check) => check.feature), [
    'hydration gate', 'pronunciation',
  ]);
});

test('detects sign-in, Cloudflare and HTTP failures', () => {
  const response = { status: 200, url: 'https://og.trakt.tv/movies/example', html: '<html>og</html>' };
  assert.equal(unreachableReason(response), null);
  assert.equal(unreachableReason({ ...response, html: '<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>' }), null);
  assert.equal(unreachableReason({ ...response, url: 'https://og.trakt.tv/signin?next=%2F' }), 'redirected to sign-in');
  assert.equal(unreachableReason({ ...response, html: '<title>Just a moment...</title><div id="cf-challenge"></div>' }), 'Cloudflare challenge');
  assert.equal(unreachableReason({ ...response, status: 403 }), 'HTTP 403');
});
