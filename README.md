# さすけのパリ図鑑

パリのパンコンクール受賞店、さすけのおすすめ(レストラン・ショコラティエ・お土産)、ミシュラン星付き店をまとめた静的サイト。

## ページ構成

- `index.html` — トップページ(カテゴリ一覧への導線)
- `bread.html` — パンコンクール(日程・ランキング・近くの受賞店検索・今話題のお店)
- `contest.html` — コンクール詳細(年別タブ)
- `recommendations.html` — さすけのおすすめ(レストラン・ショコラティエ・お土産)
- `michelin.html` — ミシュラン星付きレストラン一覧
- `post.html` — 投稿する(Googleフォーム導線、現状プレースホルダー)

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

1. `data/contests.json` / `data/results.json` / `data/shops.json` / `data/trending.json` / `data/recommendations.json` / `data/michelin.json` を編集する
2. `node --test tests/data.test.js` でスキーマ・出典URL・shop_id参照の整合性を確認する
3. ローカルサーバーで表示を確認する
4. コミットする

## 自動更新ワークフロー(運用イメージ)

`docs/design.md` の「自動更新ワークフロー」節を参照。週1回、Claudeが公式サイトを巡回して差分の下書きを作成する。完全自動公開はせず、むんたがチャットで内容を確認・承認してからdata/*.jsonを更新する。

「今話題のお店」(`data/trending.json`)も同様に週1回、Claudeがニュース・グルメメディアを検索して候補を提示し、承認後に反映する(`docs/design.md`の「今話題のお店」節を参照)。

Scheduled Task `paris-bread-weekly-check`(毎週月曜9:05)が両方のチェックを実行し、`docs/pending-updates.md` に下書きを追記する。

## さすけのおすすめ(`recommendations.html`)

`data/recommendations.json` にレストラン・ショコラティエ・お土産の情報を追加すると反映される。`status: "recommended"|"curious"` でバッジ表示を分ける。

## ミシュラン星付き(`michelin.html`)

`data/michelin.json` に三ツ星・二ツ星レストランの情報を持つ。ミシュランガイドの改訂時に手動更新する(自動巡回の対象外)。

## 投稿機能(`post.html`)

訪問者が自分のおすすめ店・感想を投稿できるページ。Googleフォームへの導線を予定(詳細は`docs/design.md`の「投稿機能」節を参照)。現状はフォーム未作成のプレースホルダー。

## GitHub Pagesでの公開

このリポジトリをGitHubにpushし、リポジトリ設定でGitHub Pagesを有効化する(公開は別途承認の上で行う)。
