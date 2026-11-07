import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, findPreset } from '../src/features/custom-links/presets.js';
import { resolveCustomLinks, watchNowLinks } from '../src/features/custom-links/data.js';
import { hasServiceIcon, iconKeyForLabel, surfaceForLabel } from '../src/features/custom-links/icons.js';

test('every preset declares a known surface and a bundled local icon', () => {
  for (const preset of PRESETS) {
    assert.ok(['watch', 'library', 'reference'].includes(preset.surface), `${preset.label} surface`);
    assert.equal(hasServiceIcon(preset.icon), true, `${preset.label} icon`);
    assert.equal(findPreset(preset.url), preset, `${preset.label} is discoverable by its template`);
  }
});

test('unknown labels get no mark and known labels normalise to one', () => {
  assert.equal(iconKeyForLabel('Rotten Tomatoes'), 'rt');
  assert.equal(iconKeyForLabel('My Anime List'), 'mal');
  assert.equal(iconKeyForLabel('  PLEX  '), 'plex');
  assert.equal(iconKeyForLabel('My Cinema'), null);
});

test('surface is inferred from the label for edited presets', () => {
  assert.equal(surfaceForLabel('Emby'), 'watch');
  assert.equal(surfaceForLabel('Jellyfin'), 'watch');
  assert.equal(surfaceForLabel('Debrid Media Manager'), 'watch');
  assert.equal(surfaceForLabel('Radarr'), 'library');
  assert.equal(surfaceForLabel('Jellyseerr'), 'library');
  assert.equal(surfaceForLabel('IMDb'), 'reference');
  assert.equal(surfaceForLabel('My Cinema'), 'reference');

  const entries = resolveCustomLinks(
    [
      { label: 'Emby', url: '{emby}/web/index.html#!/list/list.html?type=search&searchtext={title}' },
      { label: 'Jellyfin', url: '{jellyfin}/web/#/search?query={title}' },
      { label: 'Radarr', url: '{radarr}/custom/{title}' },
      { label: 'My Cinema', url: 'https://cinema.test/{title}' },
    ],
    {
      title: 'The Dark',
      emby: 'http://emby.test',
      jellyfin: 'http://jellyfin.test',
      radarr: 'http://radarr.test',
    },
    'movie',
  );
  assert.deepEqual(
    entries.map(({ label, icon, surface }) => ({ label, icon, surface })),
    [
      { label: 'Emby', icon: 'emby', surface: 'watch' },
      { label: 'Jellyfin', icon: 'jellyfin', surface: 'watch' },
      { label: 'Radarr', icon: 'radarr', surface: 'library' },
      { label: 'My Cinema', icon: null, surface: 'reference' },
    ],
  );
});

test('resolved links keep saved order and carry icon, surface and normal hrefs', () => {
  const entries = resolveCustomLinks(
    [
      { label: 'IMDb', url: 'https://www.imdb.com/find/?q={title}' },
      { label: 'JustWatch', url: 'https://www.justwatch.com/us/search?q={title}' },
      { label: 'Bad', url: '{title}/not-a-url' },
      { label: 'Radarr', url: '{radarr}/add/new?term={title}' },
      { label: 'Jellyfin', url: '{jellyfin}/web/#/search?query={title}' },
      { label: 'My Cinema', url: 'https://cinema.test/{title}' },
      { label: 'Plex', url: 'https://app.plex.tv/desktop/#!/search?query={title}' },
    ],
    { title: 'The Dark', radarr: 'http://radarr.test' },
    'movie',
  );

  assert.deepEqual(
    entries.map(({ label, href, icon, surface }) => ({ label, href, icon, surface })),
    [
      {
        label: 'IMDb',
        href: 'https://www.imdb.com/find/?q=The%20Dark',
        icon: 'imdb',
        surface: 'reference',
      },
      {
        label: 'JustWatch',
        href: 'https://www.justwatch.com/us/search?q=The%20Dark',
        icon: 'justwatch',
        surface: 'watch',
      },
      {
        label: 'Radarr',
        href: 'http://radarr.test/add/new?term=The%20Dark',
        icon: 'radarr',
        surface: 'library',
      },
      {
        label: 'My Cinema',
        href: 'https://cinema.test/The%20Dark',
        icon: null,
        surface: 'reference',
      },
      {
        label: 'Plex',
        href: 'https://app.plex.tv/desktop/#!/search?query=The%20Dark',
        icon: 'plex',
        surface: 'watch',
      },
    ],
    'invalid and unconfigured server templates are skipped',
  );
});

test('watchNowLinks keeps watch and library entries but never reference links', () => {
  assert.deepEqual(
    watchNowLinks([
      { label: 'IMDb', surface: 'reference' },
      { label: 'Plex', surface: 'watch' },
      { label: 'Radarr', surface: 'library' },
    ]).map((entry) => entry.label),
    ['Plex', 'Radarr'],
  );
  assert.deepEqual(watchNowLinks(null), []);
});
