import { el } from '../../core/dom.js';
import { serviceColor, serviceIcon } from './icons.js';

export function compactLink(entry, attachResolver) {
  const label = entry.label.trim() || 'Custom link';
  const icon = serviceIcon(entry.icon);
  const variant = !icon ? 'text' : entry.surface === 'reference' ? 'icon' : 'tile';
  const link = el(
    'a',
    {
      class: `ogt-service-link ogt-service-link--${variant}`,
      href: entry.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': label,
      'data-ogt-tooltip': label,
      'data-ogt-surface': entry.surface,
      style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : undefined,
    },
    icon,
    variant === 'icon' ? null : el('span', { class: 'ogt-service-label', text: label }),
  );
  attachResolver?.(link, entry.source);
  return link;
}

const SURFACE_NOTES = { watch: 'Your service', library: 'Add to library' };

/** A Watch Now tile shaped like OG's provider tiles: a 2:1 logo card with a note underneath. */
export function watchLink(entry, attachResolver) {
  const label = entry.label.trim() || 'Custom link';
  const link = el(
    'a',
    {
      class: 'ogt-watch-now-link',
      href: entry.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': label,
      'data-ogt-surface': entry.surface,
      style: serviceColor(entry.icon) ? `--ogt-brand-tile:${serviceColor(entry.icon)}` : undefined,
    },
    el('span', { class: 'ogt-watch-now-card' }, serviceIcon(entry.icon), el('span', { class: 'ogt-service-name', text: label })),
    el('span', { class: 'ogt-watch-now-note', text: SURFACE_NOTES[entry.surface] || 'Your link' }),
  );
  attachResolver?.(link, entry.source);
  return link;
}

export function signatureFor(entries) {
  return JSON.stringify(entries.map(({ label, href, icon, surface }) => [label, href, icon, surface]));
}

/** Watch Now dialogs that belong to this summary: a `.watch-now` with a direct dialog sibling. */
export function watchNowContainers() {
  const containers = [];
  for (const watchNow of document.querySelectorAll('.watch-now')) {
    const parent = watchNow.parentElement;
    if (!parent) continue;
    for (const child of parent.children) {
      if (child.tagName !== 'DIALOG') continue;
      const links = child.querySelector('.streaming-links');
      if (!links || !/watch now/i.test(child.textContent || '')) continue;
      if (!containers.includes(links)) containers.push(links);
    }
  }
  return containers;
}

