import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, STORAGE_PREFIX } from '../js/storage.js';

function fakeBackend({ failSet = null } = {}) {
  const data = new Map();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      if (failSet) throw failSet;
      data.set(k, v);
    },
    removeItem: (k) => data.delete(k)
  };
}

test('set/get round-trips JSON under a site-specific, versioned key', () => {
  const backend = fakeBackend();
  const s = createStorage(backend);
  assert.deepEqual(s.set('saved', { items: ['r.a'] }), { ok: true });
  assert.deepEqual(s.get('saved'), { items: ['r.a'] });
  assert.ok([...backend.data.keys()][0].startsWith(`${STORAGE_PREFIX}v1:`));
});

test('a missing or corrupted value falls back instead of throwing (viewing must never break)', () => {
  const backend = fakeBackend();
  const s = createStorage(backend);
  assert.equal(s.get('nothing'), null);
  assert.deepEqual(s.get('nothing', { items: [] }), { items: [] });
  backend.data.set(`${STORAGE_PREFIX}v1:saved`, '{not json');
  assert.deepEqual(s.get('saved', []), []);
});

test('quota errors are reported, and the value still works for the rest of the session', () => {
  const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
  const s = createStorage(fakeBackend({ failSet: quota }));
  const result = s.set('saved', [1, 2, 3]);
  assert.deepEqual(result, { ok: false, reason: 'quota' });
  assert.deepEqual(s.get('saved'), [1, 2, 3]);
});

test('when localStorage is unavailable (private mode / blocked) it degrades to memory and says so', () => {
  const s = createStorage(null);
  assert.equal(s.persistent, false);
  assert.deepEqual(s.set('hotel', { name: 'x' }), { ok: false, reason: 'unavailable' });
  assert.deepEqual(s.get('hotel'), { name: 'x' });
  s.remove('hotel');
  assert.equal(s.get('hotel'), null);
});

test('names() lists only this site\'s keys so a settings page can show and clear them', () => {
  const backend = fakeBackend();
  backend.data.set('other-app:v1:foo', '1');
  const s = createStorage(backend);
  s.set('saved', 1);
  s.set('hotel', 2);
  assert.deepEqual(s.names(), ['hotel', 'saved']);
  s.remove('saved');
  assert.deepEqual(s.names(), ['hotel']);
});
