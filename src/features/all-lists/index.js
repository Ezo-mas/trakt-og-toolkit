/**
 * Add an "All lists" choice to og's Lists dropdown: the personal lists stay, and the profile's collaborations and
 * liked lists follow them.
 *
 * Rows follow og's ListRow markup (components/media/ListRow.svelte). When og shows its own rows on the page, the new
 * rows reuse their scoped classes, icons and count, tag and share elements, so og's own CSS styles them; the
 * toolkit's CSS is only a fallback for a profile with no personal lists.
 */
import { el, text } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { MissingClientIdError, isSignedIn } from '../../core/trakt.js';
import { notifySuccess } from '../../ui/success-notification.js';
import { collaborationLists, likedLists, listHref, listPills, listProgressHref, posterUrl } from './data.js';
import { getCollaborationLists, getLikedLists, getListSummary, getViewer } from './api.js';
import { CSS } from './styles.js';

const ROOT_ID = 'ogt-all-lists';
const OPTION_ID = 'ogt-all-lists-option';
const HASH = '#ogt-all-lists';
const ROUTES = ['lists', 'smart-lists', 'lists-collaborations', 'liked-lists'];
const posterRequests = new Map();

const ICONS = {
  Private: ['--color-list-chip-private', 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3'],
  Following: ['--color-list-chip-following', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0Z'],
  Link: ['--color-list-chip-link', 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'],
  'Official List': ['--color-list-chip-official', 'M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1'],
  likes: 'M7 10v10H4V10h3Zm2 10h8a2 2 0 0 0 2-1.6l1-6A2 2 0 0 0 18 10h-4l.6-3.2A2.5 2.5 0 0 0 12 4l-3 6v10Z',
  items: 'M6 3h8l4 4v14H6V3Zm8 0v5h4',
  comments: 'M21 11a7 7 0 0 1-7 7H9l-4 3v-4a7 7 0 1 1 16-6Z',
  progress: 'M4 5h16v5H4z M4 14h16v5H4z M7 7.5h.01 M7 16.5h.01',
  share: 'M12 16V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
};
// og's solid thumbs-up (Font Awesome Free, CC BY 4.0), shown once the viewer liked a list.
// og's VIP label mark (the Trakt logo), for when the page has no native label to copy.
const VIP_MARK = 'M104 363Q133 394 172 412Q211 430 256 430Q279 430 300.50 425Q322 420 342 411L199 269L104 363M198 182L90 290L76 276L323 29Q307 24 290 21Q273 18 256 18Q213 18 176 34Q138 50 110 78Q82 106 66 144Q50 181 50 224Q50 259 61 290.50Q72 322 91 348L199 240L206 247L361 401Q363 400 365.50 398.50Q368 397 370 396L199 225L95 329L81 314L199 196L206 203L387 383Q389 382 391 380Q393 378 395 377L200 182L198 182M360 64L242 182L228 167L346 49L360 64M263 204L249 190L351 88L366 102L263 204M409 362Q434 335 448 299.50Q462 264 462 224Q462 162 429 112Q396 62 343 37L214 167L409 362M256-6Q208-6 166 12Q124 30 93 61Q62 92 44 134Q26 176 26 224Q26 272 44 314Q62 356 93 387Q124 418 166 436Q208 454 256 454Q304 454 346 436Q388 418 419 387Q450 356 468 314Q486 272 486 224Q486 176 468 134Q450 92 419 61Q388 30 346 12Q304-6 256-6M256 480Q203 480 156 460Q110 440 75 405Q40 370 20 324Q0 277 0 224Q0 171 20 124Q40 78 75 43Q110 8 156-12Q203-32 256-32Q309-32 356-12Q402 8 437 43Q472 78 492 124Q512 171 512 224Q512 277 492 324Q472 370 437 405Q402 440 356 460Q309 480 256 480';
const LIKED_ICON = ['0 0 512 512', 'M313 33Q333 37 344 53Q355 69 351 89L349 101Q341 141 320 176L464 176Q484 177 498 190Q511 204 512 224Q511 253 486 267Q503 281 504 304Q504 322 493 335Q482 348 465 351Q472 362 472 376Q470 410 439 422Q440 427 440 432Q439 452 426 466Q412 479 392 480L295 480Q265 480 241 464L203 438Q161 409 160 358L160 320L160 272L160 247Q161 201 196 172L203 166Q244 133 255 82L257 71Q261 51 277 40Q293 29 313 33M32 192L96 192L32 192L96 192Q110 192 119 201Q128 210 128 224L128 448Q128 462 119 471Q110 480 96 480L32 480Q18 480 9 471Q0 462 0 448L0 224Q0 210 9 201Q18 192 32 192'];

function icon(pathData, className = 'ogt-all-lists__icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  for (const [name, value] of Object.entries({ d: pathData, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(name, value);
  svg.append(path);
  return svg;
}

/** og's Lists dropdown trigger ("Lists: Personal") and its popover menu. */
function findDropdown() {
  for (const trigger of document.querySelectorAll('button[popovertarget]')) {
    if (!/^(?:Lists|Liked):/i.test(text(trigger.querySelector('.section')))) continue;
    const menu = document.getElementById(trigger.getAttribute('popovertarget'));
    if (menu) return { trigger, menu };
  }
  return null;
}

/** Scoped classes and elements to copy from og's own rows, or null when the page has none. */
function nativeParts(lists) {
  const row = lists.querySelector('article.list-row');
  if (!row) return null;
  const scoped = (node) => [...(node?.classList ?? [])].filter((name) => name.startsWith('svelte-')).join(' ');
  const counts = [...lists.querySelectorAll('.list-row .counts a.count')];
  return {
    row: scoped(row),
    icon: scoped(lists.querySelector('.list-row svg.icon')),
    likes: lists.querySelector('.list-row .counts > .glass-action'),
    items: counts.find((count) => !count.getAttribute('href')?.endsWith('/comments')),
    comments: counts.find((count) => count.getAttribute('href')?.endsWith('/comments')),
    tag: lists.querySelector('.list-row .chips .tag.tint'),
    text: scoped(lists.querySelector('.list-row .comment-text')),
    share: lists.querySelector('.list-row .tools > span.share'),
    vip: lists.querySelector('.list-row .by .label-vip'),
    progress: lists.querySelector('.list-row .tools a.progress'),
  };
}

function createRows(native) {
  // Row-level elements share ListRow's scope class; without it they fall back to the toolkit's CSS.
  const part = (tag, name, props = {}, ...children) =>
    el(tag, { ...props, class: [name, native?.row].filter(Boolean).join(' ') }, ...children);
  const ownIcon = (path) => icon(path, ['icon', native?.icon].filter(Boolean).join(' '));

  function count(kind, value, href, word, liked = false) {
    if (value == null) return null;
    const words = value === 1 ? word : `${word}s`;
    const template = native?.[kind];
    if (kind === 'likes' && template) {
      // og's like button, as a count: the toolkit doesn't like or unlike lists. Liked, og fills it (GlassAction
      // `selected` and `tinted` in the like colour, with the solid thumb).
      const classes = template.className.split(' ').filter((name) => !liked || name !== 'glass');
      if (liked) classes.push('tinted', 'selected');
      const node = el('span', { class: classes.join(' '), style: liked ? '--action: var(--color-list-card-like)' : template.getAttribute('style'),
        title: `${value.toLocaleString('en-US')} ${words}${liked ? ' · you liked this list' : ''}` },
        ...[...template.childNodes].map((child) => child.cloneNode(true)));
      const svg = liked && node.querySelector('.icon svg');
      if (svg) {
        svg.setAttribute('viewBox', LIKED_ICON[0]);
        svg.querySelector('path')?.setAttribute('d', LIKED_ICON[1]);
      }
      const number = node.querySelector('.number');
      if (number) number.textContent = value.toLocaleString('en-US');
      const label = node.querySelector('.count-text');
      if (label) label.textContent = ` ${words}`;
      return node;
    }
    if (template) {
      const node = template.cloneNode(true);
      node.removeAttribute('aria-describedby');
      node.setAttribute('href', href);
      node.querySelector('strong').textContent = value.toLocaleString('en-US');
      node.querySelector('.count-text').textContent = words;
      return node;
    }
    return el('a', { class: `ogt-all-lists__count ${kind}`, href }, icon(ICONS[kind], 'ogt-all-lists__count-icon'),
      el('strong', { text: value.toLocaleString('en-US') }), el('span', { text: ` ${words}` }));
  }

  function tag(label) {
    const [color, path] = ICONS[label];
    if (native?.tag) {
      return el('span', { class: native.tag.className, style: `--tone: var(${color})` }, ownIcon(path), label);
    }
    return el('span', { class: 'ogt-all-lists__tag', style: `--ogt-list-tag-color: var(${color}, #888)` }, icon(path), label);
  }

  function share(entry) {
    const url = new URL(listHref(entry), location.origin).href;
    const copy = () => void shareList(entry.name, url);
    if (native?.share) {
      const node = native.share.cloneNode(true);
      node.querySelector('[popover]')?.remove();
      const button = node.querySelector('button');
      button?.removeAttribute('aria-describedby');
      button?.setAttribute('title', 'Copy Link');
      button?.addEventListener('click', copy);
      return node;
    }
    return el('button', { type: 'button', class: 'action share', title: 'Copy Link', 'aria-label': 'Copy Link', on: { click: copy } },
      icon(ICONS.share));
  }

  function progress(href) {
    if (!href) return null;
    if (native?.progress) {
      const node = native.progress.cloneNode(true);
      node.removeAttribute('aria-describedby');
      node.setAttribute('href', href);
      node.setAttribute('title', 'View watched progress');
      return node;
    }
    return part('a', 'action progress', { href, title: 'View watched progress', 'aria-label': 'View watched progress' },
      ownIcon(ICONS.progress));
  }

  function fan(entry, posters, loading) {
    const node = part('a', `fan${entry.itemCount === 0 ? ' empty' : ''}`, { href: listHref(entry), tabindex: '-1', 'aria-hidden': 'true' });
    if (entry.itemCount === 0) return node;
    for (let i = 0; i < 5; i++) {
      const poster = posters[i];
      node.append(part('span', 'slot', {}, poster
        ? part('img', 'poster', { src: poster, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' })
        : part('span', loading ? 'poster loading' : `poster placeholder${posters.length ? ' empty' : ''}`)));
    }
    return node;
  }

  function vip(badge) {
    if (!badge) return null;
    const title = badge.tag === 'OG' ? 'Original VIP Member' : 'Executive Producer';
    if (native?.vip) {
      const node = native.vip.cloneNode(true);
      node.querySelectorAll('[popover], .tag, .years').forEach((extra) => extra.remove());
      const name = node.querySelector('.name');
      const mark = name?.querySelector('.mark');
      if (name && mark) {
        name.replaceChildren(mark, badge.label);
        const scope = [...name.classList].filter((c) => c.startsWith('svelte-'));
        if (badge.tag) node.append(el('abbr', { class: ['tag', ...scope].join(' '), text: badge.tag, title }));
        return node;
      }
    }
    // Most pages have no VIP owner to copy from: draw og's compact VipLabel with its CSS (see styles.js).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', ['icon', native?.icon].filter(Boolean).join(' '));
    svg.setAttribute('viewBox', '0 0 512 512');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', VIP_MARK);
    svg.append(path);
    return el('span', { class: 'ogt-vip' },
      el('span', { class: 'ogt-vip__name' }, el('span', { class: 'ogt-vip__mark' }, svg), badge.label),
      badge.tag ? el('abbr', { class: 'ogt-vip__tag', text: badge.tag, title }) : null);
  }

  function description(value) {
    if (!value) return null;
    // og renders descriptions as comment text: blank lines start paragraphs, single newlines break lines.
    const paragraphs = value.split(/\n\s*\n/).map((paragraph) => el('p', { class: native?.text || null },
      paragraph.trim().split('\n').flatMap((line, i) => (i ? [el('br'), line] : [line]))));
    return part('div', 'overview', {}, part('div', 'clamp', {},
      native?.text ? el('div', { class: `comment-text ${native.text}` }, ...paragraphs) : paragraphs));
  }

  return function row(entry, { viewerSlug, loading, liked = false }) {
    const href = listHref(entry);
    const pills = listPills(entry);
    const avatar = entry.kind === 'official' ? null : entry.owner.avatar;
    const frame = part('div', 'fan-frame', {}, fan(entry, entry.posters, loading));
    if (entry.itemCount === 0) frame.append(part('span', 'no-items', { text: 'No items yet' }));
    const node = part('article', 'list-row', { dataset: { listId: entry.id } },
      part('div', 'card', {}, frame,
        part('div', 'body', {},
          part('div', 'head', {}, part('a', 'name-link', { href }, part('h3', '', { text: entry.name })),
            pills.length ? part('span', 'chips', {}, pills.map(tag)) : null),
          part('p', 'by', {}, part('a', 'owner', { href: `/users/${encodeURIComponent(entry.owner.slug)}` },
            part('span', 'avatar', {}, avatar ? part('img', '', { src: avatar, alt: '' }) : null), entry.owner.name),
            vip(entry.owner.vip)),
          description(entry.description),
          part('footer', 'foot', {},
            part('div', 'counts', {},
              count('likes', entry.likes, href, 'like', liked),
              count('items', entry.itemCount, href, 'item'),
              entry.allowComments ? count('comments', entry.commentCount, `${href}/comments`, 'comment') : null),
            part('div', 'tools', {}, progress(listProgressHref(entry, viewerSlug)),
              native?.share ? share(entry) : part('span', 'share', {}, share(entry)))))));
    node.setPosters = (posters) => node.querySelector('.fan').replaceWith(fan(entry, posters, false));
    return node;
  };
}

async function shareList(title, url) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    void notifySuccess('Link copied to your clipboard!');
  } catch (error) {
    debugError('could not copy the list link', error);
  }
}

function postersFor(id) {
  if (!posterRequests.has(id)) {
    posterRequests.set(id, getListSummary(id)
      .then((summary) => (Array.isArray(summary?.images?.posters) ? summary.images.posters : []).map(posterUrl).filter(Boolean).slice(0, 5))
      .catch((error) => {
        posterRequests.delete(id);
        debugError(`could not load posters for list ${id}`, error);
        return [];
      }));
  }
  return posterRequests.get(id);
}

function createView(profile, lists) {
  const container = lists.querySelector(':scope > .container');
  // og's own section and container classes give the view the page's background and width.
  const node = el('div', { id: ROOT_ID, class: `${lists.className} ogt-all-lists` });
  let cancelled = false;
  let loadRevision = 0;
  let loading = null;
  let observer = null;

  function group(name, title, rows, empty) {
    return el('div', { role: 'region', class: `ogt-all-lists__group ogt-all-lists__group--${name}`, 'aria-label': title },
      el('div', { class: container?.className || 'container' },
        el('h2', { class: 'ogt-all-lists__heading', text: title }),
        rows.length ? el('div', { class: 'rows' }, rows) : el('p', { class: 'ogt-all-lists__empty', text: empty })));
  }

  async function load() {
    const revision = ++loadRevision;
    observer?.disconnect();
    observer = null;
    node.replaceChildren(el('p', { class: 'ogt-all-lists__loading', text: 'Loading collaborations and liked lists…' }));
    const results = await Promise.allSettled([getCollaborationLists(profile), getLikedLists(profile),
      isSignedIn() ? getViewer() : Promise.resolve(null)]);
    if (cancelled || revision !== loadRevision) return;
    for (const result of results) if (result.status === 'rejected') debugError('all-lists lookup failed', result.reason);
    const [collaborations, liked, viewer] = results.map((result) => (result.status === 'fulfilled' ? result.value : null));
    const viewerSlug = viewer?.ids?.slug || viewer?.username || null;
    const likedRows = likedLists(liked);
    // Which lists the viewer liked fills their likes pill, as og does. On the viewer's own profile that's every
    // liked row; elsewhere it takes the viewer's own liked lists.
    let likedIds = new Set();
    if (viewerSlug === profile) likedIds = new Set(likedRows.map((entry) => entry.id));
    else if (viewerSlug) {
      try { likedIds = new Set(likedLists(await getLikedLists(viewerSlug)).map((entry) => entry.id)); }
      catch (error) { debugError('viewer liked lists lookup failed', error); }
      if (cancelled || revision !== loadRevision) return;
    }
    const native = nativeParts(lists);
    node.classList.toggle('ogt-all-lists--fallback', !native);
    const row = createRows(native);

    const waiting = new Map();
    const likedNodes = likedRows.map((entry) => {
      const pending = entry.itemCount > 0 && !entry.posters.length;
      const rowNode = row(entry, { viewerSlug, loading: pending, liked: likedIds.has(entry.id) });
      if (pending) waiting.set(rowNode, entry);
      return rowNode;
    });
    node.replaceChildren(
      group('collaborations', 'Collaborations', collaborationLists(collaborations).map((entry) => row(entry, { viewerSlug, liked: likedIds.has(entry.id) })), 'No collaborations.'),
      group('liked', 'Liked', likedNodes, 'No liked lists.'));

    const failed = results.slice(0, 2).filter((result) => result.status === 'rejected');
    if (failed.length) {
      const missingId = failed.some((result) => result.reason instanceof MissingClientIdError);
      node.prepend(el('p', { class: 'ogt-all-lists__error', role: 'status', text: missingId
        ? 'Set a Trakt API client ID in the toolkit menu to load collaborations and liked lists.'
        : 'Some lists could not be loaded. Try again later.' }));
    }

    // Liked lists arrive without posters: read each list's summary as its row nears the screen.
    const fill = (rowNode) => {
      const entry = waiting.get(rowNode);
      waiting.delete(rowNode);
      void postersFor(entry.id).then((posters) => { if (!cancelled) rowNode.setPosters(posters); });
    };
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((changes) => {
        for (const change of changes) {
          if (!change.isIntersecting || !waiting.has(change.target)) continue;
          observer.unobserve(change.target);
          fill(change.target);
        }
      }, { rootMargin: '300px' });
      for (const rowNode of waiting.keys()) observer.observe(rowNode);
    } else {
      for (const rowNode of [...waiting.keys()]) fill(rowNode);
    }
  }

  function startLoad() {
    loading ??= load().catch((error) => debugError('all-lists render failed', error));
    return loading;
  }
  // A different account must not keep private rows; also discard the resolved load promise so a
  // later open fetches instead of returning the old view.
  function reset() {
    loadRevision += 1;
    loading = null;
    observer?.disconnect();
    observer = null;
    node.replaceChildren();
    if (node.isConnected) void startLoad();
  }
  document.addEventListener('ogt:authchange', reset);
  return {
    node,
    load: startLoad,
    destroy() {
      cancelled = true;
      loadRevision += 1;
      loading = null;
      observer?.disconnect();
      document.removeEventListener('ogt:authchange', reset);
      node.remove();
    },
  };
}

export const allLists = {
  id: 'all-lists',
  css: CSS,
  match: (route) => ROUTES.includes(route.name),
  mount(route) {
    const dropdown = findDropdown();
    const lists = document.querySelector('section.lists');
    const source = dropdown && [...dropdown.menu.querySelectorAll('a[href]')]
      .find((link) => link.getAttribute('href').endsWith('/lists/collaborations'));
    if (!source || !lists || document.getElementById(OPTION_ID)) return null;
    const { trigger, menu } = dropdown;
    const profile = decodeURIComponent(route.id);

    // A real link, so og's router takes it from the other list pages; on the personal page it switches in place.
    const option = source.cloneNode(false);
    option.textContent = 'All lists';
    option.setAttribute('href', `/users/${route.id}/lists${HASH}`);
    option.removeAttribute('aria-current');
    option.removeAttribute('aria-label');
    const item = el('li', { id: OPTION_ID }, option);
    source.closest('li').after(item);

    const view = createView(profile, lists);
    const heading = el('h2', { class: 'ogt-all-lists__personal-heading', text: 'Personal' });
    const label = [...trigger.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    const originalLabel = label?.textContent;
    const current = [...menu.querySelectorAll('a[aria-current]')];
    let active = false;

    function show() {
      menu.hidePopover?.();
      if (active) return;
      active = true;
      for (const link of current) link.removeAttribute('aria-current');
      option.setAttribute('aria-current', 'page');
      if (label) label.textContent = originalLabel.replace(originalLabel.trim(), 'All lists');
      const container = lists.querySelector(':scope > .container') || lists;
      container.prepend(heading);
      lists.after(view.node);
      void view.load();
    }
    function hide() {
      if (!active) return;
      active = false;
      option.removeAttribute('aria-current');
      for (const link of current) link.setAttribute('aria-current', 'page');
      if (label) label.textContent = originalLabel;
      heading.remove();
      view.node.remove();
    }
    function choose(event) {
      if (route.name !== 'lists') return;
      event.preventDefault();
      show();
    }
    function chooseNative(event) {
      if (!option.contains(event.target) && event.target.closest?.('a[href]')) hide();
    }
    option.addEventListener('click', choose);
    menu.addEventListener('click', chooseNative);
    if (route.name === 'lists' && location.hash === HASH) {
      history.replaceState(history.state, '', location.pathname + location.search);
      show();
    }

    return {
      node: item,
      destroy() {
        menu.removeEventListener('click', chooseNative);
        hide();
        view.destroy();
        item.remove();
      },
    };
  },
};
