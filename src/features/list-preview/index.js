import { el } from '../../core/dom.js';
import { isSignedIn } from '../../core/trakt.js';
import { debugError } from '../../core/log.js';
import { readListPoster } from './data.js';
import { css } from './styles.js';
import { cornerRating, cornerRatingStyles } from './corner-rating.js';
import { ratingsApi } from '../your-ratings/api.js';

const ID = 'ogt-list-preview';
const SLOT = '.list-row .fan .slot';
const FAN = '.list-row .fan';

/**
 * The poster stack of a list card links to the list as a whole. Each slot knows its own title through
 * the media URL, so pointer clicks go to that title while the fan's list link stays intact. The fan is
 * already an anchor, so the slots are not wrapped in nested links; a hidden nav after the stack carries
 * real title links for keyboard and screen-reader users. With the toolkit sign-in, your movie and show
 * ratings appear in the posters' corners (og has none on the fan).
 */
export const listPreview = {
  id: 'list-preview',
  css: css + cornerRatingStyles,
  authScoped: true,
  match(route) {
    return ['lists', 'lists-collaborations', 'liked-lists', 'smart-lists'].includes(route.name) ||
      /^\/users\/[^/]+\/(?:lists|smart-lists)(?:\/|$)/.test(route.path) || /^\/lists(?:\/|$)/.test(route.path);
  },
  mount() {
    if (!document.body || document.getElementById(ID)) return null;
    const marker = el('span', { id: ID, hidden: true });
    document.body.append(marker);
    const slots = new Map();
    const navs = new Map();
    const corners = new Map();
    let ratings = null;
    let ratingsRun = 0;
    let destroyed = false;
    let scheduled = false;

    async function loadRatings() {
      const run = ++ratingsRun;
      ratings = null;
      schedule();
      if (!isSignedIn()) return;
      let next = null;
      try { next = await ratingsApi.loadTitles(); }
      catch (error) { debugError('list preview ratings failed', error); }
      if (destroyed || run !== ratingsRun) return;
      ratings = next;
      schedule();
    }

    function removeCorner(slot) {
      corners.get(slot)?.node.remove();
      corners.delete(slot);
    }

    /** One corner per slot, replaced when the poster or your rating for it changes. */
    function syncCorner(slot, info) {
      const rating = info && ratings?.[info.kind]?.get(info.id);
      const key = rating ? `${info.kind}:${info.id}:${rating}` : null;
      const current = corners.get(slot);
      if (current?.key === key && (!key || current.node.parentNode === slot)) return;
      removeCorner(slot);
      const node = key && cornerRating(rating, `Your rating: ${rating} of 10`);
      if (!node) return;
      slot.append(node);
      corners.set(slot, { key, node });
    }

    function scan() {
      if (destroyed) return;
      const seenSlots = new Set();
      for (const slot of document.querySelectorAll(SLOT)) {
        seenSlots.add(slot);
        const info = readListPoster(slot);
        slot.classList.toggle('ogt-list-preview-slot', Boolean(info));
        if (info) slots.set(slot, info);
        else slots.delete(slot);
        syncCorner(slot, info);
      }
      for (const slot of new Set([...slots.keys(), ...corners.keys()])) {
        if (seenSlots.has(slot) && slot.isConnected) continue;
        slot.classList.remove('ogt-list-preview-slot');
        removeCorner(slot);
        slots.delete(slot);
      }

      const seenFans = new Set();
      for (const fan of document.querySelectorAll(FAN)) {
        const items = [...fan.querySelectorAll('.slot')].map((slot) => slots.get(slot)).filter(Boolean);
        if (!items.length) continue;
        seenFans.add(fan);
        const signature = items.map((item) => `${item.kind}:${item.id}:${item.title}`).join('|');
        const entry = navs.get(fan);
        if (entry?.nav.isConnected && entry.signature === signature) continue;
        entry?.nav.remove();
        const nav = el('nav', { class: 'ogt-list-preview-titles', 'aria-label': 'List preview titles' });
        for (const item of items) nav.append(el('a', { href: item.href, text: item.title }));
        fan.after(nav);
        navs.set(fan, { nav, signature });
      }
      for (const [fan, entry] of navs) {
        if (seenFans.has(fan) && fan.isConnected) continue;
        entry.nav.remove();
        navs.delete(fan);
      }
    }

    /**
     * A plain click follows the matching hidden link, so og's router handles it like any other link;
     * a middle or modified click opens the title in a new tab, as a real link would.
     */
    function navigate(event) {
      const middle = event.type === 'auxclick' && event.button === 1;
      if (!middle && (event.type !== 'click' || event.button !== 0)) return;
      const slot = event.target?.closest?.(SLOT);
      const info = slot && slots.get(slot);
      if (!info) return;
      event.preventDefault();
      event.stopPropagation();
      if (middle || event.ctrlKey || event.metaKey || event.shiftKey) {
        window.open(info.href, '_blank', 'noopener');
        return;
      }
      const link = [...(navs.get(slot.closest('.fan'))?.nav.querySelectorAll('a') ?? [])]
        .find((anchor) => anchor.getAttribute('href') === info.href);
      if (link) link.click();
      else window.location.assign(info.href);
    }

    function schedule() {
      if (scheduled || destroyed) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; scan(); });
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['src', 'aria-describedby'] });
    document.addEventListener('click', navigate, true);
    document.addEventListener('auxclick', navigate, true);
    loadRatings();
    scan();

    return {
      node: marker,
      destroy() {
        destroyed = true;
        observer.disconnect();
        document.removeEventListener('click', navigate, true);
        document.removeEventListener('auxclick', navigate, true);
        for (const slot of slots.keys()) slot.classList.remove('ogt-list-preview-slot');
        for (const { node } of corners.values()) node.remove();
        for (const { nav } of navs.values()) nav.remove();
        slots.clear();
        corners.clear();
        navs.clear();
        marker.remove();
      },
    };
  },
};
