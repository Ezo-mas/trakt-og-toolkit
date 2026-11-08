import { apiGet, apiAuth, isSignedIn } from '../../core/trakt.js';
import { watchlistLookup, watchlistBody, watchlistBulkBody, watchlistBulkItems } from './data.js';

/** A whole credits page can be large; 100 keeps each sync payload comfortably bounded. */
const BULK_BATCH = 100;

/** Only pass the queue guard when the caller supplied one, so injected transports keep their old shape. */
function writeRequest(auth, path, body, active, signal) {
  return active || signal
    ? auth('POST', path, body, undefined, { active, signal })
    : auth('POST', path, body);
}

export function createWatchlistApi({ get = apiGet, auth = apiAuth, signedIn = isSignedIn } = {}) {
  return {
    async add(route, { active, signal } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const lookup = watchlistLookup(route);
      if (!lookup) throw new Error('Unsupported watchlist page.');
      const isActive = active ?? (() => true);
      if (!isActive()) return { cancelled: true };
      const data = await get(lookup.path);
      const body = watchlistBody(lookup, data);
      const item = lookup.type === 'seasons' ? data.find(season => season?.number === lookup.season) : data;
      const title = typeof item?.title === 'string' && item.title.trim() ? item.title.trim()
        : lookup.type === 'seasons' ? `Season ${lookup.season}` : 'this title';
      if (!isActive() || !signedIn()) return { cancelled: true };
      const result = await writeRequest(auth, '/sync/watchlist', body, active, signal);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find this title.');
      }
      // An existing entry is also confirmed by Trakt, without toggling it off.
      const counts = [result?.added?.[lookup.type], result?.existing?.[lookup.type]];
      if (!counts.some(count => Number.isSafeInteger(count) && count > 0)) {
        throw new Error('Trakt did not confirm a watchlist addition.');
      }
      // Existing entries must stay on the list, so they get no Undo.
      return { cancelled: false, title, body, undoable: Number.isSafeInteger(result?.added?.[lookup.type]) && result.added[lookup.type] > 0 };
    },

    /** Report each confirmed batch so a later failure cannot erase completed work. */
    async addMany(routes, { active, signal, onProgress = () => {} } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const isActive = active ?? (() => true);
      if (!isActive()) return { cancelled: true };
      const items = watchlistBulkItems(routes);
      const progress = { cancelled: false, sent: 0, added: 0, existing: 0, notFound: 0, succeededKeys: [] };
      for (let start = 0; start < items.length; start += BULK_BATCH) {
        if (!isActive() || !signedIn()) return { cancelled: true };
        const batch = items.slice(start, start + BULK_BATCH);
        const result = await writeRequest(auth, '/sync/watchlist', watchlistBulkBody(batch), active, signal);
        const confirmed = { added: 0, existing: 0, notFound: 0, succeededKeys: [] };
        for (const type of ['movies', 'shows']) {
          const sent = batch.filter(item => item.type === type);
          const added = result?.added?.[type] ?? 0;
          const existing = result?.existing?.[type] ?? 0;
          const missing = result?.not_found?.[type] ?? [];
          if (!Number.isSafeInteger(added) || added < 0 || !Number.isSafeInteger(existing) || existing < 0 ||
            !Array.isArray(missing) || added + existing + missing.length !== sent.length) {
            throw new Error('Trakt did not confirm all watchlist additions; some titles may have been added.');
          }
          const missingSlugs = new Set(missing.map(item => item?.ids?.slug));
          // Without matching slugs, the response cannot identify which shortcuts should hide.
          if (missingSlugs.size === missing.length && [...missingSlugs].every(slug => sent.some(item => item.slug === slug))) {
            confirmed.succeededKeys.push(...sent.filter(item => !missingSlugs.has(item.slug)).map(item => item.key));
          }
          confirmed.added += added;
          confirmed.existing += existing;
          confirmed.notFound += missing.length;
        }
        progress.sent += batch.length;
        progress.added += confirmed.added;
        progress.existing += confirmed.existing;
        progress.notFound += confirmed.notFound;
        progress.succeededKeys.push(...confirmed.succeededKeys);
        onProgress({ ...progress, succeededKeys: [...progress.succeededKeys] });
      }
      return progress;
    },

    /** Undo an addition with the exact body that was sent. */
    async remove(body, { active, signal } = {}) {
      if (!signedIn()) throw new Error('Sign in through the toolkit menu first.');
      const isActive = active ?? (() => true);
      if (!body || typeof body !== 'object' || !isActive()) return { cancelled: true };
      const result = await writeRequest(auth, '/sync/watchlist/remove', body, active, signal);
      if (Object.values(result?.not_found ?? {}).some(items => !Array.isArray(items) || items.length)) {
        throw new Error('Trakt could not find this title.');
      }
      for (const [type, items] of Object.entries(body)) {
        const deleted = result?.deleted?.[type];
        if (!Array.isArray(items) || !Number.isSafeInteger(deleted) || deleted < 0 || deleted > items.length) {
          throw new Error('Trakt did not confirm a watchlist removal.');
        }
      }
      return { cancelled: false };
    },
  };
}

export const watchlistApi = createWatchlistApi();
