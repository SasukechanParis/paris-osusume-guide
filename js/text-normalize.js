// 検索用の文字の正規化。全角/半角・英字の大小・フランス語のアクセント・ひらがな/カタカナの違いを吸収する。
// 濁点(゛)を落とさないよう、アクセント除去はラテン文字の結合記号(U+0300–036F)だけに限る。

export function normalizeText(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(query) {
  const normalized = normalizeText(query);
  return normalized ? normalized.split(' ') : [];
}
