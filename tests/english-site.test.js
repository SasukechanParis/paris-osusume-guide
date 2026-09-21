import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIsoDate } from '../js/freshness.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const enFiles = readdirSync(join(ROOT, 'en')).filter((f) => f.endsWith('.html'));
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const structuredData = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('every structured-data block on the English pages is valid JSON', () => {
  for (const file of enFiles) assert.doesNotThrow(() => structuredData(read(`en/${file}`)), file);
});

test('no English page repeats a claim that could not be confirmed against an official page, or that has been corrected', () => {
  const stale = [
    [/17\.35/, 'the old paper-booklet price'],
    [/0892/, 'the French interbank number (unconfirmed for foreign cards)'],
    [/0\.35\/min\) but works for cancelling any French-issued card/, 'the unconfirmed description of the 0892 line'],
    [/since a January 2025 update/, 'unconfirmed fare revision date'],
    [/discontinued at the end of February 2026/, 'unconfirmed Roissybus end date'],
    [/7\/25-8\/16/, 'expired Orlyval measure'],
    [/one standard bus\/tram ticket \(€2\)|Standard bus\/tram fare/, 'unconfirmed Noctilien fare'],
    [/Same fare as a standard metro\/bus ticket \(€2\.55\)/, 'the old tram T7 fare'],
    [/paper tickets are disappearing|phased out|retired line by line/, 'paper tickets are already gone'],
    [/station machine/, 'the Navigo Easy card is sold at ticket offices (machines were not confirmed)'],
    [/XS or later|Android phone \(8\.0\+\)/, 'the old phone requirements']
  ];
  for (const file of enFiles) {
    const html = read(`en/${file}`);
    for (const [pattern, why] of stale) assert.doesNotMatch(html, pattern, `en/${file}: ${why}`);
  }
});

test('the ticket answer says what is confirmed: paper tickets are gone, two ways to travel, phone models, fares, and the old-ticket dates', () => {
  const html = read('en/getting-around-paris.html');
  const card = html.match(/<p class="trending-name">Paper tickets are gone[^<]*<\/p>\s*<p class="trending-desc">([\s\S]*?)<\/p>/);
  assert.ok(card, 'the ticket card exists');
  const visible = plain(card[1]);
  for (const fact of ['November 5, 2025', 'Navigo Easy', '€2)', 'ticket office', '€2.55', '€2.05', 'iOS 17.5', 'Android 8', 'Pixel 4', 'December 15, 2026', 'January 14, 2027']) {
    assert.ok(visible.includes(fact), `missing: ${fact}`);
  }
  // 構造化データ(FAQ)の答えも、画面と同じ内容(食い違いは検索結果の表示とずれる)
  const faq = structuredData(html).flatMap((b) => b.mainEntity ?? []).find((q) => /metro app/.test(q.name));
  assert.ok(faq.acceptedAnswer.text.replace(/\s+/g, ' ').includes(visible), 'the FAQ answer contains the same text as the visible card');
});

test('the airport page and its structured data agree on the corrected fares, and unconfirmed service details are gone', () => {
  const html = read('en/airport-transfers.html');
  const answers = structuredData(html).flatMap((b) => b.mainEntity ?? []).map((q) => q.acceptedAnswer.text).join(' ');
  for (const source of [plain(html), answers]) {
    assert.ok(source.includes('The fare is a bus/tram ticket (€2.05 as of 2026; a metro/RER ticket is €2.55).'));
    assert.ok(source.includes('An Orlyval ticket costs €14 (€7 reduced rate).'));
    assert.ok(source.includes('€14 one-way (€7 reduced rate)'));
    assert.doesNotMatch(source, /end of February|Roissybus,?\\?"? was discontinued/, 'no dated claim about Roissybus in the cards or structured data');
  }
  // 導入文の「廃止済みのサービスは載せていない」は、そのまま
  assert.match(plain(html), /Discontinued services \(the old Roissybus, the old Orlybus\) aren't listed/);
});

test('the card-stolen answer points to the reader\'s own issuer and no longer offers the French shared line', () => {
  const html = read('en/emergency-guide.html');
  const card = html.match(/<article class="emergency-card" id="card-stolen">[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(card, /tel:/);
  assert.match(plain(card), /Contact your card issuer/);
  assert.match(card, /economie\.gouv\.fr\/particuliers\/eviter-les-arnaques\/que-faire-en-cas-de-perte-ou-de-vol-de-votre-carte-bancaire/);
  // 3237 は公式(3237.fr)で確認済みなので、そのまま
  assert.match(html, /3237 \(paid line, ~€0\.35\/min\)/);
});

test('"Where to start" on the English home page leads to the right pages (the old #anchors did not exist)', () => {
  const html = read('en/index.html');
  assert.doesNotMatch(html, /practical-guide\.html#/);
  for (const [text, href] of [
    ['How dining in Paris actually works', 'dining-in-paris.html'],
    ['Paris on a Sunday or Monday', 'paris-opening-hours.html'],
    ['Getting into Paris from the airport', 'airport-transfers.html'],
    ['Pickpocket and phone-theft basics', 'getting-around-paris.html#safety']
  ]) assert.match(html, new RegExp(`<a href="${href.replace('.', '\\.')}">${text}</a>`), text);
  assert.match(read('en/getting-around-paris.html'), /id="safety"/);
});

test('the two heavy hero images load as light WebP first, keep the PNG as the fallback, and social previews still use the PNG', () => {
  for (const [file, name] of [['en/index.html', 'hero-paris'], ['en/michelin-star-restaurants-paris.html', 'michelin']]) {
    const html = read(file);
    assert.match(html, new RegExp(`<picture>\\s*<source type="image/webp" srcset="../assets/illustrations/${name}-800\\.webp 800w, ../assets/illustrations/${name}-1400\\.webp 1400w"[^>]*>\\s*<img class="hero-image" src="../assets/illustrations/${name}\\.png" alt="[^"]+">\\s*</picture>`), file);
    for (const size of [800, 1400]) assert.ok(existsSync(join(ROOT, `assets/illustrations/${name}-${size}.webp`)), `${name}-${size}.webp`);
    assert.ok(readFileSync(join(ROOT, `assets/illustrations/${name}-800.webp`)).length < 100 * 1024, 'the 800px WebP is light');
  }
  assert.match(read('en/index.html'), /og:image" content="https:\/\/sasukechanparis\.github\.io\/paris-osusume-guide\/assets\/illustrations\/hero-paris\.png"/);
});

test('the English sitemap dates are valid, and the pages changed on 2026-09-21 say so', () => {
  const sitemap = read('sitemap-en.xml');
  const entries = [...sitemap.matchAll(/<loc>[^<]*\/en\/([a-z-]+)\.html<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]);
  assert.ok(entries.length >= 20);
  for (const [, date] of entries) assert.ok(isIsoDate(date), date);
  for (const page of ['index', 'getting-around-paris', 'emergency-guide', 'airport-transfers', 'michelin-star-restaurants-paris']) {
    assert.equal(Object.fromEntries(entries)[page], '2026-09-21', page);
  }
});

test('the English corrections are recorded next to the Japanese ones', () => {
  const freshness = JSON.parse(read('data/freshness.json'));
  const pages = new Set([...freshness.corrections, ...freshness.withheld].map((x) => x.page).filter((p) => p.startsWith('en/')));
  for (const page of ['en/getting-around-paris.html', 'en/emergency-guide.html', 'en/airport-transfers.html', 'en/index.html']) assert.ok(pages.has(page), page);
});
