import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIsoDate, addDays, daysBetween, formatJa, resolveItem, itemState, auditItems, badgeModel, renderBadge } from '../js/freshness.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const freshness = readJson('data/freshness.json');
const official = readJson('data/official-info.json');
const files = { 'data/official-info.json': official };

test('date helpers reject impossible dates and count days', () => {
  assert.equal(isIsoDate('2026-09-21'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-9-21'), false);
  assert.equal(isIsoDate(null), false);
  assert.equal(addDays('2026-09-21', 120), '2027-01-19');
  assert.equal(daysBetween('2026-09-21', '2026-10-21'), 30);
  assert.equal(formatJa('2026-09-21'), '2026年9月21日');
});

test('an item with no verification date is "unverified"; it never gets today\'s date filled in', () => {
  const unverified = resolveItem({ id: 'x', verified_on: null, source: null }, files);
  assert.equal(itemState(unverified, { today: '2026-09-21' }).state, 'unverified');
  assert.equal(itemState(unverified, { today: '2026-09-21' }).verifiedOn, null);
  const noField = resolveItem({ id: 'y' }, files);
  assert.equal(noField.verified_on, null);
});

test('a verified item is current until its recheck window ends, then due', () => {
  const item = { id: 'z', verified_on: '2026-09-21', recheck_after_days: 30 };
  assert.equal(itemState(item, { today: '2026-10-20' }).state, 'current');
  assert.equal(itemState(item, { today: '2026-10-21' }).state, 'due');
  assert.equal(itemState({ id: 'w', verified_on: '2026-09-21' }, { today: '2027-01-18', defaultDays: 120 }).state, 'current');
});

test('entry items (ETIAS/EES) read their verification date and source from official-info.json, not from a copy', () => {
  for (const id of ['etias', 'ees']) {
    const raw = freshness.items.find((i) => i.id === id);
    assert.ok(raw.ref, `${id} uses ref`);
    assert.ok(!('verified_on' in raw) && !('source' in raw), `${id} does not duplicate the date/source`);
    const resolved = resolveItem(raw, files);
    const card = official.cards.find((c) => c.id === id);
    assert.equal(resolved.verified_on, card.verified_on);
    assert.equal(resolved.source.url, card.sources[0].url);
  }
  assert.equal(resolveItem({ id: 'q', ref: { file: 'data/official-info.json', card: 'nope' } }, files).refMissing, true);
});

test('freshness.json: every verified item has an https source and a finding; every unverified item says what to do next', () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const { item, state } of auditItems(freshness, files, today)) {
    assert.ok(item.label && item.short, `${item.id} has a label`);
    if (state === 'unverified') {
      assert.equal(item.verified_on, null, `${item.id}: unverified items carry no date`);
      assert.equal(item.source, null, `${item.id}: unverified items carry no source`);
      assert.ok(item.action, `${item.id}: needs a next step`);
    } else {
      assert.match(item.source.url, /^https:\/\//, `${item.id}: source`);
      assert.ok(item.ref || item.finding, `${item.id}: what was confirmed`);
      assert.ok(item.verified_on <= today, `${item.id}: not in the future`);
    }
  }
  const claims = freshness.items.filter((i) => i.topic === 'transit' && !i.ref).map((i) => i.id);
  assert.ok(claims.includes('transit-carnet-10'), 'the 10-ticket price the guide quotes is on the list');
  assert.equal(freshness.items.find((i) => i.id === 'transit-carnet-10').verified_on, null, 'not confirmed against an official page, so no date');
});

test('badge model separates confirmed items (with date and source) from unconfirmed ones', () => {
  const model = badgeModel(['transit-single-ticket', 'transit-carnet-10', 'paper-ticket-end', 'no-such-id'], freshness, files, '2026-09-22');
  assert.deepEqual(model.verified.map((v) => v.id), ['transit-single-ticket']);
  assert.equal(model.verified[0].dateText, '2026年9月21日');
  assert.equal(model.verified[0].due, false);
  assert.equal(model.unverified.length, 2);
  const html = renderBadge(model);
  assert.match(html, /公式で確認\(2026年9月21日\)/);
  assert.match(html, /公式ページでは確認できていない記述/);
  assert.match(html, /href="https:\/\/www\.service-public\.gouv\.fr/);
  assert.doesNotMatch(html, /<script/);
});

test('an overdue confirmation asks the reader to check the official page again instead of hiding it', () => {
  const model = badgeModel(['transit-single-ticket'], freshness, files, '2027-02-01');
  assert.equal(model.verified[0].due, true);
  assert.match(renderBadge(model), /確認から時間がたっています/);
});

test('the corrected tram fare and the fare list agree with the pages that quote them', () => {
  const airport = readFileSync(join(ROOT, 'airport.html'), 'utf8');
  assert.match(airport, /id="orly-t7"[\s\S]*?2\.05€/);
  assert.doesNotMatch(airport, /通常の地下鉄・バスチケットと同じ\(2\.55€\)/);
  const guide = readFileSync(join(ROOT, 'guide.html'), 'utf8');
  assert.match(guide, /data-fresh="transit-single-ticket transit-carnet-10 paper-ticket-end navigo-easy-card-price"/);
});
