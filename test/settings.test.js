import test from 'node:test';
import assert from 'node:assert/strict';
import { isCustomLinkUrl, normalizeServerUrl } from '../src/settings.js';

test('normalizeServerUrl accepts hosts, ports and base paths', () => {
  assert.equal(normalizeServerUrl('media.test:8096/jellyfin/'), 'http://media.test:8096/jellyfin');
  assert.equal(normalizeServerUrl('https://media.test/emby/'), 'https://media.test/emby');
  assert.equal(normalizeServerUrl('HTTP://MEDIA.TEST/Jellyfin/'), 'http://media.test/Jellyfin');
  assert.equal(normalizeServerUrl('http://host/'), 'http://host');
  assert.equal(normalizeServerUrl('http://[::1]:8096/'), 'http://[::1]:8096');
});

test('normalizeServerUrl rejects unsupported schemes and URL parts', () => {
  for (const value of [
    '',
    'ftp://host',
    'mailto:user@example.com',
    'file:/etc',
    'http:host',
    'https:host',
    'host:abc',
  ]) {
    assert.equal(normalizeServerUrl(value), null, value);
  }

  for (const value of [
    'http://user:pass@host',
    'http://host/path?token=secret',
    'http://host/path#section',
  ]) {
    assert.equal(normalizeServerUrl(value), null, value);
  }
});

test('custom links accept HTTP(S) and only the five configured server placeholders', () => {
  for (const value of [
    'https://example.test/{title}',
    '{jellyfin}/web/#/search?query={title}',
    '{emby}/web/index.html',
    '{radarr}/add/new?term={title}',
    '{sonarr}/add/new?term={title}',
    '{seerr}/search?query={title}',
  ]) {
    assert.equal(isCustomLinkUrl(value), true, value);
  }

  for (const value of [
    '{title}/evil',
    '{plex}/search',
    '{jellyfin}',
    '{Jellyfin}/web',
    'ftp://host',
  ]) {
    assert.equal(isCustomLinkUrl(value), false, value);
  }
});
