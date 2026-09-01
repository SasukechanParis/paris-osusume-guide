# パリおすすめデータベース

パリのパンコンクール受賞店、さすけと先輩カップルのおすすめ(レストラン・ショコラティエ・パン屋さん・お土産・スーパーで買えるおすすめ・ホテル)、ミシュラン星付き店をまとめた静的サイト。

## ページ構成

- `index.html` — トップページ(今話題のこと・カテゴリ一覧への導線)
- `bread.html` — パンコンクール(日程・ランキング・近くの受賞店検索)
- `contest.html` — コンクール詳細(年別タブ)
- `michelin.html` — ミシュラン星付きレストラン一覧(近くの店検索つき)
- `restaurants.html` / `chocolatiers.html` / `bakeries.html` / `souvenirs.html` / `supermarket.html` / `hotels.html` — カテゴリ別おすすめ(「さすけのおすすめ」⇔「先輩カップルのおすすめ」タブ、近くの店検索つき)
- `map.html` — 地図(全カテゴリのピンをLeaflet.js + OpenStreetMapで1枚の地図に表示、カテゴリ・区で絞り込み可能)
- `shop.html` — 店舗単位ページ(`?id=`で指定した店の全コンクール受賞歴を年度横断で表示、複数受賞バッジ付き)
- `post.html` — 投稿する(Googleフォームへのボタンリンク)

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

1. `data/contests.json` / `data/results.json` / `data/shops.json` / `data/trending.json` / `data/recommendations.json` / `data/guest-recommendations.json` / `data/michelin.json` を編集する
2. `node --test tests/data.test.js` でスキーマ・出典URL・shop_id参照の整合性を確認する
3. ローカルサーバーで表示を確認する
4. コミットする

Googleマップリンクは店名+住所のテキスト検索(`?api=1&query=店名 住所`)で構成する。座標(`lat`/`lng`)は距離計算専用で、マップリンク自体には使わない。

## 自動更新ワークフロー(運用イメージ)

`docs/design.md` の「自動更新ワークフロー」節を参照。週1回、Claudeが公式サイトを巡回して差分の下書きを作成する。完全自動公開はせず、むんたがチャットで内容を確認・承認してからdata/*.jsonを更新する。

「今話題のこと」(`data/trending.json`)も同様に週1回、Claudeがニュース・メディアを検索して候補を提示し、承認後に反映する。対象はパン屋に限らずジャンルを問わない(`docs/design.md`の「今話題のこと」節を参照)。

Scheduled Task `paris-bread-weekly-check`(毎週月曜9:05)が両方のチェックを実行し、`docs/pending-updates.md` に下書きを追記する。

## カテゴリ別おすすめ(レストラン/ショコラティエ/パン屋さん/お土産/スーパーで買えるおすすめ/ホテル)

各ページは「さすけのおすすめ」(`data/recommendations.json`)と「先輩カップルのおすすめ」(`data/guest-recommendations.json`)をタブで切り替える。カテゴリ値は `restaurant` / `chocolatier` / `bakery` / `souvenir` / `supermarket` / `hotel` の6種。`recommendations.json`側は`status: "recommended"|"curious"`でバッジ表示を分ける。`bakery`・`supermarket`はデータ未整備のため現状空(近日公開表示)。

## ミシュラン星付き(`michelin.html`)

`data/michelin.json` に三ツ星・二ツ星レストランの情報を持つ。ミシュランガイドの改訂時に手動更新する(自動巡回の対象外)。

## 投稿機能(`post.html`)

訪問者が自分のおすすめ店・感想を投稿できるページ。Googleフォーム(https://forms.gle/RqxPGi8SPc8pb9TX9)を別タブで開くボタンを設置済み(詳細は`docs/design.md`の「投稿機能」節を参照)。承認後は`data/guest-recommendations.json`に追加し、各カテゴリページの「先輩カップルのおすすめ」タブに反映する。

## GitHub Pagesでの公開

公開URL: https://sasukechanparis.github.io/paris-osusume-guide/

2026-09-01にリポジトリを公開(public)で作成し、GitHub Pagesを有効化した。`main`ブランチにpushすると自動で反映される。URLは検索エンジンには特に対策していないが、公式LINEのリッチメニュー等では告知せず、むんたが個別に手渡す運用(`docs/design.md`の「アクセス設計」節を参照)。

## アクセス解析(GoatCounter)

全ページに [GoatCounter](https://www.goatcounter.com/)(無料・プライバシー配慮型)の計測タグを埋め込み済み。サイトコードは `paris-osusume` を想定。

**むんたに必要な作業(1回だけ)**: https://www.goatcounter.com/signup で サイトコード `paris-osusume` ・自分のメールアドレスで登録し、届いたメールのリンクから本登録を完了する。以降は https://paris-osusume.goatcounter.com/ でダッシュボードを確認できる。

**個別リンクの目印の付け方**: 人に渡すURLの末尾に `?ref=名前` を付けて共有する(例: `https://sasukechanparis.github.io/paris-osusume-guide/?ref=yamada`)。GoatCounterはこの`ref`パラメータを自動でソース(参照元)として認識し、ダッシュボードで「どの目印から来たか」が見られる。目印なし・見覚えのないソースからのアクセスが極端に増えたら、意図しないルートで広まっている可能性がある。
