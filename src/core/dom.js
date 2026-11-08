/** Small DOM helpers. Everything here is plain DOM — no framework, no globals. */

/**
 * Create an element. Props may include `class`, `text`, `html` (discouraged),
 * `dataset`, `style` (string), and any DOM attribute.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') node.setAttribute('style', value);
    else if (key === 'on') {
      for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
    } else if (key in node && typeof node[key] !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function debounce(fn, ms = 200) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

export function isDetached(node) {
  return !node || !node.isConnected;
}

/** Text with whitespace collapsed. */
export function text(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * The title in og's summary `h1`. The h1 also holds the year, the certification and its tooltip, so the title is the
 * h1's own text nodes. After hydration og may swap that text for a decorated version: Breaking Bad's show page draws
 * periodic-table tiles ("Br", "Ba") in `.element-title` (live 2026-11-09, not yet in trakt/trakt-og), keeping the
 * plain title in a `.visually-hidden` span for screen readers. That span is the title whenever og provides one.
 */
export function headingTitle(heading) {
  if (!heading) return '';
  for (const hidden of heading.querySelectorAll('.visually-hidden')) {
    if (hidden.closest('.year, .certification, .tooltip, [role="tooltip"]')) continue;
    const title = text(hidden);
    if (title) return title;
  }
  return [...heading.childNodes]
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
