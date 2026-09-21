import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortByStatus, tagSource } from '../js/recommendations.js';
import { describeLoadError } from '../js/ui-status.js';
import { DataLoadError } from '../js/data.js';

test('sortByStatus puts おすすめ before 気になる and does not mutate the input', () => {
  const input = [
    { id: 'a', status: 'curious' },
    { id: 'b', status: 'recommended' },
    { id: 'c' }
  ];
  const snapshot = JSON.stringify(input);
  const sorted = sortByStatus(input);
  assert.deepEqual(sorted.map((x) => x.id), ['b', 'a', 'c']);
  assert.equal(JSON.stringify(input), snapshot);
});

test('tagSource adds the origin (さすけ/先輩カップル) without mutating items', () => {
  const items = [{ id: 'a' }];
  const tagged = tagSource(items, 'guest');
  assert.equal(tagged[0].source, 'guest');
  assert.equal(items[0].source, undefined);
});

test('describeLoadError separates network, timeout, HTTP status and parse failures', () => {
  const messages = ['network', 'timeout', 'status', 'parse'].map((reason) =>
    describeLoadError(new DataLoadError(reason, { path: 'data/x.json', status: reason === 'status' ? 404 : null }))
  );
  assert.equal(new Set(messages).size, 4);
  assert.match(messages[2], /404/);
  assert.match(describeLoadError(new Error('boom')), /もう一度/);
});
