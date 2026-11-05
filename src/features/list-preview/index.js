import { el } from '../../core/dom.js';
import { readListPoster } from './data.js';
import { css } from './styles.js';

const ID = 'ogt-list-preview';
const SLOT = '.list-row .fan .slot';
const FAN = '.list-row .fan';

/**
 * The poster stack of a list card links to the list as a whole. Each slot knows its own title through
 * the media URL, so pointer clicks go to that title while the fan's list link stays intact. The fan is
 * already an anchor, so the slots are not wrapped in nested links; a hidden nav after the stack carries
 * real title links for keyboard and screen-reader users.
 */
export const listPreview = {
  id: 'list-preview',
  css,
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
    let destroyed = false;
    let scheduled = false;

    function scan() {
      if (destroyed) return;
      const seenSlots = new Set();
      for (const slot of document.querySelectorAll(SLOT)) {
        seenSlots.add(slot);
        const info = readListPoster(slot);
        if (!info) {
          slots.delete(slot);
          slot.classList.remove('ogt-list-preview-slot');
          continue;
        }
        slot.classList.add('ogt-list-preview-slot');
        slots.set(slot, info);
      }
      for (const slot of slots.keys()) {
        if (seenSlots.has(slot) && slot.isConnected) continue;
        slot.classList.remove('ogt-list-preview-slot');
        slots.delete(slot);
      }

      const seenFans = new Set();
      for (const fan of document.querySelectorAll(FAN)) {
        seenFans.add(fan);
        const items = [...fan.querySelectorAll('.slot')].map((slot) => slots.get(slot)).filter(Boolean);
        if (!items.length) continue;
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

    function navigate(event) {
      if (event.type === 'click' ? event.button !== 0 : event.type !== 'auxclick' || event.button !== 1) return;
      const slot = event.target?.closest?.(SLOT);
      const info = slot && slots.get(slot);
      if (!info) return;
      event.preventDefault();
      event.stopPropagation();
      window.open(info.href, '_self');
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
    scan();

    return {
      node: marker,
      destroy() {
        destroyed = true;
        observer.disconnect();
        document.removeEventListener('click', navigate, true);
        document.removeEventListener('auxclick', navigate, true);
        for (const slot of slots.keys()) slot.classList.remove('ogt-list-preview-slot');
        for (const { nav } of navs.values()) nav.remove();
        slots.clear();
        navs.clear();
        marker.remove();
      },
    };
  },
};
