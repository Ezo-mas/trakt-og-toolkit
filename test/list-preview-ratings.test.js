import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { cornerRating } from '../src/features/list-preview/corner-rating.js';

test('cornerRating creates a badge with correct styling', (t) => {
  const window = new Window();
  t.after(() => window.close());
  global.document = window.document;
  global.Node = window.Node;
  
  const badge = cornerRating(8);
  assert.ok(badge, 'badge should be created');
  assert.equal(badge.className, 'ogt-corner-rating');
  assert.equal(badge.getAttribute('role'), 'img');
  assert.equal(badge.getAttribute('aria-label'), 'Your rating: 8');
  assert.match(badge.getAttribute('style'), /--ogt-rating-color:\s*var\(--rating-8\)/);
  
  const text = badge.querySelector('.ogt-corner-rating-text');
  assert.equal(text.textContent, '8');
  assert.equal(text.getAttribute('aria-hidden'), 'true');
});

test('cornerRating accepts custom label', (t) => {
  const window = new Window();
  t.after(() => window.close());
  global.document = window.document;
  global.Node = window.Node;
  
  const badge = cornerRating(10, 'Custom label');
  assert.equal(badge.getAttribute('aria-label'), 'Custom label');
});

test('cornerRating returns null for invalid ratings', (t) => {
  const window = new Window();
  t.after(() => window.close());
  global.document = window.document;
  global.Node = window.Node;
  
  assert.equal(cornerRating(0), null);
  assert.equal(cornerRating(11), null);
  assert.equal(cornerRating(-1), null);
  assert.equal(cornerRating(5.5), null);
  assert.equal(cornerRating('5'), null);
  assert.equal(cornerRating(null), null);
});

test('cornerRating creates badges for all valid ratings 1-10', (t) => {
  const window = new Window();
  t.after(() => window.close());
  global.document = window.document;
  global.Node = window.Node;
  
  for (let i = 1; i <= 10; i++) {
    const badge = cornerRating(i);
    assert.ok(badge, `badge should be created for rating ${i}`);
    assert.equal(badge.querySelector('.ogt-corner-rating-text').textContent, String(i));
    assert.match(badge.getAttribute('style'), new RegExp(`--ogt-rating-color:\\s*var\\(--rating-${i}\\)`));
  }
});
