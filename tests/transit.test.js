import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU_GROUPS, pageTabId } from '../js/shell-data.js';
import { PACK_PAGES } from '../scripts/build-offline-pack.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const html = read('transit.html');
const freshness = JSON.parse(read('data/freshness.json'));
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('the page gives the conclusion first: paper tickets are gone, and there are two ways (phone or Navigo Easy)', () => {
  const lede = /<p class="lede">([\s\S]*?)<\/p>/.exec(html)[1];
  assert.match(lede, /紙の切符がもう買えません/);
  assert.match(lede, /スマホに入れる/);
  assert.match(lede, /Navigo Easy/);
  for (const id of ['route-choose', 'prepare', 'route-phone', 'route-card', 'route-card-tap', 'fares']) assert.match(html, new RegExp(`id="${id}"`), id);
});

test('every diagram is a figure with a caption, decorative icons are hidden from screen readers, and steps are a real ordered list', () => {
  const figures = [...html.matchAll(/<figure class="dg" aria-labelledby="(fig\d-cap)">/g)].map((m) => m[1]);
  assert.deepEqual(figures, ['fig1-cap', 'fig2-cap', 'fig3-cap', 'fig4-cap']);
  for (const id of figures) assert.match(html, new RegExp(`<figcaption id="${id}">図\\d:`));
  for (const svg of html.match(/<svg [^>]*>/g) ?? []) assert.match(svg, /aria-hidden="true"/, svg);
  assert.equal((html.match(/<ol class="dg-steps">/g) ?? []).length, 2);
  assert.equal((html.match(/<li class="dg-step">/g) ?? []).length, 8);
});

test('in-page links go to sections that exist', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]), `#${m[1]}`);
});

test('the facts on the page are the ones confirmed against official pages (fares, prices, phone models, old-ticket dates)', () => {
  for (const fact of ['2.55€', '2.05€', '14€', '12.30€', 'iOS 17.5以上', 'Android 8以上', '2026年12月15日', '2027年1月14日', '2027年7月のメトロ1号線']) {
    assert.ok(text.includes(fact), `missing: ${fact}`);
  }
  assert.match(text, /Navigo Easyカード\(2€\)|窓口で、\s*2€/);
  // 確認できていない・古い内容を書いていない
  assert.doesNotMatch(text, /17\.35|回数券|10回券/);
  assert.doesNotMatch(text, /日本で(?:も)?買えます|必ず使えます|問題なく使えます/);
  // 日本のiPhone・カードで通るかは、確認できていないと正直に書く
  assert.match(text, /日本のiPhone・日本で発行されたカードで支払いが通るかどうかは、公式には書かれていません/);
  assert.match(text, /このサイトの考えです/);
});

test('fares in the table match the confirmed claims in freshness.json', () => {
  const claim = (id) => freshness.items.find((i) => i.id === id).claim;
  assert.match(claim('transit-single-ticket'), /2\.55€/);
  assert.match(claim('transit-bus-tram-ticket'), /2\.05€/);
  assert.match(claim('airport-ticket'), /14€/);
  assert.match(claim('navigo-jour-price'), /12\.30€/);
  const rows = [...html.matchAll(/<tr><th scope="row">([^<]+)<\/th><td>([^<]+)<\/td>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(rows, [
    ['メトロ・RER券(1回)', '2.55€'],
    ['バス・トラム券(1回)', '2.05€'],
    ['空港チケット', '14€'],
    ['Orlyvalチケット', '14€'],
    ['Navigo Jour(1日券)', '12.30€']
  ]);
});

test('the dates of card-tap rollouts that had not happened when IDFM wrote them are shown as plans', () => {
  assert.match(html, /2026年6月30日開始の予定/);
  assert.match(html, /2026年7月8日開始の予定/);
});

test('every "確認状況" marker on the page points at an item in freshness.json, and the sources are listed', () => {
  const known = new Set(freshness.items.map((i) => i.id));
  const markers = [...html.matchAll(/data-fresh="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  assert.ok(markers.length >= 8);
  for (const id of markers) assert.ok(known.has(id), id);
  for (const host of ['iledefrance-mobilites.fr', 'bonjour-ratp.fr', 'support.apple.com']) assert.match(html, new RegExp(`href="https://(?:www\\.)?${host.replace('.', '\\.')}`));
  assert.match(html, /<script type="module" src="js\/freshness-badge\.js"><\/script>/);
});

test('the "日本でやること" checklist reuses the shared checklist code and keeps its state on the device', () => {
  assert.match(html, /data-checklist="transit-prep"/);
  assert.match(html, /<script type="module" src="js\/checklists\.js"><\/script>/);
  const ids = [...html.matchAll(/data-check="(transit-p-[a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['transit-p-phone', 'transit-p-app', 'transit-p-test', 'transit-p-fallback']);
});

test('the page is reachable: menu, journey stage "出発前", the guide FAQ, and offline save all include it', () => {
  const links = MENU_GROUPS.flatMap((g) => g.links);
  assert.ok(links.some((l) => l.href === 'transit.html'));
  assert.equal(pageTabId('transit.html'), 'menu');
  assert.match(read('menu.html'), /href="transit\.html"/);
  const journey = JSON.parse(read('data/journey.json'));
  const before = journey.stages.find((s) => s.id === 'before');
  assert.ok(before.items.some((i) => i.links?.some((l) => l.href === 'transit.html')));
  assert.match(read('guide.html'), /<a href="transit\.html">/);
  assert.ok(PACK_PAGES.includes('transit.html'));
  const pack = JSON.parse(read('data/offline-pack.json'));
  assert.ok(pack.pages.includes('transit.html') && pack.css.includes('css/transit.css'));
  const articles = JSON.parse(read('data/search-articles.json')).articles;
  assert.ok(articles.some((a) => a.file === 'transit.html' || a.page === 'transit.html' || /transit\.html/.test(JSON.stringify(a))), 'searchable');
});

test('the layout keeps working with large text: diagrams are HTML/CSS (wrapping), the table stacks on narrow screens', () => {
  const css = read('css/transit.css');
  assert.match(css, /\.fare-table[\s\S]*display: block/, 'the fare table stacks on narrow screens');
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(html, /<text[ >]/, 'no text is drawn inside SVG (it would not follow the reader\'s text size)');
});
