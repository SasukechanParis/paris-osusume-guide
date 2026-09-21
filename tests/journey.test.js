import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyChecks, normalizeChecks, setChecked, setMemo, resetChecks, mountChecklists } from '../js/checklist.js';
import { createStorage } from '../js/storage.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (name) => JSON.parse(readFileSync(join(ROOT, `data/${name}.json`), 'utf8'));
const journey = load('journey');
const official = load('official-info');
const french = load('french-cards');
const page = (file) => readFileSync(join(ROOT, file), 'utf8');

// ---------- 旅の流れ ----------
test('the journey has the five stages the brief asks for, each with a lead and checklist items', () => {
  assert.deepEqual(journey.stages.map((s) => s.id), ['before', 'arrival', 'shoot', 'free', 'return']);
  for (const stage of journey.stages) {
    assert.ok(stage.title && stage.lead && stage.items.length >= 3, stage.id);
  }
});

test('every journey link points at an existing page and (when given) an existing anchor — nothing is duplicated, only linked', () => {
  const ids = new Set();
  for (const stage of journey.stages) {
    for (const item of stage.items) {
      assert.match(item.id, /^[a-z0-9-]+$/);
      assert.ok(!ids.has(item.id), `duplicate item id ${item.id}`);
      ids.add(item.id);
      assert.ok(item.links?.length || item.official?.length, `${item.id} leads nowhere`);
      for (const link of item.links ?? []) {
        const [pathAndQuery, anchor] = link.href.split('#');
        const file = pathAndQuery.split('?')[0];
        assert.ok(existsSync(join(ROOT, file)), `${link.href}: page missing`);
        if (anchor) assert.match(page(file), new RegExp(`id="${anchor}"`), `${link.href}: anchor missing`);
      }
      for (const id of item.official ?? []) assert.ok(official.cards.some((c) => c.id === id), `unknown official card ${id}`);
    }
  }
});

// ---------- 公式情報 ----------
test('official cards carry what to check, who it is for, official links, sources and a verification date', () => {
  for (const card of official.cards) {
    for (const field of ['title', 'check', 'who', 'summary']) assert.ok(card[field]?.length > 5, `${card.id}.${field}`);
    assert.ok(card.points.length >= 3, card.id);
    assert.match(card.verified_on, /^\d{4}-\d{2}-\d{2}$/, `${card.id} lacks verified_on`);
    assert.ok(card.verified_on <= new Date().toISOString().slice(0, 10), 'verified_on must not be in the future');
    assert.ok(card.sources.length >= 2 && card.links.length >= 2, card.id);
    for (const item of [...card.links, ...card.sources]) assert.match(item.url, /^https:\/\/(?:[a-z0-9-]+\.)+(?:europa\.eu|diplomatie\.gouv\.fr)\//, `${item.url} is not an official EU / French-government source`);
  }
});

test('ETIAS is never presented as already required, and no fixed start date is hard-coded', () => {
  const etias = official.cards.find((c) => c.id === 'etias');
  const text = JSON.stringify(etias);
  assert.match(text, /運用していない|運用が始まっていません/);
  assert.match(text, /最新の状況を確認/);
  assert.doesNotMatch(text, /申請必須|必ず申請|義務付け/);
  assert.doesNotMatch(text, /20\d\d年\d+月\d+日から(?:必要|開始)/, '開始日を断定しない');
  assert.match(text, /受け付けず/, 'このサイトでは申請を受け付けないことを明記');
});

test('EES and ETIAS are kept as separate cards and the difference is explained', () => {
  assert.deepEqual(official.cards.map((c) => c.id), ['etias', 'ees']);
  assert.match(JSON.stringify(official.cards[1]), /別の制度/);
});

// ---------- フランス語カード ----------
test('french cards have unique ids, valid groups, French text, and no invented pronunciation', () => {
  const groups = new Set(french.groups.map((g) => g.id));
  const seen = new Set();
  for (const card of french.cards) {
    assert.ok(!seen.has(card.id), `duplicate ${card.id}`);
    seen.add(card.id);
    assert.ok(groups.has(card.group), `${card.id}: unknown group`);
    assert.ok(card.ja.length > 0 && card.fr.length > 0);
    assert.doesNotMatch(card.fr, /[぀-ヿ一-鿿]/, `${card.id}: French text contains Japanese`);
    if (card.reading) assert.ok(card.from, `${card.id}: 読み方は旅行ガイドにある既存表現だけに付ける`);
  }
  for (const group of french.groups) assert.ok(french.cards.some((c) => c.group === group.id), `${group.id} is empty`);
});

test('phrases marked as from the guide really appear on that guide page (reuse, not invention)', () => {
  const norm = (s) => s.replaceAll('’', "'").replaceAll('&#39;', "'");
  for (const card of french.cards.filter((c) => c.from)) {
    const [file, anchor] = card.from.split('#');
    const html = norm(page(file));
    assert.match(html, new RegExp(`id="${anchor}"`), `${card.from}: anchor missing`);
    assert.ok(html.includes(card.fr.replace(/\.$/, '')) || html.includes(card.fr), `"${card.fr}" is not on ${card.from}`);
  }
});

test('no medical or allergy phrases are offered (a mistake there could matter)', () => {
  const text = french.cards.map((c) => `${c.ja} ${c.fr}`).join(' ');
  assert.doesNotMatch(text, /アレルギー|allerg|médecin|ambulance|pharmacie|douleur|malade/i);
});

// ---------- チェックリスト ----------
test('checklist state updates immutably, resets only the given list, and repairs corrupted data', () => {
  const base = emptyChecks();
  const a = setChecked(base, 'shoot-b-1', true);
  const b = setChecked(a, 'shoot-o-1', true);
  assert.deepEqual(base.done, {});
  assert.deepEqual(resetChecks(b, ['shoot-b-1']).done, { 'shoot-o-1': true });
  assert.deepEqual(setChecked(b, 'shoot-o-1', false).done, { 'shoot-b-1': true });
  assert.equal(setMemo(base, 'time', '9:00').memo.time, '9:00');
  assert.deepEqual(setMemo(setMemo(base, 'time', '9:00'), 'time', '').memo, {});
  const repaired = normalizeChecks({ done: { ok: true, 'BAD KEY!': true, x: 'yes' }, memo: { time: 'x'.repeat(500), bad: 5 } });
  assert.deepEqual(repaired.done, { ok: true });
  assert.equal(repaired.memo.time.length, 120);
  assert.deepEqual(normalizeChecks('nope'), emptyChecks());
});

test('mountChecklists is safe to load on a page without any checklist (no DOM) — pure imports only', () => {
  assert.equal(typeof mountChecklists, 'function');
  assert.equal(createStorage(null).persistent, false);
});
