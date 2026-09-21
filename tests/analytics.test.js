import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENTS, eventPath, track } from '../js/analytics.js';
import { classifySearch, createSearchTracker } from '../js/search-metrics.js';
import { ANALYTICS_GUARD_SOURCE } from '../js/analytics-guard.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

// ---------- 固定コードだけを送る ----------
test('only a small fixed set of events can be counted, and free text can never become an event code', () => {
  assert.deepEqual(EVENTS, ['search', 'search-zero', 'route', 'save', 'share', 'offline', 'french', 'report']);
  assert.equal(eventPath('search', 'query'), 'event/search/query');
  assert.equal(eventPath('route'), 'event/route');
  assert.equal(eventPath('made-up', 'x'), null);
  for (const text of ['ラーメン', 'a b', 'Rue de Rivoli 12', 'A'.repeat(30), 'https://x.test']) assert.equal(eventPath('search', text), 'event/search', text);
});

test('track() does nothing (and does not throw) when GoatCounter is blocked or broken', () => {
  const saved = globalThis.goatcounter;
  try {
    globalThis.goatcounter = undefined;
    assert.doesNotThrow(() => track('save', 'add'));
    globalThis.goatcounter = {
      count() {
        throw new Error('boom');
      }
    };
    assert.doesNotThrow(() => track('save', 'add'));
    const sent = [];
    globalThis.goatcounter = { count: (v) => sent.push(v) };
    track('report', 'copy');
    track('not-an-event');
    assert.deepEqual(sent, [{ path: 'event/report/copy', title: 'report', event: true }]);
  } finally {
    globalThis.goatcounter = saved;
  }
});

test('every track() call in the code uses a known event and a fixed code', () => {
  const found = [];
  for (const f of readdirSync(join(ROOT, 'js')).filter((n) => n.endsWith('.js') && n !== 'analytics.js')) {
    for (const m of read(`js/${f}`).matchAll(/\btrack\('([^']+)'(?:,\s*([^)]*))?\)/g)) found.push({ f, event: m[1], arg: m[2] });
  }
  assert.ok(found.length >= 8);
  for (const { f, event, arg } of found) {
    assert.ok(EVENTS.includes(event), `${f}: ${event}`);
    // 第2引数は、文字列リテラルか、固定の2択(三項演算子)だけ。変数(検索語・店名など)は渡さない
    if (arg) assert.match(arg, /^('[a-z0-9-]{1,24}'|.+\?\s*'[a-z0-9-]+'\s*:\s*'[a-z0-9-]+')$/, `${f}: ${event}, ${arg}`);
  }
  const events = new Set(found.map((x) => x.event));
  for (const needed of ['route', 'report', 'save', 'share', 'offline', 'french']) assert.ok(events.has(needed), `${needed} is counted`);
});

// ---------- 検索の計測 ----------
test('a search is counted by kind only: with words, with filters, or both; zero results are a separate event', () => {
  assert.equal(classifySearch({ hasQuery: false, hasFilters: false, count: 0 }), null);
  assert.deepEqual(classifySearch({ hasQuery: true, hasFilters: false, count: 5 }), { event: 'search', code: 'query' });
  assert.deepEqual(classifySearch({ hasQuery: false, hasFilters: true, count: 5 }), { event: 'search', code: 'filter' });
  assert.deepEqual(classifySearch({ hasQuery: true, hasFilters: true, count: 5 }), { event: 'search', code: 'mixed' });
  assert.deepEqual(classifySearch({ hasQuery: true, hasFilters: false, count: 0 }), { event: 'search-zero', code: 'query' });
});

function fakeTimers() {
  const queue = new Map();
  let id = 0;
  return {
    timers: {
      set: (fn) => {
        queue.set(++id, fn);
        return id;
      },
      clear: (i) => queue.delete(i)
    },
    fire: () => {
      const fns = [...queue.values()];
      queue.clear();
      fns.forEach((fn) => fn());
    },
    pending: () => queue.size
  };
}

test('typing is not counted key by key: one event after the input settles, never repeated for the same conditions, and the words are never sent', () => {
  const clock = fakeTimers();
  const sent = [];
  const tracker = createSearchTracker({ send: (...args) => sent.push(args), timers: clock.timers });
  tracker.note('q=ら', { hasQuery: true, hasFilters: false, count: 9 });
  tracker.note('q=らー', { hasQuery: true, hasFilters: false, count: 4 });
  tracker.note('q=ラーメン店', { hasQuery: true, hasFilters: false, count: 0 });
  assert.equal(clock.pending(), 1, 'only the latest is waiting');
  clock.fire();
  assert.deepEqual(sent, [['search-zero', 'query']]);
  tracker.note('q=ラーメン店', { hasQuery: true, hasFilters: false, count: 0 });
  clock.fire();
  assert.equal(sent.length, 1, 'same conditions are not counted twice (e.g. switching list/map)');
  tracker.note('', { hasQuery: false, hasFilters: false, count: 0 });
  tracker.note('q=ラーメン店', { hasQuery: true, hasFilters: false, count: 0 });
  clock.fire();
  assert.equal(sent.length, 2, 'clearing and searching again is a new search');
  assert.ok(sent.every((args) => args.length === 2 && !args.join(' ').includes('ラーメン')));
});

test('the default timers work in a real runtime (a bare setTimeout call throws "Illegal invocation" in browsers), and a failure never escapes note()', async () => {
  const sent = [];
  const tracker = createSearchTracker({ send: (...args) => sent.push(args), delay: 5 });
  assert.doesNotThrow(() => tracker.note('a', { hasQuery: true, hasFilters: false, count: 3 }));
  assert.doesNotThrow(() => tracker.note('b', { hasQuery: true, hasFilters: false, count: 3 }));
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(sent, [['search', 'query']]);
  const broken = createSearchTracker({ send: () => {}, timers: { set: () => { throw new TypeError('Illegal invocation'); }, clear: () => {} } });
  assert.doesNotThrow(() => broken.note('c', { hasQuery: true, hasFilters: false, count: 1 }));
  const source = read('js/search-metrics.js');
  assert.doesNotMatch(source, /\{\s*set:\s*setTimeout/, 'timers are wrapped, not passed as bare references');
});

test('the search page reports through the tracker, and passes only counts and yes/no flags', () => {
  const page = read('js/search-page.js');
  assert.match(page, /searchTracker\.note\(/);
  assert.match(page, /hasQuery: Boolean\(state\.q\)/);
});

// ---------- GoatCounter に送る内容から、検索語などを除く ----------
function loadGuard({ origin = 'https://example.github.io' } = {}) {
  const window = {};
  vm.runInNewContext(ANALYTICS_GUARD_SOURCE, { window, location: { origin }, URL, String });
  return window.goatcounter;
}

test('the guard strips ? and # from the counted path, so search words never reach GoatCounter', () => {
  const gc = loadGuard();
  assert.equal(gc.path('/paris-osusume-guide/search.html?q=%E3%83%A9%E3%83%BC%E3%83%A1%E3%83%B3&arr=9e'), '/paris-osusume-guide/search.html');
  assert.equal(gc.path('/paris-osusume-guide/saved.html#s=v1~r.a~r.b'), '/paris-osusume-guide/saved.html');
  assert.equal(gc.path('/'), '/');
  assert.equal(gc.path(''), '/');
});

test('the guard drops a same-site referrer (it can carry a search URL) but keeps an outside one', () => {
  const gc = loadGuard();
  assert.equal(gc.referrer('https://example.github.io/paris-osusume-guide/search.html?q=ramen'), '');
  assert.equal(gc.referrer('https://www.google.com/'), 'https://www.google.com/');
  assert.equal(gc.referrer(''), '');
});

test('when count.js installs its get_data, the guard blanks the query string (q) it would send', () => {
  const gc = loadGuard();
  gc.get_data = (vars) => ({ p: vars.path, r: '', t: 't', e: false, s: 390, b: 0, q: '?q=ラーメン&near=48.85,2.35' });
  const data = gc.get_data({ path: 'event/search/query', event: true });
  assert.equal(data.q, '', 'the query string is not sent');
  assert.equal(data.p, 'event/search/query', 'everything else is unchanged');
});

test('the "?ref=name" marker the operator puts on shared links still reaches GoatCounter, but nothing else from the query does', () => {
  const gc = loadGuard();
  const fake = (q) => {
    gc.get_data = () => ({ p: '/', q });
    return gc.get_data({}).q;
  };
  assert.equal(fake('?ref=yamada'), '?ref=yamada');
  assert.equal(fake('?q=ラーメン&ref=yamada&arr=9e'), '?ref=yamada', 'search words are dropped, the marker is kept');
  assert.equal(fake('?arr=9e&ref=yamada-2'), '?ref=yamada-2');
  assert.equal(fake('?ref=a b'), '', 'a marker containing a character that is not allowed is dropped entirely');
  assert.equal(fake('?ref=名前'), '', 'non-ASCII markers are dropped too (use letters, digits, - and _)');
  assert.equal(fake('?ref=' + 'a'.repeat(41)), '', 'too long: dropped');
  assert.equal(fake('?myref=x&q=ref=y'), '', 'a parameter that only ends in "ref", or a search word containing "ref=", is not the marker');
  assert.equal(fake('?q=septime&near=48.85,2.35'), '');
  assert.equal(fake(''), '');
  assert.equal(fake(undefined), '');
});

test('without count.js (blocked), the guard is harmless', () => {
  const gc = loadGuard();
  assert.equal(gc.get_data, undefined);
  assert.doesNotThrow(() => Object.keys(gc));
});

test('every Japanese page carries the guard before the GoatCounter script; the English pages are left alone', () => {
  for (const f of readdirSync(ROOT).filter((n) => n.endsWith('.html'))) {
    const html = read(f);
    const guard = html.indexOf(ANALYTICS_GUARD_SOURCE);
    assert.ok(guard > 0 && guard < html.indexOf('</head>'), `${f}: guard in <head>`);
    const gc = html.indexOf('gc.zgo.at/count.js');
    if (gc >= 0) assert.ok(guard < gc, `${f}: guard runs before count.js`);
  }
  for (const f of readdirSync(join(ROOT, 'en')).filter((n) => n.endsWith('.html'))) {
    assert.ok(!read(`en/${f}`).includes('defineProperty(g,'), `en/${f}`);
  }
});
