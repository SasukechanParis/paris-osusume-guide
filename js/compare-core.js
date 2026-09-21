// ホテル比較(純粋関数)。最大3件。スマホで横に広い表を作らず、項目ごとに縦に並べる。
// 掲載するのは、確認できた項目だけ。未確認は「未確認」と出し、「あり」「なし」には決して変換しない。
// 宿泊日で変わる価格・部屋タイプで変わる設備・撮影のための外来の立ち入りは、ホテル全体の保証として扱わない。
// 撮影での訪問(さすけ)と、実際の宿泊(先輩カップル)は区別する。

import { arrondissementLabel } from './render.js';

export const MAX_COMPARE = 3;

// data/hotel-facts.json の項目(値は true / false / 省略=未確認)
export const HOTEL_FACT_FIELDS = [
  { key: 'prep_space', label: '支度・着替えのスペース' },
  { key: 'mirror', label: '鏡' },
  { key: 'natural_light', label: '自然光' },
  { key: 'luggage_storage', label: '荷物預かり' },
  { key: 'elevator', label: 'エレベーター' }
];

export const COMPARE_DISCLAIMER =
  '掲載している項目は、確認できた時点のものです。宿泊日で変わる価格、部屋タイプで変わる設備、撮影のための外来の立ち入りが認められるかは、ホテルごとに確認が必要で、このサイトが保証するものではありません。';

const experienceText = (place) => {
  if (place.source === 'guest') return '先輩カップルが実際に宿泊したホテル';
  const status = place.status === 'curious' ? '(気になっている・未訪問)' : '';
  return `さすけが撮影で訪れたホテル(宿泊ではありません)${status}`;
};

const factCell = (facts, key) => {
  const value = facts?.[key];
  if (value === true || value === false) return `${value ? 'あり' : 'なし'}${facts.verified_on ? `(${facts.verified_on}確認)` : ''}`;
  return '未確認';
};

// hotels: Place[](最大3件に切り詰める)。factsByUid: data/hotel-facts.json の facts
// 戻り値: { hotels, rows: [{ id, label, cells: [{ uid, name, text }] }], hasFacts }
export function buildComparison(hotels, factsByUid = {}) {
  const chosen = hotels.slice(0, MAX_COMPARE);
  const cell = (fn) => chosen.map((p) => ({ uid: p.uid, name: p.name, text: fn(p) }));
  const rows = [
    { id: 'area', label: '立地', cells: cell((p) => [p.arrondissement ? arrondissementLabel(p.arrondissement) : null, p.address].filter(Boolean).join(' ・ ')) },
    { id: 'source', label: '推薦元・経験', cells: cell(experienceText) },
    { id: 'note', label: '一言', cells: cell((p) => p.description ?? '説明はまだありません') }
  ];
  let hasFacts = false;
  for (const field of HOTEL_FACT_FIELDS) {
    const anyKnown = chosen.some((p) => typeof factsByUid[p.uid]?.[field.key] === 'boolean');
    if (!anyKnown) continue; // 1軒も確認できていない項目は、行ごと出さない
    hasFacts = true;
    rows.push({ id: field.key, label: field.label, cells: cell((p) => factCell(factsByUid[p.uid], field.key)) });
  }
  return { hotels: chosen, rows, hasFacts };
}

// 比較に追加/外す(不変)。上限を超えるときは追加しない
export function toggleCompare(selected, uid) {
  if (selected.includes(uid)) return { selected: selected.filter((u) => u !== uid), full: false };
  if (selected.length >= MAX_COMPARE) return { selected, full: true };
  return { selected: [...selected, uid], full: false };
}
