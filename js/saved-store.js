// 「行きたいリスト」の保存・読み出し(端末内)。どのページからでも同じ状態を見られる。
// 変更のたびに document へ 'saved:change' を送る(保存ボタン・タブのバッジ・保存ページが追従する)。

import { storage } from './storage.js';
import { loadSaved, persistSaved, toggle, has, remove, setVisited, move, mergeImported, buildCanonicalMap } from './saved.js';
import { loadJson } from './data.js';

let canonicalMap = new Map();
let aliasPromise = null;

// 同一店の対応表(1.5KB程度)。読み込めなくても保存はできる(まとめが効かないだけ)
export function ensureAliases() {
  aliasPromise ??= loadJson('data/place-aliases.json')
    .then((aliases) => {
      canonicalMap = buildCanonicalMap(aliases);
      return canonicalMap;
    })
    .catch(() => canonicalMap);
  return aliasPromise;
}

export const getCanonicalMap = () => canonicalMap;
export const getList = () => loadSaved(storage());
export const isSaved = (uid) => has(getList(), uid, canonicalMap);

function commit(list) {
  const result = persistSaved(storage(), list);
  document.dispatchEvent(new CustomEvent('saved:change'));
  return result;
}

// 戻り値: { saved, reason?, persist }  persist.ok=false なら「この端末には保存できていない」
export async function toggleSaved(uid) {
  await ensureAliases();
  const outcome = toggle(getList(), uid, { canonicalMap });
  const persist = commit(outcome.list);
  return { saved: outcome.saved && outcome.added !== false, reason: outcome.reason, persist };
}

export function removeSaved(uid) {
  return commit(remove(getList(), uid, canonicalMap));
}

export function markVisited(uid, visited) {
  return commit(setVisited(getList(), uid, visited));
}

export function moveSaved(uid, direction) {
  return commit(move(getList(), uid, direction));
}

export async function importSaved(uids) {
  await ensureAliases();
  const merged = mergeImported(getList(), uids, { canonicalMap });
  const persist = commit(merged.list);
  return { ...merged, persist };
}

// 別タブで変更されたときも追従する
window.addEventListener('storage', (event) => {
  if (event.key && event.key.includes(':saved')) document.dispatchEvent(new CustomEvent('saved:change'));
});
