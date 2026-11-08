import { headingTitle } from '../../core/dom.js';

/** The summary title without its year or certification (see `headingTitle`). */
export function readLibraryTitle(doc) {
  return headingTitle(doc.querySelector('.fanart-header .summary-title h1')) || 'this title';
}
