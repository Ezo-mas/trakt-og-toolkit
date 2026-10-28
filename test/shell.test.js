import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { showTrailer } from '../src/ui/shell.js';

test('the trailer iframe overrides og\'s referrer policy and has a fallback link', () => {
  const window = new Window({ url: 'https://og.trakt.tv/shows/breaking-bad' });
  const previous = { document: globalThis.document, Node: globalThis.Node, HTMLElement: globalThis.HTMLElement };
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.HTMLElement = window.HTMLElement;
  window.document.body.innerHTML = '<div></div>';

  try {
    const close = showTrailer({ key: 'VFkjBy2b50Q', title: 'Breaking Bad — Trailer' });
    const iframe = window.document.querySelector('.ogt-modal iframe');
    assert.ok(iframe, 'iframe exists');

    // og ships <meta name="referrer" content="same-origin">; without this attribute
    // YouTube gets no Referer and refuses to play (error 153).
    assert.equal(iframe.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
    assert.equal(iframe.getAttribute('src'), 'https://www.youtube.com/embed/VFkjBy2b50Q?autoplay=1&rel=0');

    const fallback = window.document.querySelector('.ogt-modal__link');
    assert.equal(fallback?.getAttribute('href'), 'https://www.youtube.com/watch?v=VFkjBy2b50Q');
    assert.equal(window.document.querySelector('.ogt-modal__close')?.textContent, 'Close');

    close();
    assert.equal(window.document.querySelector('.ogt-modal'), null);
  } finally {
    globalThis.document = previous.document;
    globalThis.Node = previous.Node;
    globalThis.HTMLElement = previous.HTMLElement;
    window.close();
  }
});
