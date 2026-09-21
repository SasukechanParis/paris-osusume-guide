import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeShare, decodeShare, extractCode, buildShareUrl, toShareText, MAX_SHARE_ITEMS, URL_COMFORT_LENGTH } from '../js/share.js';

test('a share code carries only version and place ids in order, using URL-safe characters', () => {
  const code = encodeShare(['r.septime', 'g.hotel-volney-opera', 'm.frenchie']);
  assert.equal(code, 'v1~r.septime~g.hotel-volney-opera~m.frenchie');
  assert.equal(encodeURIComponent(code), code, 'エンコード不要=そのままURLに載せられる');
});

test('round trip through a full URL, a bare fragment and a pasted code', () => {
  const uids = ['r.septime', 'g.hotel-la-tremoille'];
  const { url } = buildShareUrl('https://example.github.io/paris-osusume-guide/saved.html', uids);
  for (const input of [url, '#s=v1~r.septime~g.hotel-la-tremoille', 'v1~r.septime~g.hotel-la-tremoille', `  ${url}\n`]) {
    assert.deepEqual(decodeShare(input), { ok: true, uids, invalid: 0 }, input);
  }
});

test('duplicates are collapsed and the item count is capped', () => {
  assert.equal(encodeShare(['r.a', 'r.a', 'r.b']), 'v1~r.a~r.b');
  const many = Array.from({ length: MAX_SHARE_ITEMS + 30 }, (_, i) => `r.p-${i}`);
  assert.equal(decodeShare(encodeShare(many)).uids.length, MAX_SHARE_ITEMS);
});

test('malformed or hostile input is rejected without throwing', () => {
  assert.deepEqual(decodeShare(''), { ok: false, reason: 'empty' });
  assert.deepEqual(decodeShare(null), { ok: false, reason: 'empty' });
  assert.deepEqual(decodeShare('hello world'), { ok: false, reason: 'empty' });
  assert.deepEqual(decodeShare('v9~r.a'), { ok: false, reason: 'version' });
  assert.deepEqual(decodeShare('v1'), { ok: false, reason: 'empty' });
  assert.deepEqual(decodeShare('#s=v1~'), { ok: false, reason: 'format' });
  assert.deepEqual(decodeShare('v1~<script>alert(1)</script>'), { ok: false, reason: 'format' });
  assert.deepEqual(decodeShare(`#s=v1~${'r.a~'.repeat(2000)}`), { ok: false, reason: 'too-long' });
});

test('invalid tokens are skipped and counted, valid ones are kept (nothing after a bad token is silently lost)', () => {
  assert.deepEqual(decodeShare('v1~r.a~BAD!~zz.no~g.b'), { ok: true, uids: ['r.a', 'g.b'], invalid: 2 });
  assert.deepEqual(decodeShare('https://x.test/saved.html#s=v1~r.a~BAD!~m.frenchie'), { ok: true, uids: ['r.a', 'm.frenchie'], invalid: 1 });
});

test('the code never contains names, addresses, coordinates or notes', () => {
  const code = encodeShare(['r.septime']);
  assert.doesNotMatch(code, /paris|rue|48\.|2\.3|hôtel|メモ/i);
});

test('a long list is flagged so the UI can suggest the text export instead of a huge link', () => {
  const short = buildShareUrl('https://x.test/saved.html', ['r.a', 'r.b']);
  assert.equal(short.tooLong, false);
  const long = buildShareUrl('https://x.test/saved.html', Array.from({ length: 90 }, (_, i) => `r.restaurant-number-${i}`));
  assert.equal(long.tooLong, true);
  assert.ok(long.url.length > URL_COMFORT_LENGTH);
});

test('text export lists names, addresses and map links in order', () => {
  const text = toShareText([
    { name: 'Septime', address: '80 Rue de Charonne, 75011 Paris', google_maps_url: 'https://maps.example/1' },
    { name: 'Frenchie', address: null, google_maps_url: null }
  ]);
  assert.match(text, /パリで行きたい場所\(2件\)/);
  assert.match(text, /1\. Septime\n {3}80 Rue de Charonne, 75011 Paris\n {3}https:\/\/maps\.example\/1/);
  assert.match(text, /2\. Frenchie/);
  assert.equal(extractCode('https://x.test/saved.html?foo=1#s=v1~r.a'), 'v1~r.a');
});
