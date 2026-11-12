/**
 * Readers for the entities returned by the Trakt API (movies, shows, seasons, episodes and people).
 *
 * Each reader returns null when the field is missing or unusable. Features that need a CSV cell convert at the row,
 * because their columns use '' rather than null. Years differ: the CSV's year column only accepts 1 or more, while
 * the watchlist picker takes any safe integer, so `yearOf` checks an optional minimum.
 */

/** A non-empty string id (trimmed) or a positive numeric id as a string; null otherwise. */
export function usableId(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return null;
}

/** A trimmed title, or null when the entity has no usable title. */
export function titleOf(entity) {
  if (typeof entity?.title !== 'string') return null;
  return entity.title.trim() || null;
}

/** A safe-integer year at or above `minimum` (when given), or null. */
export function yearOf(entity, minimum = null) {
  const year = entity?.year;
  if (!Number.isSafeInteger(year)) return null;
  return minimum == null || year >= minimum ? year : null;
}
