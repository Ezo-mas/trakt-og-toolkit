/**
 * Fill {placeholders} in a link template. Unknown or empty values are dropped
 * rather than left as literal braces in the URL.
 */
export function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    if (value === undefined || value === null || value === '') return '';
    return encodeURIComponent(String(value));
  });
}

export function hasPlaceholder(template, key) {
  return new RegExp(`\\{${key}\\}`).test(template);
}

/** Placeholder names in `template` that have no value in `vars`. */
export function missingPlaceholders(template, vars) {
  const missing = [];
  for (const [, key] of String(template).matchAll(/\{(\w+)\}/g)) {
    const value = vars[key];
    if ((value === undefined || value === null || value === '') && !missing.includes(key)) missing.push(key);
  }
  return missing;
}

/** "https://youtu.be/abc123", ".../watch?v=abc123", ".../embed/abc123" -> abc123 */
export function youtubeId(url) {
  const match = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

/** Strip a trailing "(2008)" and surrounding whitespace from a heading. */
export function cleanTitle(value) {
  return String(value || '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim();
}

export function parseYear(value) {
  const match = String(value || '').match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}
