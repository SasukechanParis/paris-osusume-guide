// チェックリスト(旅の流れ・撮影準備)。チェックの状態は端末内だけに保存する。
// 純粋関数(状態の更新)と、ページの [data-checklist] を配線するDOM処理に分ける。
// 集合時間などのメモも端末内だけ。リポジトリにも計測にも顧客別の情報を置かない。

import { storage } from './storage.js';

const KEY = 'checklists';

export function emptyChecks() {
  return { v: 1, done: {}, memo: {} };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// 壊れた保存データを、安全な形に整える
export function normalizeChecks(raw) {
  if (!isPlainObject(raw)) return emptyChecks();
  const done = {};
  if (isPlainObject(raw.done)) {
    for (const [id, value] of Object.entries(raw.done)) if (/^[a-z0-9-]{1,60}$/.test(id) && value === true) done[id] = true;
  }
  const memo = {};
  if (isPlainObject(raw.memo)) {
    for (const [id, value] of Object.entries(raw.memo)) if (/^[a-z0-9-]{1,60}$/.test(id) && typeof value === 'string') memo[id] = value.slice(0, 120);
  }
  return { v: 1, done, memo };
}

export function setChecked(checks, id, checked) {
  const done = { ...checks.done };
  if (checked) done[id] = true;
  else delete done[id];
  return { ...checks, done };
}

export function setMemo(checks, id, text) {
  const memo = { ...checks.memo };
  const value = String(text).slice(0, 120);
  if (value) memo[id] = value;
  else delete memo[id];
  return { ...checks, memo };
}

// 指定したIDのチェックだけを外す(リセットは、そのリストの項目だけに効かせる)
export function resetChecks(checks, ids) {
  const done = { ...checks.done };
  for (const id of ids) delete done[id];
  return { ...checks, done };
}

export const loadChecks = (store = storage()) => normalizeChecks(store.get(KEY));
export const saveChecks = (checks, store = storage()) => store.set(KEY, checks);

// ---------- DOM ----------
// <ul data-checklist="shoot-before"> の中の <input type="checkbox" data-check="ID"> と、
// <input data-memo="ID"> を配線する。[data-checklist-reset] で、そのリストだけをリセットする
export function mountChecklists(root = document, store = storage()) {
  let checks = loadChecks(store);
  const boxes = [...root.querySelectorAll('input[data-check]')];
  const memos = [...root.querySelectorAll('input[data-memo]')];
  const warn = root.querySelector('[data-checklist-status]');

  function paint() {
    for (const box of boxes) box.checked = checks.done[box.dataset.check] === true;
    for (const input of memos) if (document.activeElement !== input) input.value = checks.memo[input.dataset.memo] ?? '';
    for (const counter of root.querySelectorAll('[data-checklist-count]')) {
      const ids = [...root.querySelectorAll(`[data-checklist="${counter.dataset.checklistCount}"] input[data-check]`)].map((b) => b.dataset.check);
      counter.textContent = ids.length ? `${ids.filter((id) => checks.done[id]).length} / ${ids.length}` : '';
    }
  }

  function commit(next) {
    checks = next;
    const result = saveChecks(checks, store);
    if (warn) warn.textContent = result.ok ? '' : 'この端末には保存できていません(プライベートモードなど)。このページを閉じるとチェックが消えます。';
    paint();
  }

  root.addEventListener('change', (event) => {
    const box = event.target.closest?.('input[data-check]');
    if (box) commit(setChecked(checks, box.dataset.check, box.checked));
  });
  root.addEventListener('input', (event) => {
    const input = event.target.closest?.('input[data-memo]');
    if (input) commit(setMemo(checks, input.dataset.memo, input.value));
  });
  root.addEventListener('click', (event) => {
    const reset = event.target.closest?.('[data-checklist-reset]');
    if (reset) {
      const ids = [...root.querySelectorAll(`[data-checklist="${reset.dataset.checklistReset}"] input[data-check]`)].map((b) => b.dataset.check);
      commit(resetChecks(checks, ids));
    }
    if (event.target.closest?.('[data-print]')) window.print();
  });
  paint();
  return { paint };
}
