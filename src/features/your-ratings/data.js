/** Valid, deduplicated episode ratings; identity is always the show's Trakt ID. */
export function mapRatings(rows) {
  const items = new Map();
  for (const row of rows) {
    const show = row.show?.ids?.trakt;
    const { season, number } = row.episode || {};
    if (!Number.isSafeInteger(show) || show <= 0 || !Number.isInteger(season) || season < 0 ||
        !Number.isInteger(number) || number < 1 || !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 10) continue;
    items.set(`${show}:${season}:${number}`, { show, slug: row.show.ids.slug, season, number, rating: row.rating });
  }
  return [...items.values()];
}

/** One type's ratings (`movie` or `show`) as a Map from Trakt id to 1–10. */
export function mapTitleRatings(rows, type) {
  const items = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Number.isInteger(row?.rating) || row.rating < 1 || row.rating > 10) continue;
    const id = row[type]?.ids?.trakt;
    if (Number.isSafeInteger(id) && id > 0) items.set(id, row.rating);
  }
  return items;
}
export function forShow(items, id) {
  // Resolve slugs once, then filter by numeric identity (never by episode number alone).
  const show = /^\d+$/.test(String(id)) ? Number(id) : items.find((item) => item.slug === id)?.show;
  return items.filter((item) => item.show === show);
}
export function personalAverage(items) {
  return items.length < 2 ? null : items.reduce((sum, item) => sum + item.rating, 0) / items.length;
}
export function averageLabel(items, total) {
  const average = personalAverage(items);
  return average == null ? '' : `Your average: ${average.toFixed(1)} (${items.length}${total == null ? '' : ` of ${total}`} episodes rated)`;
}
/** Start a new subpath after every unrated episode, including missing episode numbers. */
export function linePath(points) {
  let previous = null;
  return points.map(({ number, x, y }) => {
    const command = previous === number - 1 ? 'L' : 'M';
    previous = number;
    return `${command}${x},${y}`;
  }).join('');
}
