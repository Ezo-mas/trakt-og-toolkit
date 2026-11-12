import { el } from '../../core/dom.js';
import { serviceColor, serviceIcon, hasServiceIcon } from './icons.js';
import { debugError } from '../../core/log.js';
import { getCustomLinks } from '../../settings.js';
import { resolveCustomLinks, watchNowLinks } from './data.js';
import { presetResolver } from './presets.js';
import { createLookups } from './lookups.js';
import { peekExternalUrl, resolveExternalUrl } from './resolve.js';

const WATCH_ATTR = 'data-ogt-watch-now';

function compactLink(entry, attachResolver) {
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
function watchLink(entry, attachResolver) {
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

function signatureFor(entries) {
  return JSON.stringify(entries.map(({ label, href, icon, surface }) => [label, href, icon, surface]));
}

/** Watch Now dialogs that belong to this summary: a `.watch-now` with a direct dialog sibling. */
function watchNowContainers() {
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

export function createLinks(state) {
  const { meta, route, selection, linksRow, watchFallback } = state;

  const { vars, lookUpShow, lookUpEpisode } = createLookups(state);

  /** Page facts a resolver needs, read at activation so a late show lookup is included. */
  function resolverInput(service) {
    return {
      service,
      kind: meta.kind,
      tmdb: meta.tmdb,
      imdb: meta.imdb,
      directUrl: service === 'metacritic' ? meta.metacriticUrl : meta.rottenTomatoesUrl,
      context: { kind: meta.kind, routeName: route.name, season: selection.season, episode: selection.episode },
    };
  }

  /**
   * Resolve on hover/focus so ordinary navigation can use the exact href. A fast cold click
   * still has a usable search fallback. Late results are ignored after teardown,
   * navigation or a picker/template change.
   */
  function attachResolver(link, source) {
    const service = presetResolver(source, meta.kind);
    if (!service || link.dataset.ogtResolver) return;
    link.dataset.ogtResolver = service;
    const cached = peekExternalUrl(resolverInput(service));
    if (cached) link.setAttribute('href', cached);

    const activate = () => {
      const input = resolverInput(service);
      const exact = peekExternalUrl(input);
      if (exact) {
        if (link.getAttribute('href') !== exact) link.setAttribute('href', exact);
        return;
      }

      const fallbackHref = link.getAttribute('href');
      const pageHref = location.href;
      resolveExternalUrl(input)
        .then((url) => {
          if (!url || state.cancelled || !link.isConnected || location.href !== pageHref) return;
          if (link.getAttribute('href') !== fallbackHref) return;
          link.setAttribute('href', url);
        })
        .catch((error) => { if (!state.cancelled) debugError(`${service} lookup failed`, error); });
    };

    link.addEventListener('pointerenter', activate);
    link.addEventListener('focusin', activate);
    link.addEventListener('click', activate);
    link.addEventListener('auxclick', (event) => { if (event.button === 1) activate(); });
  }

  let renderedEntries = [];

  function renderLinks() {
    const values = vars();
    const entries = resolveCustomLinks(getCustomLinks(), values, meta.kind, meta.genres);
    renderedEntries = entries;
    linksRow.replaceChildren();

    if (!entries.length) {
      linksRow.append(
        el('p', { class: 'ogt-hint', text: 'Add links to your own services: Plex, Jellyfin, Sonarr, or any URL.' }),
      );
    }

    // Grouped like og's sidebar: service rows first, then the square logo grid, then text-only links.
    const services = entries.filter((entry) => entry.surface !== 'reference' && hasServiceIcon(entry.icon));
    const logos = entries.filter((entry) => entry.surface === 'reference' && hasServiceIcon(entry.icon));
    const texts = entries.filter((entry) => !hasServiceIcon(entry.icon));
    for (const [kind, group] of [['services', services], ['logos', logos], ['texts', texts]]) {
      if (group.length) linksRow.append(el('div', { class: `ogt-links-group ogt-links-${kind}` }, group.map((entry) => compactLink(entry, attachResolver))));
    }
    syncWatchNow(entries);
    lookUpShow();
    lookUpEpisode();
  }

  /** Add only watch/play/library links to OG's own Watch Now dialogs; keep every native section and count. */
  function syncWatchNow(entries = renderedEntries) {
    const watch = watchNowLinks(entries);
    const containers = watchNowContainers();

    for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) {
      if (!containers.includes(section.parentElement)) section.remove();
    }

    if (!watch.length) {
      watchFallback.hidden = true;
      watchFallback.replaceChildren();
      delete watchFallback.dataset.ogtSignature;
      return;
    }

    const signature = signatureFor(watch);
    for (const container of containers) {
      const existing = container.querySelector(`:scope > [${WATCH_ATTR}]`);
      if (existing?.dataset.ogtSignature === signature) continue;
      existing?.remove();
      container.append(
        el(
          'div',
          { class: 'ogt-watch-now-section', [WATCH_ATTR]: '', 'data-ogt-signature': signature },
          el(
            'h3',
            { class: 'section-title' },
            'Your services',
            el('span', { class: 'count', text: String(watch.length) }),
          ),
          el('div', { class: 'tiles ogt-watch-now-tiles' }, watch.map((entry) => watchLink(entry, attachResolver))),
        ),
      );
    }

    if (!containers.length) {
      if (watchFallback.dataset.ogtSignature !== signature) {
        watchFallback.replaceChildren(
          el(
            'div',
            { class: 'ogt-watch-fallback-head' },
            el('span', { class: 'ogt-watch-fallback-title', text: 'Watch Now' }),
            el('span', { class: 'ogt-watch-fallback-note', text: 'your links' }),
          ),
          el('div', { class: 'ogt-watch-now-tiles' }, watch.map((entry) => watchLink(entry, attachResolver))),
        );
        watchFallback.dataset.ogtSignature = signature;
      }
      watchFallback.hidden = false;
    } else {
      watchFallback.hidden = true;
    }
  }

  return { renderLinks, syncWatchNow, destroy() {
    for (const section of document.querySelectorAll(`[${WATCH_ATTR}]`)) section.remove();
    watchFallback.replaceChildren();
  } };
}
