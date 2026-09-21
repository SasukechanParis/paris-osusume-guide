// カードの操作行に何を出すかの、ページ全体の設定。
// 日本語版の共通シェル(js/shell.js → report-buttons.js)だけが report を有効にする。
// render.js は英語版とも共有しているため、既定は無効のまま(英語版の見た目は変えない)。

export const cardOptions = { report: false };
