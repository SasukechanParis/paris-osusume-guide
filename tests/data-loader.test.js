import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadJson, DataLoadError } from '../js/data.js';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

test('loadJson appends the cache-busting version and returns parsed JSON', async () => {
  let requested;
  const data = await loadJson('data/a.json', {
    fetchImpl: async (url) => {
      requested = url;
      return jsonResponse([1, 2]);
    }
  });
  assert.deepEqual(data, [1, 2]);
  assert.match(requested, /^data\/a\.json\?v=/);
});

test('loadJson uses & when the path already has a query', async () => {
  let requested;
  await loadJson('data/a.json?x=1', {
    fetchImpl: async (url) => {
      requested = url;
      return jsonResponse({});
    }
  });
  assert.match(requested, /^data\/a\.json\?x=1&v=/);
});

test('loadJson turns HTTP errors into DataLoadError with the status (404 must not look like empty data)', async () => {
  await assert.rejects(
    loadJson('data/missing.json', { fetchImpl: async () => new Response('nope', { status: 404 }) }),
    (err) => err instanceof DataLoadError && err.reason === 'status' && err.status === 404 && err.path === 'data/missing.json'
  );
});

test('loadJson turns network failures into DataLoadError(network)', async () => {
  await assert.rejects(
    loadJson('data/a.json', {
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      }
    }),
    (err) => err instanceof DataLoadError && err.reason === 'network'
  );
});

test('loadJson gives up on slow connections instead of waiting forever', async () => {
  await assert.rejects(
    loadJson('data/slow.json', {
      timeoutMs: 20,
      fetchImpl: (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        })
    }),
    (err) => err instanceof DataLoadError && err.reason === 'timeout'
  );
});

test('loadJson reports malformed JSON as DataLoadError(parse)', async () => {
  await assert.rejects(
    loadJson('data/bad.json', { fetchImpl: async () => new Response('{oops', { status: 200 }) }),
    (err) => err instanceof DataLoadError && err.reason === 'parse'
  );
});
