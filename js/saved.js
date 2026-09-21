// 「行きたいリスト」のモデル(純粋関数)。ログインなし・端末内保存。
// 状態は不変: どの関数も新しいリストを返し、元のリストは変更しない。
// リストには「公開データの安定ID(uid)・並び順・行った印・保存日」だけを持つ。名前・ホテル・メモ・位置情報は持たない。

import { parseUid } from './places.js';

export const SAVED_KEY = 'saved';
export const MAX_SAVED = 100;
const LIST_VERSION = 1;

export function emptyList() {
  return { v: LIST_VERSION, items: [] };
}

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// 端末の保存データや外部の入力を、安全な形に整える(壊れた項目・重複・上限超えは捨てる)
export function normalizeList(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return emptyList();
  const seen = new Set();
  const items = [];
  for (const item of raw.items) {
    if (!item || typeof item.uid !== 'string' || !parseUid(item.uid) || seen.has(item.uid)) continue;
    seen.add(item.uid);
    items.push({ uid: item.uid, addedAt: isDate(item.addedAt) ? item.addedAt : '1970-01-01', visited: item.visited === true });
    if (items.length >= MAX_SAVED) break;
  }
  return { v: LIST_VERSION, items };
}

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

// alias(m.septime → r.septime)の対応表。同一店は1件として数える
export function canonicalOf(uid, canonicalMap) {
  return canonicalMap?.get(uid) ?? uid;
}

export function buildCanonicalMap(aliases) {
  const map = new Map();
  for (const entry of aliases?.same_place ?? []) for (const uid of entry.also) map.set(uid, entry.canonical);
  return map;
}

export function has(list, uid, canonicalMap = null) {
  const target = canonicalOf(uid, canonicalMap);
  return list.items.some((item) => canonicalOf(item.uid, canonicalMap) === target);
}

// 戻り値: { list, added, reason? }  reason: 'invalid' | 'duplicate' | 'full'
export function add(list, uid, { canonicalMap = null, now = new Date() } = {}) {
  if (!parseUid(uid)) return { list, added: false, reason: 'invalid' };
  if (has(list, uid, canonicalMap)) return { list, added: false, reason: 'duplicate' };
  if (list.items.length >= MAX_SAVED) return { list, added: false, reason: 'full' };
  const next = { ...list, items: [...list.items, { uid: canonicalOf(uid, canonicalMap), addedAt: today(now), visited: false }] };
  return { list: next, added: true };
}

export function remove(list, uid, canonicalMap = null) {
  const target = canonicalOf(uid, canonicalMap);
  return { ...list, items: list.items.filter((item) => canonicalOf(item.uid, canonicalMap) !== target) };
}

export function toggle(list, uid, options = {}) {
  return has(list, uid, options.canonicalMap)
    ? { list: remove(list, uid, options.canonicalMap), saved: false }
    : { ...add(list, uid, options), saved: true };
}

export function setVisited(list, uid, visited) {
  return { ...list, items: list.items.map((item) => (item.uid === uid ? { ...item, visited: Boolean(visited) } : item)) };
}

// direction: -1(上へ) / +1(下へ)
export function move(list, uid, direction) {
  const index = list.items.findIndex((item) => item.uid === uid);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.items.length) return list;
  const items = [...list.items];
  [items[index], items[target]] = [items[target], items[index]];
  return { ...list, items };
}

// 共有されたリストの取り込み: 既存の並びは保ち、新しいものだけを末尾に足す(既存リストを置き換えない)
// 戻り値: { list, added, duplicates, overflow }
export function mergeImported(list, uids, { canonicalMap = null, now = new Date() } = {}) {
  let next = list;
  let added = 0;
  let duplicates = 0;
  let overflow = 0;
  for (const uid of uids) {
    const result = add(next, uid, { canonicalMap, now });
    if (result.added) {
      next = result.list;
      added += 1;
    } else if (result.reason === 'duplicate') duplicates += 1;
    else if (result.reason === 'full') overflow += 1;
  }
  return { list: next, added, duplicates, overflow };
}

export function loadSaved(store) {
  return normalizeList(store.get(SAVED_KEY));
}

// 戻り値は store.set の結果: { ok } | { ok: false, reason: 'quota' | 'unavailable' }
export function persistSaved(store, list) {
  return store.set(SAVED_KEY, list);
}
