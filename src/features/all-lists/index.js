/**
 * All lists in one view.
 *
 * og splits a profile's lists across Personal, Collaborations and Liked pages.
 * This panel sits under the personal list and appends the other two groups on
 * demand, so one scroll shows everything. The endpoints are public, so this
 * needs a client ID but no Trakt sign-in.
 */
import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { collaborationLists, itemCountLabel, likedLists, listHref } from './data.js';
import { getCollaborationLists, getLikedLists } from './api.js';
import { CSS } from './styles.js';

const PANEL_ID = 'ogt-all-lists';
const GROUPS_ID = 'ogt-all-lists-groups';
const TITLE_ID = 'ogt-all-lists-title';

function row(entry) {
  const meta = [itemCountLabel(entry.itemCount), entry.owner.name ? `by ${entry.owner.name}` : null].filter(Boolean);
  const poster = entry.poster
    ? el('img', {
      class: 'ogt-lists__poster',
      src: entry.poster,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
    })
    : null;
  // A poster that fails to load leaves the compact row instead of a broken image.
  poster?.addEventListener('error', () => poster.remove(), { once: true });

  return el(
    'li',
    { class: 'ogt-lists__item' },
    poster,
    el(
      'div',
      { class: 'ogt-lists__body' },
      el('a', { class: 'ogt-lists__name', href: listHref(entry), text: entry.name }),
      meta.length ? el('p', { class: 'ogt-lists__meta', text: meta.join(' · ') }) : null,
      entry.description ? el('p', { class: 'ogt-lists__description', text: entry.description }) : null,
    ),
  );
}

function group({ key, title, lists, empty }) {
  const headingId = `${GROUPS_ID}-${key}`;
  return el(
    'section',
    { class: 'ogt-lists__group', 'aria-labelledby': headingId },
    el(
      'h3',
      {
        class: 'ogt-lists__heading',
        id: headingId,
        'aria-label': `${title}, ${lists.length} ${lists.length === 1 ? 'list' : 'lists'}`,
      },
      title,
      el('span', { class: 'ogt-lists__count', 'aria-hidden': 'true', text: String(lists.length) }),
    ),
    lists.length
      ? el('ul', { class: 'ogt-lists__items' }, ...lists.map(row))
      : el('p', { class: 'ogt-hint', text: empty }),
  );
}

function errorHint(failures, missingClientId) {
  if (missingClientId) return 'Set a Trakt API client ID in the toolkit menu to load the other lists.';
  return `Couldn’t load ${failures.join(' or ')}.`;
}

function createPanel(profile) {
  let cancelled = false;
  let loading = false;
  let loaded = false;
  let expanded = false;

  const groups = el('div', { class: 'ogt-lists__groups', id: GROUPS_ID, hidden: true });
  const hint = el('p', { class: 'ogt-hint', role: 'status', hidden: true });
  const toggle = el('button', {
    class: 'ogt-chip',
    type: 'button',
    text: 'Show all lists',
    'aria-expanded': 'false',
    'aria-controls': GROUPS_ID,
  });
  const retry = el('button', { class: 'ogt-chip', type: 'button', text: 'Try again', hidden: true });

  const node = el(
    'section',
    { class: 'ogt-lists', id: PANEL_ID, 'aria-labelledby': TITLE_ID },
    el(
      'div',
      { class: 'ogt-panel' },
      el(
        'div',
        { class: 'ogt-head' },
        el('h2', { class: 'ogt-title', id: TITLE_ID, text: 'All lists' }),
        el('span', { class: 'ogt-badge', text: 'og toolkit' }),
      ),
      el('p', { class: 'ogt-hint', text: 'Collaborations and liked lists from this profile, without switching pages.' }),
      el('div', { class: 'ogt-row' }, toggle, retry),
      hint,
      groups,
    ),
  );

  function setExpanded(open) {
    expanded = open;
    groups.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide all lists' : 'Show all lists';
  }

  async function load() {
    if (cancelled || loading) return;
    loading = true;
    toggle.setAttribute('aria-disabled', 'true');
    toggle.textContent = 'Loading lists…';
    hint.hidden = true;
    retry.hidden = true;

    const results = await Promise.allSettled([getCollaborationLists(profile), getLikedLists(profile)]);
    if (cancelled) return;

    loading = false;
    toggle.removeAttribute('aria-disabled');
    const [collaborations, liked] = results;
    const failures = [];
    const collaborationRows = collaborations.status === 'fulfilled' ? collaborationLists(collaborations.value) : [];
    const likedRows = liked.status === 'fulfilled' ? likedLists(liked.value) : [];
    if (collaborations.status === 'rejected') failures.push('collaborations');
    if (liked.status === 'rejected') failures.push('liked lists');

    groups.replaceChildren(
      group({ key: 'collaborations', title: 'Collaborations', lists: collaborationRows, empty: 'No collaborations.' }),
      group({ key: 'liked', title: 'Liked lists', lists: likedRows, empty: 'No liked lists.' }),
    );

    const missingClientId = results.some(
      (result) => result.status === 'rejected' && result.reason?.name === 'MissingClientIdError',
    );
    for (const result of results) {
      if (result.status === 'rejected') debugError('all-lists lookup failed', result.reason);
    }

    if (failures.length) {
      hint.textContent = errorHint(failures, missingClientId);
      hint.hidden = false;
      retry.hidden = false;
    }

    // Nothing to show: keep the panel closed so the next click retries.
    loaded = collaborationRows.length > 0 || likedRows.length > 0 || failures.length === 0;
    if (!collaborationRows.length && !likedRows.length && failures.length) {
      loaded = false;
      setExpanded(false);
      return;
    }

    setExpanded(true);
  }

  function onToggle() {
    if (loading) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (loaded) {
      setExpanded(true);
      return;
    }
    void load();
  }

  toggle.addEventListener('click', onToggle);
  retry.addEventListener('click', load);

  return {
    node,
    destroy() {
      cancelled = true;
      toggle.removeEventListener('click', onToggle);
      retry.removeEventListener('click', load);
      node.remove();
    },
  };
}

export const allLists = {
  id: 'all-lists',
  css: CSS,
  match(route) {
    return route.name === 'lists';
  },
  mount(route) {
    if (document.getElementById(PANEL_ID)) return null;
    const listsSection = document.getElementById('lists-heading')?.closest('section.lists') ||
      document.querySelector('section.lists');
    if (!listsSection) return null;

    const panel = createPanel(route.id);
    listsSection.after(panel.node);
    return panel;
  },
};
