import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COOLDOWN_MS,
  MISS_TTL_MS,
  buildDestinationUrl,
  buildWikidataQuery,
  externalIdUrl,
  parseWikidataResponse,
  peekExternalUrl,
  resetResolverCache,
  resolveExternalUrl,
  validateDirectUrl,
} from '../src/features/custom-links/resolve.js';

const payload = (...values) => ({
  results: {
    bindings: values.map((value, index) => ({
      item: { value: `http://www.wikidata.org/entity/Q${1000 + index}` },
      value: { value },
    })),
  },
});

const input = (overrides = {}) => ({
  service: 'rotten-tomatoes',
  kind: 'show',
  tmdb: 1396,
  imdb: 'tt0903747',
  context: { kind: 'show', routeName: 'title', season: null, episode: null },
  ...overrides,
});

test('Wikidata queries use the kind-specific TMDb property and media class', () => {
  const show = buildWikidataQuery({ service: 'rotten-tomatoes', kind: 'show', tmdb: 1396 });
  assert.match(show, /wdt:P4983 "1396"/);
  assert.match(show, /wdt:P31\/wdt:P279\* wd:Q5398426/);
  assert.match(show, /wdt:P1258 \?value/);

  const movie = buildWikidataQuery({ service: 'metacritic', kind: 'movie', tmdb: 8967 });
  assert.match(movie, /wdt:P4947 "8967"/);
  assert.match(movie, /wdt:P31\/wdt:P279\* wd:Q11424/);
  assert.match(movie, /wdt:P1712 \?value/);

  const imdbOnly = buildWikidataQuery({ service: 'metacritic', kind: 'show', imdb: 'tt0903747' });
  assert.match(imdbOnly, /wdt:P345 "tt0903747"/);
  assert.throws(() => buildWikidataQuery({ service: 'metacritic', kind: 'show' }), /No validated/);
  assert.throws(() => buildWikidataQuery({ service: 'other', kind: 'show', tmdb: 1 }), /Unsupported/);
  assert.throws(
    () => buildWikidataQuery({ service: 'metacritic', kind: 'show', imdb: 'tt0903747" }' }),
    /No validated/,
    'unvalidated ids never reach the query',
  );
});

test('Wikidata results map back to the exact destination host and kind', () => {
  assert.equal(
    parseWikidataResponse(payload('tv/breaking_bad'), 'rotten-tomatoes', 'show'),
    'https://www.rottentomatoes.com/tv/breaking_bad',
  );
  assert.equal(
    parseWikidataResponse(payload('movie/the-dark'), 'metacritic', 'movie'),
    'https://www.metacritic.com/movie/the-dark/',
  );
});

test('Wikidata results fail closed when missing, ambiguous or malformed', () => {
  assert.equal(parseWikidataResponse(payload(), 'rotten-tomatoes', 'show'), null);
  assert.equal(
    parseWikidataResponse(payload('tv/breaking_bad', 'tv/breaking_bad_2'), 'rotten-tomatoes', 'show'),
    null,
    'two distinct ids are ambiguous',
  );
  assert.equal(
    parseWikidataResponse(payload('m/breaking_bad'), 'rotten-tomatoes', 'show'),
    null,
    'the wrong RT prefix is rejected for a show',
  );
  assert.equal(
    parseWikidataResponse(payload('game/pc/portal'), 'metacritic', 'movie'),
    null,
    'Metacritic game/person ids are not title pages',
  );
  assert.equal(
    parseWikidataResponse(payload('tv/breaking_bad/s01'), 'rotten-tomatoes', 'show'),
    null,
    'season-level ids do not become a show mapping',
  );
  assert.equal(
    parseWikidataResponse(payload('tv/breaking_bad', 'tv/breaking_bad'), 'rotten-tomatoes', 'show'),
    'https://www.rottentomatoes.com/tv/breaking_bad',
    'duplicate rows for one id are not ambiguous',
  );
  assert.throws(() => parseWikidataResponse({}, 'rotten-tomatoes', 'show'), /Malformed/);
  assert.throws(
    () => parseWikidataResponse({ results: { bindings: [{ item: { value: 'https://example.test/Q1' }, value: { value: 'tv/x' } }] } },
      'rotten-tomatoes', 'show'),
    /Malformed/,
  );
});

test('identifier validation rejects lookalikes, extra segments and wrong kinds', () => {
  assert.equal(externalIdUrl('rotten-tomatoes', 'movie', 'm/the_dark'), 'https://www.rottentomatoes.com/m/the_dark');
  assert.equal(externalIdUrl('rotten-tomatoes', 'show', 'tv/breaking_bad'), 'https://www.rottentomatoes.com/tv/breaking_bad');
  for (const value of ['m/x/reviews', 'celebrity/x', 'franchise/x', 'tv/x', 'm/X', 'm/x y']) {
    assert.equal(externalIdUrl('rotten-tomatoes', 'movie', value), null, value);
  }
  assert.equal(externalIdUrl('metacritic', 'movie', 'movie/the-dark'), 'https://www.metacritic.com/movie/the-dark/');
  for (const value of ['game/pc/portal', 'person/dwayne-johnson', 'publication/rolling-stone', 'tv/x', 'movie/x/y']) {
    assert.equal(externalIdUrl('metacritic', 'movie', value), null, value);
  }
});

test('direct OG URLs are accepted only on the exact host and supported title paths', () => {
  assert.equal(
    validateDirectUrl('rotten-tomatoes', 'show', 'https://www.rottentomatoes.com/tv/breaking_bad'),
    'https://www.rottentomatoes.com/tv/breaking_bad',
  );
  assert.equal(
    validateDirectUrl('rotten-tomatoes', 'show', 'https://rottentomatoes.com/tv/breaking_bad/s01'),
    'https://rottentomatoes.com/tv/breaking_bad/s01',
  );
  assert.equal(
    validateDirectUrl('metacritic', 'movie', 'https://www.metacritic.com/movie/the-dark'),
    'https://www.metacritic.com/movie/the-dark/',
  );
  assert.equal(
    validateDirectUrl('metacritic', 'show', 'https://metacritic.com/tv/breaking-bad/season-1/'),
    'https://metacritic.com/tv/breaking-bad/season-1/',
  );
  assert.equal(
    validateDirectUrl('rotten-tomatoes', 'movie', 'https://www.rottentomatoes.com/m/the_dark?tracking=og'),
    'https://www.rottentomatoes.com/m/the_dark',
    'OG tracking parameters are dropped rather than copied',
  );

  for (const href of [
    'http://www.rottentomatoes.com/m/the_dark',
    'https://evilrottentomatoes.com/m/the_dark',
    'https://www.rottentomatoes.com.evil.test/m/the_dark',
    'https://user:secret@www.rottentomatoes.com/m/the_dark',
    'https://www.rottentomatoes.com:8443/m/the_dark',
    'https://www.rottentomatoes.com/search?search=test',
    'https://www.rottentomatoes.com/tv/breaking_bad',
  ]) {
    assert.equal(validateDirectUrl('rotten-tomatoes', 'movie', href), null, href);
  }

  for (const href of [
    'https://www.metacritic.com/tv/breaking_bad',
    'https://www.metacritic.com/movie/the-dark/season-1',
    'https://www.metacritic.com/tv/breaking-bad/season-1/episode-1/',
    'https://www.metacritic.com/search/breaking-bad/',
  ]) {
    assert.equal(validateDirectUrl('metacritic', 'movie', href), null, href);
  }
});

test('season and episode pages get a verified season destination, never a guessed episode slug', () => {
  const rt = 'https://www.rottentomatoes.com/tv/breaking_bad';
  const mc = 'https://www.metacritic.com/tv/breaking-bad/';
  assert.equal(
    buildDestinationUrl('rotten-tomatoes', rt, { kind: 'show', routeName: 'season', season: 2 }),
    'https://www.rottentomatoes.com/tv/breaking_bad/s02',
  );
  assert.equal(
    buildDestinationUrl('rotten-tomatoes', rt, { kind: 'show', routeName: 'episode', season: 1, episode: 3 }),
    'https://www.rottentomatoes.com/tv/breaking_bad/s01',
  );
  assert.equal(
    buildDestinationUrl('metacritic', mc, { kind: 'show', routeName: 'episode', season: 7, episode: 2 }),
    'https://www.metacritic.com/tv/breaking-bad/season-7/',
  );
  assert.equal(
    buildDestinationUrl('rotten-tomatoes', rt, { kind: 'show', routeName: 'season', season: 0 }),
    rt,
    'specials keep the show page',
  );
  assert.equal(
    buildDestinationUrl('rotten-tomatoes', rt, { kind: 'show', routeName: 'title', season: 3 }),
    rt,
    'a title page opens the show, not the remembered picker season',
  );
  assert.equal(
    buildDestinationUrl('metacritic', 'https://www.metacritic.com/movie/the-dark/', { kind: 'movie', routeName: 'title' }),
    'https://www.metacritic.com/movie/the-dark/',
  );
});

test('a successful mapping is cached and reused on the next activation', async () => {
  resetResolverCache();
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return payload('tv/breaking_bad'); };

  assert.equal(await resolveExternalUrl(input(), { fetchImpl }), 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(await resolveExternalUrl(input(), { fetchImpl }), 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(calls, 1);
});

test('concurrent activations share one request and both get the mapping', async () => {
  resetResolverCache();
  let calls = 0;
  let release;
  const fetchImpl = () => {
    calls += 1;
    return new Promise((resolve) => { release = () => resolve(payload('tv/breaking_bad')); });
  };

  const first = resolveExternalUrl(input(), { fetchImpl });
  const second = resolveExternalUrl(input(), { fetchImpl });
  assert.equal(calls, 1);
  release();

  assert.deepEqual(await Promise.all([first, second]), [
    'https://www.rottentomatoes.com/tv/breaking_bad',
    'https://www.rottentomatoes.com/tv/breaking_bad',
  ]);
  assert.equal(calls, 1);
});

test('genuine misses are cached briefly, while a failure stays retryable', async () => {
  resetResolverCache();
  let calls = 0;
  const missing = async () => { calls += 1; return payload(); };
  assert.equal(await resolveExternalUrl(input(), { fetchImpl: missing }), null);
  assert.equal(await resolveExternalUrl(input(), { fetchImpl: missing }), null);
  assert.equal(calls, 1, 'a missing mapping is cached');

  resetResolverCache();
  let attempts = 0;
  const flaky = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('network down');
    return payload('tv/breaking_bad');
  };
  await assert.rejects(resolveExternalUrl(input(), { fetchImpl: flaky }), /network down/);
  assert.equal(
    await resolveExternalUrl(input(), { fetchImpl: flaky }),
    'https://www.rottentomatoes.com/tv/breaking_bad',
    'a transient failure is not cached as a miss',
  );
  assert.equal(attempts, 2);
});

test('peek returns a cached mapping for the current season without a request', async () => {
  resetResolverCache();
  let calls = 0;
  await resolveExternalUrl(input(), {
    fetchImpl: async () => { calls += 1; return payload('tv/breaking_bad'); },
  });
  const seasonInput = input({
    context: { kind: 'show', routeName: 'season', season: 2, episode: null },
  });
  assert.equal(peekExternalUrl(seasonInput), 'https://www.rottentomatoes.com/tv/breaking_bad/s02');
  assert.equal(calls, 1);
  assert.equal(
    peekExternalUrl(input({ context: { kind: 'show', routeName: 'title' } })),
    'https://www.rottentomatoes.com/tv/breaking_bad',
  );
});

test('a valid direct URL skips the lookup entirely', async () => {
  resetResolverCache();
  let calls = 0;
  const direct = await resolveExternalUrl(input({
    directUrl: 'https://www.rottentomatoes.com/tv/breaking_bad',
  }), { fetchImpl: async () => { calls += 1; return payload('tv/other'); } });
  assert.equal(direct, 'https://www.rottentomatoes.com/tv/breaking_bad');
  assert.equal(calls, 0);
  assert.equal(
    peekExternalUrl(input({ directUrl: 'https://www.rottentomatoes.com/tv/breaking_bad' })),
    'https://www.rottentomatoes.com/tv/breaking_bad',
    'a direct URL is always the first choice',
  );
});

test('a Wikidata 429 blocks both destinations until Retry-After passes', async () => {
  for (const [first, second] of [['rotten-tomatoes', 'metacritic'], ['metacritic', 'rotten-tomatoes']]) {
    resetResolverCache();
    let now = 0;
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error('HTTP 429');
        error.status = 429;
        error.headers = 'Retry-After: 60';
        throw error;
      }
      return payload(second === 'metacritic' ? 'tv/breaking-bad' : 'tv/breaking_bad');
    };
    const options = { fetchImpl, now: () => now };
    assert.equal(await resolveExternalUrl(input({ service: first }), options), null);
    now = 59999;
    assert.equal(await resolveExternalUrl(input({ service: second, tmdb: 999 }), options), null);
    assert.equal(calls, 1, 'switching destination or title must not bypass Wikidata throttling');
    now = 60000;
    assert.ok(await resolveExternalUrl(input({ service: second, tmdb: 999 }), options));
    assert.equal(calls, 2, 'lookups resume when the cooldown expires');
  }
});

test('concurrent 429 responses cannot shorten the shared cooldown', async () => {
  resetResolverCache();
  let now = 0;
  const rejects = [];
  const fetchImpl = () => new Promise((resolve, reject) => rejects.push(reject));
  const options = { fetchImpl, now: () => now };
  const first = resolveExternalUrl(input(), options);
  const second = resolveExternalUrl(input({ service: 'metacritic' }), options);
  rejects[0](Object.assign(new Error('HTTP 429'), { status: 429, headers: 'Retry-After: 60' }));
  await first;
  rejects[1](Object.assign(new Error('HTTP 429'), { status: 429, headers: 'Retry-After: 1' }));
  await second;
  now = 2000;
  assert.equal(await resolveExternalUrl(input(), options), null);
  assert.equal(rejects.length, 2, 'the shorter response must not allow another request');
});

test('a 429 records the service cooldown and keeps search until Retry-After passes', async () => {
  resetResolverCache();
  let now = 0;
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error('HTTP 429');
      error.status = 429;
      error.headers = 'Retry-After: 60';
      throw error;
    }
    return payload('tv/breaking_bad');
  };

  assert.equal(await resolveExternalUrl(input(), { fetchImpl, now: () => now }), null);
  assert.equal(calls, 1);

  now = 59999;
  assert.equal(await resolveExternalUrl(input(), { fetchImpl, now: () => now }), null);
  assert.equal(calls, 1, 'no lookup is sent during the cooldown');

  now = 60000;
  assert.equal(
    await resolveExternalUrl(input(), { fetchImpl, now: () => now }),
    'https://www.rottentomatoes.com/tv/breaking_bad',
  );
  assert.equal(calls, 2, 'the service is retried after Retry-After');
});

test('a 429 without Retry-After still gets a bounded cooldown', async () => {
  resetResolverCache();
  let now = 0;
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    const error = new Error('HTTP 429');
    error.status = 429;
    throw error;
  };

  assert.equal(await resolveExternalUrl(input(), { fetchImpl, now: () => now }), null);
  now = DEFAULT_COOLDOWN_MS - 1;
  assert.equal(await resolveExternalUrl(input(), { fetchImpl, now: () => now }), null);
  assert.equal(calls, 1);
  now = DEFAULT_COOLDOWN_MS;
  await resolveExternalUrl(input(), { fetchImpl, now: () => now }).catch(() => null);
  assert.equal(calls, 2);
});

test('miss TTL is deliberately short', () => {
  assert.ok(MISS_TTL_MS > 0 && MISS_TTL_MS <= 10 * 60 * 1000);
});
