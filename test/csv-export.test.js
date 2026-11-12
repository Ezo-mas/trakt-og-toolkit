import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CSV_HEADER, escapeCsvCell, exportFilename, exportItems, normalizeExportItem, toCsv,
} from '../src/features/csv-export/data.js';
import { createExportApi, MAX_PAGES, PAGE_SIZE } from '../src/features/csv-export/api.js';

const movie = {
  type: 'movie',
  rank: 3,
  listed_at: '2026-11-01T12:00:00.000Z',
  notes: null,
  movie: { title: 'Project Hail Mary', year: 2026, ids: { trakt: 531178, imdb: 'tt1234567', tmdb: 987654 } },
};
const show = {
  type: 'show',
  rank: 0,
  listed_at: '2026-10-01T00:00:00.000Z',
  notes: 'Watch with friends',
  show: { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, imdb: 'tt0903747', tmdb: 1396 } },
};
const season = {
  type: 'season', rank: 1, listed_at: '2026-09-01T00:00:00.000Z', notes: '',
  show: { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388 } },
  season: { number: 2, ids: { trakt: 302 } },
};
const episode = {
  type: 'episode', rank: 2, listed_at: '2026-08-01T00:00:00.000Z', notes: null,
  show: { title: 'Ted Lasso', year: 2020, ids: { trakt: 97546 } },
  episode: { title: 'Do the Right-est Thing', season: 2, number: 3, ids: { trakt: 5256056, imdb: 'tt123', tmdb: 42 } },
};
const person = {
  type: 'person', rank: 4, listed_at: '2026-07-01T00:00:00.000Z', notes: null,
  person: { name: 'Bryan Cranston', ids: { trakt: 17419, imdb: 'nm0186505', tmdb: 17419 } },
};

test('normalizes movies, shows, seasons, episodes and people into CSV columns', () => {
  assert.deepEqual(normalizeExportItem(movie), {
    rank: 3, type: 'movie', title: 'Project Hail Mary', year: 2026, season: '', episode: '',
    trakt: '531178', imdb: 'tt1234567', tmdb: '987654',
    listed_at: '2026-11-01T12:00:00.000Z', notes: '',
  });
  assert.deepEqual(normalizeExportItem(show), {
    rank: 0, type: 'show', title: 'Breaking Bad', year: 2008, season: '', episode: '',
    trakt: '1388', imdb: 'tt0903747', tmdb: '1396',
    listed_at: '2026-10-01T00:00:00.000Z', notes: 'Watch with friends',
  });
  assert.deepEqual(normalizeExportItem(season), {
    rank: 1, type: 'season', title: 'Breaking Bad', year: 2008, season: 2, episode: '',
    trakt: '302', imdb: '', tmdb: '',
    listed_at: '2026-09-01T00:00:00.000Z', notes: '',
  });
  assert.deepEqual(normalizeExportItem(episode), {
    rank: 2, type: 'episode', title: 'Ted Lasso — Do the Right-est Thing', year: 2020, season: 2, episode: 3,
    trakt: '5256056', imdb: 'tt123', tmdb: '42',
    listed_at: '2026-08-01T00:00:00.000Z', notes: '',
  });
  assert.deepEqual(normalizeExportItem(person), {
    rank: 4, type: 'person', title: 'Bryan Cranston', year: '', season: '', episode: '',
    trakt: '17419', imdb: 'nm0186505', tmdb: '17419',
    listed_at: '2026-07-01T00:00:00.000Z', notes: '',
  });
});

test('drops unusable entries and keeps the API order', () => {
  assert.deepEqual(exportItems([movie, null, 'x', {}, { type: 'unknown' }, show]), [
    normalizeExportItem(movie), normalizeExportItem(show),
  ]);
  assert.deepEqual(exportItems({}), []);
  assert.equal(normalizeExportItem({ type: 'movie', movie: [] }), null);
});

test('uses RFC 4180 quoting and neutralizes spreadsheet formulas', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('Movie, "Quoted"'), '"Movie, ""Quoted"""');
  assert.equal(escapeCsvCell('line 1\nline 2'), '"line 1\nline 2"');
  assert.equal(escapeCsvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(escapeCsvCell('+1'), "'+1");
  assert.equal(escapeCsvCell('-1'), "'-1");
  assert.equal(escapeCsvCell('@cmd'), "'@cmd");
  assert.equal(escapeCsvCell('\t=1+2'), "'\t=1+2", 'a leading tab cannot expose a formula');
  assert.equal(escapeCsvCell('＝1+2'), "'＝1+2", 'a full-width equals sign is still a formula marker');
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell(0), '0');

  const csv = toCsv([{ ...normalizeExportItem(movie), title: 'Movie, "Quoted"', notes: '@cmd' }]);
  const [header, row] = csv.split('\r\n');
  assert.equal(header, CSV_HEADER.join(','));
  assert.match(row, /^3,movie,"Movie, ""Quoted""",2026,,,531178,tt1234567,987654,2026-11-01T12:00:00\.000Z,'@cmd$/);
  assert.ok(csv.endsWith('\r\n'));
});

test('an empty export still has the header and CRLF endings', () => {
  assert.equal(toCsv([]), `${CSV_HEADER.join(',')}\r\n`);
});

test('names downloads from the owner and list, with a watchlist fallback', () => {
  assert.equal(exportFilename({ name: 'list', id: 'justin', slug: '2015-fall-shows' }),
    'trakt-justin-2015-fall-shows.csv');
  assert.equal(exportFilename({ name: 'watchlist', id: 'justin' }), 'trakt-justin-watchlist.csv');
  assert.equal(exportFilename({ name: 'official-list', id: null, slug: '1001-movies' }), 'trakt-official-1001-movies.csv');
  assert.equal(exportFilename({ name: 'list', id: 'odd/name', slug: 'A List!' }), 'trakt-odd-name-A-List.csv');
  assert.equal(exportFilename({}), 'trakt-export.csv');
});

test('list reads walk pages until a short one and encode the owner and slug', async () => {
  const calls = [];
  const api = createExportApi({
    authPage: async (path, options) => {
      calls.push([path, options]);
      const { page } = options;
      const data = page === 1 ? Array.from({ length: PAGE_SIZE }, () => movie) : page === 2 ? [movie] : [];
      return { data, pages: null };
    },
  });

  const rows = await api.list('odd name', 'A List!');
  assert.equal(rows.length, PAGE_SIZE + 1);
  assert.deepEqual(calls, [
    ['/users/odd%20name/lists/A%20List!/items', { page: 1, limit: PAGE_SIZE }],
    ['/users/odd%20name/lists/A%20List!/items', { page: 2, limit: PAGE_SIZE }],
  ]);
});

test('list reads keep a page count when later pages omit the header', async () => {
  const calls = [];
  const api = createExportApi({
    authPage: async (path, { page }) => {
      calls.push(path);
      return { data: page === 1 ? [movie] : page === 2 ? [show] : [season], pages: page === 1 ? 3 : null };
    },
  });

  assert.deepEqual(await api.list('justin', 'short-pages'), [movie, show, season]);
  assert.equal(calls.length, 3);
});

test('signed-in watchlist reads use Trakt page counts', async () => {
  const calls = [];
  const api = createExportApi({
    authPage: async (path, options) => {
      calls.push([path, options.page, options.limit]);
      return options.page === 1 ? { data: [movie], pages: 2 } : { data: [show], pages: 2 };
    },
  });

  assert.deepEqual(await api.watchlist('justin'), [movie, show]);
  assert.deepEqual(calls, [
    ['/users/justin/watchlist', 1, PAGE_SIZE],
    ['/users/justin/watchlist', 2, PAGE_SIZE],
  ]);
});

test('signed-in reads fail instead of truncating an export at the page cap', async () => {
  const calls = [];
  const api = createExportApi({
    authPage: async (path, options) => {
      calls.push(options.page);
      return { data: [movie], pages: MAX_PAGES + 1 };
    },
  });

  await assert.rejects(api.watchlist('justin'), (error) => error.exportLimit === true);
  assert.deepEqual(calls, [1]);
});

test('signed-in reads keep page order and run at most four requests at once', async () => {
  let inFlight = 0;
  let peak = 0;
  const api = createExportApi({
    authPage: async (_, { page }) => {
      peak = Math.max(peak, ++inFlight);
      await Promise.resolve();
      inFlight--;
      return { data: [page], pages: 10 };
    },
  });

  assert.deepEqual(await api.watchlist('justin'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(peak, 4);
});

test('a headerless list can have exactly 20,000 items', async () => {
  const full = Array(PAGE_SIZE).fill(movie);
  const calls = [];
  let extra = [];
  const api = createExportApi({
    authPage: async (_, { page, limit }) => {
      calls.push([page, limit]);
      return { data: limit === 1 ? extra : full, pages: null };
    },
  });

  assert.equal((await api.list('justin', 'full')).length, 20_000);
  assert.equal(calls.length, MAX_PAGES + 1);
  assert.deepEqual(calls.at(-1), [20_001, 1]);
  extra = [show];
  await assert.rejects(api.list('justin', 'oversized'), (error) => error.exportLimit === true);
});

test('signed-in reads reject empty or malformed required pages', async () => {
  for (const data of [[], { error: 'unexpected response' }]) {
    const api = createExportApi({
        authPage: async (_, { page }) => ({ data: page === 2 ? data : [movie], pages: 3 }),
    });

    await assert.rejects(api.watchlist('justin'), (error) => error.exportIncomplete === true);
  }
});

test('official lists resolve their numeric id and read their items', async () => {
  const calls = [];
  const api = createExportApi({
    get: async (path) => {
      calls.push(path);
      if (path === '/lists/avatar-collection') {
        return { type: 'official', ids: { trakt: 884, slug: 'avatar-collection' } };
      }
      throw new Error(`unexpected request: ${path}`);
    },
    authPage: async (path, options) => {
      assert.deepEqual(options, { page: 1, limit: PAGE_SIZE });
      calls.push(path);
      assert.equal(path, '/lists/884/items');
      return { data: [movie], pages: null };
    },
  });

  assert.deepEqual(await api.official('avatar-collection'), [movie]);
  assert.deepEqual(calls, [
    '/lists/avatar-collection',
    '/lists/884/items',
  ]);
});

test('official slugs fall back to search on a 404 or a personal-list collision', async () => {
  const calls = [];
  let missing = true;
  const api = createExportApi({
    get: async (path) => {
      calls.push(path);
      if (path === '/lists/1001-movies') {
        if (missing) throw Object.assign(new Error('Not found'), { status: 404 });
        return { type: 'personal', ids: { trakt: 805405, slug: '1001-movies' } };
      }
      if (path === '/search/list?query=1001%20movies&limit=25') {
        return [
          { type: 'list', list: { type: 'personal', ids: { trakt: 1, slug: '1001-movies-copy' } } },
          { type: 'list', list: { type: 'official', ids: { trakt: 37675689, slug: '1001-movies' } } },
        ];
      }
      throw new Error(`unexpected request: ${path}`);
    },
    authPage: async (path, options) => {
      assert.deepEqual(options, { page: 1, limit: PAGE_SIZE });
      calls.push(path);
      assert.equal(path, '/lists/37675689/items');
      return { data: [movie], pages: null };
    },
  });

  assert.deepEqual(await api.official('1001-movies'), [movie]);
  assert.deepEqual(calls, [
    '/lists/1001-movies',
    '/search/list?query=1001%20movies&limit=25',
    '/lists/37675689/items',
  ]);
  missing = false;
  assert.deepEqual(await api.official('1001-movies'), [movie]);
});

test('official slug collisions without an official match fail instead of exporting the personal list', async () => {
  const calls = [];
  const api = createExportApi({
    get: async (path) => {
      calls.push(path);
      if (path === '/lists/1001-movies') {
        return { type: 'personal', ids: { trakt: 805405, slug: '1001-movies' } };
      }
      if (path === '/search/list?query=1001%20movies&limit=25') {
        return [{ type: 'list', list: { type: 'personal', ids: { trakt: 805405, slug: '1001-movies' } } }];
      }
      throw new Error(`unexpected request: ${path}`);
    },
  });

  await assert.rejects(api.official('1001-movies'), (error) => error.status === 404);
  assert.deepEqual(calls, ['/lists/1001-movies', '/search/list?query=1001%20movies&limit=25']);
});
