/**
 * Add an "All lists" choice to og's Lists dropdown: the personal lists stay, and the profile's collaborations and
 * liked lists follow them.
 *
 * Rows follow og's ListRow markup (components/media/ListRow.svelte). When og shows its own rows on the page, the new
 * rows reuse their scoped classes, icons and count, tag and share elements, so og's own CSS styles them; the
 * toolkit's CSS is only a fallback for a profile with no personal lists.
 */
import { el, text } from '../../core/dom.js';
import { createView } from './view.js';
import { CSS } from './styles.js';

const OPTION_ID = 'ogt-all-lists-option';
const HASH = '#ogt-all-lists';
const ROUTES = ['lists', 'smart-lists', 'lists-collaborations', 'liked-lists'];
// The open All lists view reopens after the host rebuilds features on an account change.
let resumeProfile = null;
// That request belongs only to the profile's lists page where the account changed. If the first
// remount fails, the host has no mounted feature to tear down, so watch the route itself and drop
// the request once the user leaves that page. og may rewrite the URL while it handles the switch;
// staying on the same profile's lists page keeps the request.
if (typeof document !== 'undefined') {
  document.addEventListener('ogt:routechange', (event) => {
    const route = event.detail?.route;
    if (route?.name === 'lists' && route.id != null && decodeURIComponent(route.id) === resumeProfile) return;
    resumeProfile = null;
  });
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

export const allLists = {
  id: 'all-lists',
  css: CSS,
  authScoped: true,
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
    const resume = resumeProfile === profile;
    resumeProfile = null;
    if (route.name === 'lists' && (resume || location.hash === HASH)) {
      if (!resume) history.replaceState(history.state, '', location.pathname + location.search);
      show();
    }

    return {
      node: item,
      destroy(reason) {
        // The host rebuilds features on an account change; reopen an active view then. Any
        // other teardown (navigation) drops a pending resume.
        if (reason === 'authchange' && active) resumeProfile = profile;
        else resumeProfile = null;
        menu.removeEventListener('click', chooseNative);
        hide();
        view.destroy();
        item.remove();
      },
    };
  },
};
