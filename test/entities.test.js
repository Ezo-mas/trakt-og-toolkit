import test from 'node:test';
import assert from 'node:assert/strict';
import { titleOf, usableId, yearOf } from '../src/core/entities.js';

test('usableId accepts trimmed strings and positive integers only', () => {
  assert.equal(usableId(' tt123 '), 'tt123');
  assert.equal(usableId(42), '42');
  assert.equal(usableId('   '), null);
  assert.equal(usableId(0), null);
  assert.equal(usableId(-1), null);
  assert.equal(usableId(1.5), null);
  assert.equal(usableId(null), null);
  assert.equal(usableId(undefined), null);
});

test('titleOf returns a trimmed title or null', () => {
  assert.equal(titleOf({ title: '  Breaking Bad ' }), 'Breaking Bad');
  assert.equal(titleOf({ title: '   ' }), null);
  assert.equal(titleOf({}), null);
  assert.equal(titleOf(null), null);
});

test('yearOf keeps the CSV minimum and the picker range', () => {
  assert.equal(yearOf({ year: 2008 }, 1), 2008);
  assert.equal(yearOf({ year: 0 }, 1), null);
  assert.equal(yearOf({ year: -5 }, 1), null);
  assert.equal(yearOf({ year: 0 }), 0);
  assert.equal(yearOf({ year: -5 }), -5);
  assert.equal(yearOf({ year: 2008.5 }), null);
  assert.equal(yearOf({}), null);
});
