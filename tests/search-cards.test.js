import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPlaceCard, renderArticleCard } from '../js/search-cards.js';
import { buildPlaces, fromRecommendations, indexPlace } from '../js/places.js';

const load = (path) => JSON.parse(readFileSync(new URL(`../data/${path}.json`, import.meta.url)));
const rec = (id) => indexPlace(fromRecommendations(load('recommendations')).find((p) => p.id === id));

test('a place card shows name, 推薦元, status, straight-line distance and separate 見る/経路 buttons — no photo slot', () => {
  const place = rec('septime');
  const html = renderPlaceCard(place, { distanceKm: 0.35, origin: { lat: 48.8721, lng: 2.3323, kind: 'spot' } });
  assert.match(html, /Septime/);
  assert.match(html, /さすけ/);
  assert.match(html, /気になる\(未訪問\)/);
  assert.match(html, /350m<\/span><span class="nearby-distance-note">直線距離/);
  assert.match(html, /Googleマップで見る/);
  assert.match(html, /経路を見る/);
  assert.match(html, /origin=48\.8721%2C2\.3323/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /data-uid="r\.septime"/);
});

test('names and descriptions are escaped (a shop name can contain "&")', () => {
  const place = indexPlace({ ...rec('french-paradox'), name: 'A & <b>B</b>', description: '<script>x</script>' });
  const html = renderPlaceCard(place);
  assert.match(html, /A &amp; &lt;b&gt;B&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('no invented conditions: facts appear only when the data has them, with the verification date', () => {
  const plain = renderPlaceCard(rec('septime'));
  assert.doesNotMatch(plain, /fact-row|予算|予約/);
  const withFacts = renderPlaceCard({ ...rec('septime'), facts: { reservation: 'required', verified_on: '2026-09-01' } });
  assert.match(withFacts, /予約: 必要/);
  assert.match(withFacts, /2026-09-01確認/);
  assert.doesNotMatch(withFacts, /予算/);
});

test('merged places show both the recommendation and the Michelin stars', () => {
  const merged = buildPlaces(
    { recommendations: load('recommendations'), michelin: load('michelin') },
    load('place-aliases')
  ).find((p) => p.uid === 'r.septime');
  const html = renderPlaceCard(merged);
  assert.match(html, /ミシュラン星付き/);
  assert.match(html, /★/);
  assert.match(html, /気になる\(未訪問\)/, '未訪問の区別は消さない');
});

test('articles link to the exact anchor', () => {
  const html = renderArticleCard({ page: 'guide.html', anchor: 'faq-closed', title: '定休日', section: '旅行ガイド', summary: 'x' });
  assert.match(html, /href="guide\.html#faq-closed"/);
});
