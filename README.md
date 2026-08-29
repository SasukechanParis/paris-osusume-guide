# パリ製パンコンクール図鑑

パリのバゲット・クロワッサンコンクールの日程・ランキング・受賞店情報をまとめた静的サイト。

## ローカルでの確認方法

```bash
python3 -m http.server 8420
```

ブラウザで `http://localhost:8420/` を開く。

## テストの実行

```bash
node --test
```

## データの更新方法

1. `data/contests.json` / `data/results.json` / `data/shops.json` を編集する
2. `node --test tests/data.test.js` でスキーマ・出典URL・shop_id参照の整合性を確認する
3. ローカルサーバーで表示を確認する
4. コミットする

## 自動更新ワークフロー(運用イメージ)

`docs/design.md` の「自動更新ワークフロー」節を参照。週1回、Claudeが公式サイトを巡回して差分の下書きを作成する。完全自動公開はせず、むんたがチャットで内容を確認・承認してからdata/*.jsonを更新する。

## GitHub Pagesでの公開

このリポジトリをGitHubにpushし、リポジトリ設定でGitHub Pagesを有効化する(公開は別途承認の上で行う)。
