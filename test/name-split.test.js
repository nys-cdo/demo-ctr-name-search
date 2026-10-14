import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitFullName, otherDivisions, matchKind, key, searchQuery, hasDigit } from '../src/name-split.js';

// The portal's own answers, taken from its splitFullName and otherNameDivisions
// on 2026-10-13. Regenerate them when the portal's rules change.
const portal = JSON.parse(readFileSync(new URL('./portal-splits.json', import.meta.url), 'utf8'));

// JSON leaves out undefined parts, the way the fixture file does.
const plain = (value) => JSON.parse(JSON.stringify(value));

for (const { input, parts, divisions } of portal) {
  test(`splits ${JSON.stringify(input)} the way the portal does`, () => {
    const split = splitFullName(input);
    assert.deepEqual(plain(split), parts);
    assert.deepEqual(plain(split ? otherDivisions(split) : []), divisions);
  });
}

test('a last name under 3 letters must match exactly', () => {
  assert.equal(matchKind('last', 'Wu'), 'exact');
  assert.equal(matchKind('last', "O'B"), 'prefix-or-close');
  assert.equal(matchKind('last', 'Lee'), 'prefix-or-close');
});

test('the middle name and suffix never use close spelling', () => {
  assert.equal(matchKind('middle', 'J.'), 'prefix');
  assert.equal(matchKind('suffix', 'Jr.'), 'suffix');
  assert.equal(matchKind('first', 'Maria'), 'prefix-or-close');
});

test('a two-word part in another division matches by prefix only', () => {
  assert.equal(matchKind('last', 'Taveras Sanchez', true), 'prefix-two-word');
  assert.equal(matchKind('last', 'Sanchez', true), 'prefix-or-close');
});

test('the compared form drops case, accents, and punctuation', () => {
  assert.equal(key('Pérez'), 'perez');
  assert.equal(key("O'Brien"), 'o brien');
  assert.equal(key('Jr.'), 'jr');
});

test('the request carries only the parts that were found', () => {
  assert.equal(searchQuery(splitFullName('Maria')), 'lastName=Maria&limit=10');
  assert.equal(
    searchQuery(splitFullName('Johnson, Michael Jr.')),
    'firstName=Michael&lastName=Johnson&suffix=Jr.&limit=10',
  );
});

test('a digit reads as a license number', () => {
  assert.equal(hasDigit('Maria 2'), true);
  assert.equal(hasDigit('Maria'), false);
});
