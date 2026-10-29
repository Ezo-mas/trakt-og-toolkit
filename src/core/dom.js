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
