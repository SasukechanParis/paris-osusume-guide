import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

// 「パリに着いて一番最初にやること」は近くの店探しではなく、旅程の確認(2026-09-22 むんた指摘)。
// ホームの一番目立つ枠(is-primary)と、検索のキーワード候補の並びで、これが逆転していないかを固定する。
test('the most prominent home action is the travel-flow checklist, not nearby food search', () => {
  const html = read('index.html');
  const primary = html.match(/<a class="action-card is-primary" href="([^"]+)">\s*<span class="action-card-title">([^<]+)<\/span>/);
  assert.ok(primary, 'a primary action card exists');
  assert.equal(primary[1], '#journey-h');
  assert.equal(primary[2], '旅の流れ');
  assert.doesNotMatch(html, /action-card is-primary"[^>]*>\s*<span class="action-card-title">近くから探す/, 'nearby search is not the flagship card');
  // スクロールした順番も、旅の流れ→近くから探すの順にそろえる(上のカードと矛盾しないように)
  assert.ok(html.indexOf('id="journey-h"') < html.indexOf('id="find-h"'), 'journey section comes before the nearby-search section');
});

test('the search box placeholder does not hold up ramen as the example search (2026-09-22: fixed to croissant)', () => {
  for (const file of ['index.html', 'search.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /placeholder="[^"]*ラーメン[^"]*"/, file);
    assert.match(html, /placeholder="店名・クロワッサン・免税など"/, file);
  }
});

test('search keyword suggestions lead with "need to know" terms, not food cravings', () => {
  const source = read('js/search-page.js');
  const list = JSON.parse(source.match(/const KEYWORD_SUGGESTIONS = (\[[^\]]+\]);/)[1].replace(/'/g, '"'));
  const needToKnow = ['免税', 'トイレ', '日曜日'];
  const discretionary = ['ラーメン', 'クロワッサン', 'お土産', 'ミシュラン'];
  const lastNeedToKnow = Math.max(...needToKnow.map((k) => list.indexOf(k)));
  const firstDiscretionary = Math.min(...discretionary.map((k) => list.indexOf(k)).filter((i) => i >= 0));
  assert.ok(needToKnow.every((k) => list.includes(k)), 'all need-to-know terms are present');
  assert.ok(lastNeedToKnow < firstDiscretionary, `need-to-know terms (${needToKnow}) should come before discretionary ones (${discretionary})`);
  assert.notEqual(list[0], 'ラーメン', 'ramen is not the first thing offered to search for');
});
