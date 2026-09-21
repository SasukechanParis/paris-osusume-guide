// おすすめ一覧の共通処理(カテゴリページ群で共有)。純粋関数は元の配列を変更しない。

import { renderRecommendationList } from './render.js';
import { showEmpty } from './ui-status.js';
import { attachFacts } from './search-core.js';
import { loadOptional } from './places-loader.js';

const STATUS_ORDER = { recommended: 0, curious: 1 };

export function sortByStatus(items) {
  return [...items].sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));
}

// 近く検索の結果で「さすけ/先輩カップル」を見分けられるよう、出どころを付ける
export function tagSource(items, source) {
  return items.map((item) => ({ ...item, source }));
}

// 確認済みの条件(data/place-facts.json)を、uid が付いた項目に足す。ファイルが読めなくても一覧は出す
export async function loadFacts() {
  const file = await loadOptional('data/place-facts.json', { facts: {} });
  return file.facts ?? {};
}

export const withFacts = (items, factsByUid) => attachFacts(items, factsByUid);

// 0件は「近日公開予定」などの空表示、通信失敗とは別扱い(失敗はページ側のエラー表示)
export function renderGroup(items, listId, emptyId, renderOptions = {}) {
  document.getElementById(listId).innerHTML = renderRecommendationList(items, renderOptions);
  const emptyEl = document.getElementById(emptyId);
  if (emptyEl) emptyEl.hidden = items.length > 0;
}

export function showGroupsLoading(listIds) {
  for (const id of listIds) showEmpty(document.getElementById(id), '読み込み中…');
}
