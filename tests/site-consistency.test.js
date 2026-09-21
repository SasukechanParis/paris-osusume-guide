import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSite, classifyLink, collectExternalLinks } from '../scripts/check-site.mjs';

test('the real site has no broken internal links, missing anchors, duplicate ids, bad dates or freshness-list errors', () => {
  const { errors, warnings } = checkSite();
  assert.deepEqual(errors, [], `check-site の結果:\n${errors.join('\n')}`);
  // 英語版の既存の問題(今回の対象外)は警告にとどめる。日本語版の警告は出さない
  assert.deepEqual(warnings.filter((w) => !w.startsWith('en/')), []);
});

// ---------- 検査そのものが、問題を見つけられること ----------
function miniSite(files) {
  const root = mkdtempSync(join(tmpdir(), 'site-check-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  const write = (rel, text) => writeFileSync(join(root, rel), typeof text === 'string' ? text : JSON.stringify(text));
  write('data/official-info.json', { cards: [{ id: 'etias', verified_on: '2026-09-21', sources: [{ label: 'a', url: 'https://example.com/' }] }] });
  write('data/journey.json', { stages: [] });
  write('data/trending.json', []);
  write('data/freshness.json', { default_recheck_days: 120, items: [] });
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  return root;
}

test('check-site reports a missing file, a missing anchor, a duplicate id, a future date and an impossible date', () => {
  const root = miniSite({
    'index.html': '<a href="nowhere.html">x</a><a href="other.html#missing">y</a><a href="other.html#ok">z</a><p id="dup"></p><p id="dup"></p>',
    'other.html': '<p id="ok"></p>',
    'data/updates.json': [{ id: 'a', date: '2999-01-01' }, { id: 'a', date: '2026-02-30' }]
  });
  try {
    const { errors } = checkSite({ root, today: '2026-09-21' });
    const text = errors.join('\n');
    assert.match(text, /nowhere\.html がありません/);
    assert.match(text, /#missing が other\.html にありません/);
    assert.match(text, /id="dup" が重複/);
    assert.match(text, /未来の日付/);
    assert.match(text, /日付が不正/);
    assert.match(text, /id="a" が重複/);
    assert.doesNotMatch(text, /#ok/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('check-site flags a verified freshness item with no source, an unverified one with no next step, and an unknown data-fresh id', () => {
  const root = miniSite({
    'index.html': '<div data-fresh="a b ghost"></div>',
    'data/freshness.json': {
      default_recheck_days: 120,
      items: [
        { id: 'a', verified_on: '2026-09-21', source: null, finding: 'x', where: [] },
        { id: 'b', verified_on: null, source: null, where: [{ page: 'index.html', anchor: 'gone' }] }
      ]
    }
  });
  try {
    const text = checkSite({ root, today: '2026-09-21' }).errors.join('\n');
    assert.match(text, /a: 確認日があるのに出典URL/);
    assert.match(text, /b: 未確認なのに、次にすること/);
    assert.match(text, /index\.html#gone がありません/);
    assert.match(text, /data-fresh="ghost"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('coordinates far from Paris and an expired deadline are warnings, not errors', () => {
  const root = miniSite({
    'index.html': '<p></p>',
    'data/places.json': [{ id: 'far', lat: 35.6, lng: 139.7 }, { id: 'old', expires_on: '2026-01-01' }]
  });
  try {
    const { errors, warnings } = checkSite({ root, today: '2026-09-21' });
    assert.deepEqual(errors, []);
    assert.match(warnings.join('\n'), /パリ周辺から外れています/);
    assert.match(warnings.join('\n'), /期限\(2026-01-01\)が過ぎています/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------- 外部リンクは断定しない ----------
test('external link results never say "closed" and never treat a block or timeout as a dead link', () => {
  assert.equal(classifyLink({ status: 200 }).kind, 'ok');
  assert.equal(classifyLink({ status: 301 }).kind, 'redirect');
  for (const status of [401, 403, 429]) {
    const verdict = classifyLink({ status });
    assert.equal(verdict.kind, 'blocked');
    assert.match(verdict.note, /リンク切れとは限りません/);
  }
  assert.equal(classifyLink({ timedOut: true }).kind, 'timeout');
  assert.equal(classifyLink({ error: 'ENOTFOUND' }).kind, 'unreachable');
  assert.equal(classifyLink({ status: 404 }).kind, 'gone');
  assert.match(classifyLink({ status: 404 }).note, /可能性/);
  assert.equal(classifyLink({ status: 503 }).kind, 'server-error');
  const all = [200, 301, 403, 404, 410, 429, 500, 503].map((status) => classifyLink({ status }).note).concat(classifyLink({ timedOut: true }).note);
  assert.ok(all.every((note) => !/閉店/.test(note)));
});

test('external link collection skips generated map links and analytics, and each link remembers where it came from', () => {
  const links = collectExternalLinks();
  assert.ok(links.length > 20);
  assert.ok(links.every((l) => /^https?:\/\//.test(l.url) && l.from));
  assert.ok(!links.some((l) => /google\.[a-z.]+\/maps|goatcounter/.test(l.url)));
});
