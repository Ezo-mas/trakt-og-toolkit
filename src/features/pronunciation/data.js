import { text } from '../../core/dom.js';

export function readPersonName(doc) {
  return text(doc.querySelector('.summary .summary-title h1')) || null;
}

export function forvoUrl(name) {
  return `https://forvo.com/search/${encodeURIComponent(name)}/`;
}
