import { el } from '../../core/dom.js';
import { forvoUrl, readPersonName } from './data.js';
import { CSS } from './styles.js';

export const pronunciation = {
  id: 'pronunciation',
  css: CSS,
  match(route) {
    return route.name === 'person';
  },
  mount() {
    const name = readPersonName(document);
    if (!name) return null;
    const heading = document.querySelector('.summary .summary-title h1');
    const node = el('a', {
      class: 'ogt-pronounce',
      text: 'Pronounce',
      href: forvoUrl(name),
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    heading.after(node);
    return { node, destroy() { node.remove(); } };
  },
};
