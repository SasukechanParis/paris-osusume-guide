import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';
import { loadHotel, saveHotel, clearHotel } from '../js/hotel-anchor.js';

const memoryStore = () => createStorage(null);

test('nothing is saved until the user saves; then the hotel round-trips with its saved date', () => {
  const store = memoryStore();
  assert.equal(loadHotel(store), null);
  saveHotel(store, { name: '  Hôtel Volney Opéra ', lat: 48.8698, lng: 2.3302 }, new Date('2026-09-21T10:00:00Z'));
  assert.deepEqual(loadHotel(store), { name: 'Hôtel Volney Opéra', lat: 48.8698, lng: 2.3302, savedAt: '2026-09-21' });
});

test('replacing and clearing the saved hotel works', () => {
  const store = memoryStore();
  saveHotel(store, { name: 'A', lat: 48.86, lng: 2.34 });
  saveHotel(store, { name: 'B', lat: 48.87, lng: 2.35 });
  assert.equal(loadHotel(store).name, 'B');
  clearHotel(store);
  assert.equal(loadHotel(store), null);
});

test('invalid coordinates or empty names are refused instead of stored', () => {
  const store = memoryStore();
  assert.equal(saveHotel(store, { name: '', lat: 48.86, lng: 2.34 }).ok, false);
  assert.equal(saveHotel(store, { name: 'A', lat: NaN, lng: 2.34 }).ok, false);
  assert.equal(saveHotel(store, { name: 'A', lat: 91, lng: 2.34 }).ok, false);
  assert.equal(loadHotel(store), null);
});

test('a tampered stored value is ignored', () => {
  const store = memoryStore();
  store.set('hotel', { name: 'x', lat: 'a', lng: 2 });
  assert.equal(loadHotel(store), null);
});
