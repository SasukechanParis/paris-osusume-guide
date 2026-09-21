// 「確認済みの条件」で絞り込める項目。データに値が1件でもあるものだけ画面に出す(search-core.js が判定)。
// 依存なしの葉のモジュール(render.js・search-core.js の双方から安全に読める)。

export const FACT_FILTERS = [
  { key: 'budget_band', param: 'budget', label: '予算(1人あたりの目安)', labels: { '€': '€(手頃)', '€€': '€€', '€€€': '€€€(高め)' } },
  { key: 'reservation', param: 'resv', label: '予約', labels: { required: '必要', recommended: 'あった方がよい', not_needed: '不要と確認済み' } },
  { key: 'indoor', param: 'indoor', label: '屋内・屋外', labels: { true: '屋内', false: '屋外' } },
  { key: 'sunday_open', param: 'sun', label: '日曜営業', labels: { true: '日曜営業を確認済み' } },
  { key: 'for_whom', param: 'for', label: '誰向け(お土産)', labels: { bulk: 'ばらまき用', family: '家族・恋人向け', self: '自分用' } },
  { key: 'storage', param: 'keep', label: '保存条件(お土産)', labels: { ambient: '常温で持ち帰れる', chilled: '要冷蔵' } }
];
