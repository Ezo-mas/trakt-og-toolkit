/** OG's SummaryTitle keeps the title in text nodes, with year/certification in separate elements. */
export function readLibraryTitle(doc) {
  const heading = doc.querySelector('.fanart-header .summary-title h1');
  return [...(heading?.childNodes ?? [])].filter(node => node.nodeType === 3)
    .map(node => node.textContent).join('').trim() || 'this title';
}
