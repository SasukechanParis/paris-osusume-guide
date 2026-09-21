import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPosition, geoErrorMessage, GeoError } from '../js/geolocate.js';

function fakeGeolocation(behavior) {
  return { getCurrentPosition: (ok, ng, options) => behavior(ok, ng, options) };
}

test('requestPosition resolves with lat/lng and asks for a bounded, cached, non-high-accuracy fix', async () => {
  let seen;
  const geolocation = fakeGeolocation((ok, _ng, options) => {
    seen = options;
    ok({ coords: { latitude: 48.87, longitude: 2.33, accuracy: 25 } });
  });
  const pos = await requestPosition({ geolocation });
  assert.deepEqual(pos, { lat: 48.87, lng: 2.33, accuracy: 25 });
  assert.equal(typeof seen.timeout, 'number');
  assert.ok(seen.timeout > 0);
  assert.equal(seen.enableHighAccuracy, false);
});

test('requestPosition maps browser error codes to denied / timeout / unavailable', async () => {
  const cases = [
    [1, 'denied'],
    [3, 'timeout'],
    [2, 'unavailable']
  ];
  for (const [code, kind] of cases) {
    const geolocation = fakeGeolocation((_ok, ng) => ng({ code }));
    await assert.rejects(requestPosition({ geolocation }), (err) => err instanceof GeoError && err.kind === kind);
  }
});

test('requestPosition rejects as unsupported when geolocation is missing', async () => {
  await assert.rejects(requestPosition({ geolocation: undefined }), (err) => err.kind === 'unsupported');
});

test('requestPosition has its own watchdog for browsers that never call back', async () => {
  const geolocation = fakeGeolocation(() => {});
  await assert.rejects(requestPosition({ geolocation, timeoutMs: 5, watchdogMs: 20 }), (err) => err.kind === 'timeout');
});

test('every error kind has a message that names the next step (主要地点/住所)', () => {
  for (const kind of ['unsupported', 'denied', 'timeout', 'unavailable']) {
    assert.match(geoErrorMessage(kind), /主要地点|住所/, kind);
  }
});
