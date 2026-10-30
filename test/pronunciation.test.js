import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { PERSON_HTML } from './fixtures.js';
import { forvoUrl, readPersonName } from '../src/features/pronunciation/data.js';

test('reads and normalizes the summary name', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = PERSON_HTML;
  const heading = window.document.querySelector('.summary .summary-title h1');
  heading.textContent = '  Bryan \n  Cranston  ';
  assert.equal(readPersonName(window.document), 'Bryan Cranston');
  heading.textContent = '  ';
  assert.equal(readPersonName(window.document), null);
  heading.remove();
  assert.equal(readPersonName(window.document), null);
});

test('encodes names for Forvo search', () => {
  assert.equal(forvoUrl('Zoë Saldaña'), 'https://forvo.com/search/Zo%C3%AB%20Salda%C3%B1a/');
  assert.equal(forvoUrl("Lupita Nyong'o"), "https://forvo.com/search/Lupita%20Nyong'o/");
});
