// 外部から来る文字列(住所検索の候補名など)を innerHTML に入れる前に必ず通す。
// 自前のJSONは信頼するが、Nominatimなど外部APIの応答は信頼しない。

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}
