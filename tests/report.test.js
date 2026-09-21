import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REASONS, NOTE_MAX, buildReportText, cleanText, normalizeContact, reasonLabel } from '../js/report.js';
import { renderCardActions, renderReportButton } from '../js/render.js';
import { cardOptions } from '../js/card-options.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const place = { uid: 'r.example', name: 'Boulangerie "A" & B', google_maps_url: 'https://www.google.com/maps/search/?api=1&query=x' };

test('the five reasons are the ones the operator asked for', () => {
  assert.deepEqual(REASONS.map((r) => r.label), ['閉店', '営業時間', '場所', 'リンク', 'その他']);
  assert.equal(reasonLabel('hours'), '営業時間');
  assert.equal(reasonLabel('nope'), null);
});

test('the report text carries the shop name, id, page URL, chosen reason and short note — nothing else', () => {
  const text = buildReportText({
    name: 'Chez Test',
    uid: 'r.chez-test',
    url: 'https://example.github.io/paris-osusume-guide/restaurants.html#place-r.chez-test',
    reason: 'hours',
    note: '日曜は休みでした',
    today: '2026-09-21',
    lat: 48.85,
    lng: 2.35,
    hotel: 'Hotel Secret',
    q: 'ラーメン'
  });
  assert.equal(
    text,
    [
      '【情報の違いの報告】',
      'お店: Chez Test',
      'ID: r.chez-test',
      'ページ: https://example.github.io/paris-osusume-guide/restaurants.html#place-r.chez-test',
      '内容: 営業時間',
      '詳しく: 日曜は休みでした',
      '報告日: 2026-09-21'
    ].join('\n')
  );
  for (const secret of ['48.85', 'Hotel Secret', 'ラーメン']) assert.ok(!text.includes(secret), `${secret} is not included`);
});

test('no text is made without a chosen reason or a shop id; the note is optional, cleaned and capped', () => {
  assert.equal(buildReportText({ name: 'x', uid: 'r.x', reason: null }), null);
  assert.equal(buildReportText({ name: 'x', uid: '', reason: 'closed' }), null);
  assert.equal(buildReportText({ name: 'x', uid: 'r.x', reason: 'made-up' }), null);
  const minimal = buildReportText({ name: 'x', uid: 'r.x', reason: 'closed' });
  assert.ok(!minimal.includes('詳しく') && !minimal.includes('ページ:') && !minimal.includes('報告日'));
  const long = buildReportText({ name: 'x', uid: 'r.x', reason: 'other', note: 'あ'.repeat(NOTE_MAX + 50) });
  assert.equal(long.split('\n').find((l) => l.startsWith('詳しく: ')).length, '詳しく: '.length + NOTE_MAX);
  assert.equal(cleanText(`a${String.fromCharCode(0)}b${String.fromCharCode(7)}c   d`, 20), 'abc d');
});

test('the contact channel is used only when the operator configured a real https or mailto address', () => {
  const config = JSON.parse(read('data/site-config.json'));
  assert.ok(config.report.contact === null || normalizeContact(config) !== null, 'either unset, or a usable channel');
  assert.equal(normalizeContact({}), null);
  assert.equal(normalizeContact({ report: { contact: null } }), null);
  assert.deepEqual(normalizeContact({ report: { contact: { label: 'LINE', url: 'https://line.me/ti/p/abc' } } }), {
    label: 'LINE',
    url: 'https://line.me/ti/p/abc'
  });
  assert.equal(normalizeContact({ report: { contact: { label: 'メール', url: 'mailto:someone@example.com' } } })?.label, 'メール');
  for (const url of ['javascript:alert(1)', 'http://example.com', 'not a url', '']) {
    assert.equal(normalizeContact({ report: { contact: { label: 'x', url } } }), null, url);
  }
  assert.equal(normalizeContact({ report: { contact: { label: '', url: 'https://example.com' } } }), null);
});

test('the report screen never claims anything was sent and never sends anything itself', () => {
  const sheet = read('js/report-sheet.js');
  assert.doesNotMatch(sheet, /送信しました|送信完了|送りました/);
  assert.match(sheet, /送信されません/);
  assert.match(sheet, /まだ送信されていません/);
  assert.doesNotMatch(sheet, /sendBeacon|XMLHttpRequest|\bfetch\(|new Image\(/);
  assert.doesNotMatch(read('js/report.js'), /sendBeacon|XMLHttpRequest|\bfetch\(/);
});

test('cards get a "情報が違っていた" button only when the Japanese shell turned it on, and only for places with an id', () => {
  assert.equal(cardOptions.report, false, 'off by default: render.js is shared with the English site');
  assert.doesNotMatch(renderCardActions(place), /data-report/);
  const on = renderCardActions(place, { report: true });
  assert.match(on, /data-report="r\.example"/);
  assert.match(on, /data-report-name="Boulangerie &quot;A&quot; &amp; B"/);
  assert.match(on, /情報が違っていた/);
  assert.doesNotMatch(renderCardActions({ ...place, uid: undefined }, { report: true }), /data-report/);
  assert.doesNotMatch(renderCardActions({ name: 'x' }, { report: true }), /data-report/);
  assert.match(renderReportButton(place), /^<button type="button" class="report-btn"/);
});

test('the English site does not load the Japanese shell or the report code', () => {
  for (const dir of ['en', 'en/js']) {
    let files;
    try {
      files = readdirSync(join(ROOT, dir)).filter((f) => /\.(html|js)$/.test(f));
    } catch {
      continue;
    }
    for (const f of files) assert.doesNotMatch(read(`${dir}/${f}`), /report-buttons|card-options|js\/shell\.js|analytics-guard/, `${dir}/${f}`);
  }
});
