# パリおすすめデータベース

パリのパンコンクール受賞店、さすけと先輩カップルのおすすめ(レストラン・カフェ・スイーツ(ショコラティエ・パティスリー)・パン屋さん・お土産・スーパーで買えるおすすめ・ホテル)、ミシュラン星付き店をまとめた静的サイト。

## ページ構成

- `index.html` — トップページ(緊急バナー・「今どうしたい?」目的別リンク・最近追加されました・今話題のこと・カテゴリ一覧への導線)
- `emergency.html` — パリで困ったら(緊急時13シナリオ。結論→行動→詳細の順、電話番号はtel:リンク)
- `airport.html` — 空港アクセスガイド(CDG/オルリー/ボーヴェの交通手段別比較。廃止済みサービスは掲載しない方針)
- `shoot-day.html` — 撮影当日ガイド(前撮り予約者向け。前日の準備・持ち物・天候と撮影の一般的な目安は公開済み、さすけ個別の判断・指示は準備中で「近日公開予定」表示)
- `bread.html` — パンコンクール(日程・ランキング・近くの受賞店検索)
- `contest.html` — コンクール詳細(年別タブ)
- `michelin.html` — ミシュラン星付きレストラン一覧(近くの店検索つき)
- `restaurants.html` — レストラン・カフェ(「レストラン」「カフェ・サロン・ド・テ」の2セクション、「さすけのおすすめ」⇔「先輩カップルのおすすめ」タブ、近くの店検索つき)
- `chocolatiers.html` / `hotels.html` — カテゴリ別おすすめ(「さすけのおすすめ」⇔「先輩カップルのおすすめ」タブ、近くの店検索つき)
- `bakeries.html` — パン屋さん(パンの種類・注文フランス語つき) / `souvenirs.html` — お土産(選び方・食品持ち込み注意点つき) / `supermarket.html` — スーパーで買えるおすすめ(食材の見分け方つき)。いずれもカテゴリ別おすすめ一覧+近くの店検索は共通
- `flea-markets.html` — 市場(常設の蚤の市3件+食品マルシェなど79件、不定期フリマの案内、近くの市場検索つき)
- `free-spots.html` — 無料スポット(無料の美術館・広場6件+パッサージュ16件、近くのスポット検索つき。公衆トイレ581件の近く検索も別枠で設置)
- `guide.html` — 旅行ガイド(季節の見どころ・旅行実務FAQ・レストランの使い方・お得な支払い方法・免税Détaxe/PABLO・荷物預かり。出典付きの静的コンテンツ、JSONデータなし)
- `monthly-guide.html` — 月別パリガイド(1月〜12月の気温目安・日照時間・季節イベント。日付が毎年変わるイベントは「例年◯月頃」表記で固定日付を書かない方針)
- `map.html` — 地図(全カテゴリのピンをLeaflet.js + OpenStreetMapで1枚の地図に表示、カテゴリ・区で絞り込み可能、現在地・住所検索つき。公衆トイレは件数が多いため初期状態は非表示)
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
   - お店・情報を追加したときは `data/updates.json` にも1件追記する(トップページ「最近追加されました」に直近5件が表示される。`id`/`date`/`text`/任意の`link`)
2. `node --test tests/data.test.js` でスキーマ・出典URL・shop_id参照の整合性を確認する
3. ローカルサーバーで表示を確認する
4. コミットする

Googleマップリンクは店名+住所のテキスト検索(`?api=1&query=店名 住所`)で構成する。座標(`lat`/`lng`)は距離計算専用で、マップリンク自体には使わない。

## キャッシュ対策(`js/data.js`)

全ページの`fetch(データ.json)`は`js/data.js`の共有`loadJson()`を通しており、内部で`?v=バージョン文字列`を付与している。ローカルの簡易devサーバーやブラウザがJSON/JSを古い内容のままキャッシュしてしまう問題への対策。**データやJSを更新したら`js/data.js`の`VERSION`定数を書き換えること**(1箇所を変えるだけで全ページに反映される)。

## 公衆トイレ(`data/toilets.json`)

出典: [Paris Data「Toilettes publiques」](https://opendata.paris.fr/explore/dataset/sanisettesparis/)(パリ市公式オープンデータ、ODbLライセンス)。全610件中、稼働中(`En service`)581件のみを採用したスナップショット。設置場所は頻繁には変わらないため自動更新はせず、必要になったら同じ手順(opendata.paris.fr APIから再取得)で再生成する。専用ページは作らず、`free-spots.html`の近く検索と`map.html`のカテゴリ(初期非表示)としてのみ表示する。

## 自動更新ワークフロー(運用イメージ)

`docs/design.md` の「自動更新ワークフロー」節を参照。週1回、Claudeが公式サイトを巡回して差分の下書きを作成する。完全自動公開はせず、むんたがチャットで内容を確認・承認してからdata/*.jsonを更新する。

「今話題のこと」(`data/trending.json`)も同様に週1回、Claudeがニュース・メディアを検索して候補を提示し、承認後に反映する。対象はパン屋に限らずジャンルを問わない(`docs/design.md`の「今話題のこと」節を参照)。

Scheduled Task `paris-bread-weekly-check`(毎週月曜9:05)が両方のチェックを実行し、`docs/pending-updates.md` に下書きを追記する。

## カテゴリ別おすすめ(レストラン/カフェ/スイーツ(ショコラティエ・パティスリー)/パン屋さん/お土産/スーパーで買えるおすすめ/ホテル)

各ページは「さすけのおすすめ」(`data/recommendations.json`)と「先輩カップルのおすすめ」(`data/guest-recommendations.json`)をタブで切り替える。カテゴリ値は `restaurant` / `cafe` / `chocolatier` / `patisserie` / `bakery` / `souvenir` / `supermarket` / `hotel` の8種。`restaurant`と`cafe`はどちらも`restaurants.html`(表示名「レストラン・カフェ」)内で「レストラン」「カフェ・サロン・ド・テ」の2セクションに分けて表示する。`chocolatier`と`patisserie`も同様に`chocolatiers.html`(表示名「スイーツ」)内で2セクションに分けて表示する。`recommendations.json`側は`status: "recommended"|"curious"`でバッジ表示を分ける。`cafe`は現時点で全件`curious`(メディア記事から調査、むんた自身の訪問実績はまだ無し)。`supermarket`はデータ未整備のため現状空(近日公開表示)。

## 市場(`data/marches.json`)

出典: [Paris Data「Marchés découverts」](https://opendata.paris.fr/explore/dataset/marches-decouverts/)(パリ市公式オープンデータ)。全80件のうち、既存の`flea-markets.json`(常設の蚤の市3件)と重複する`produit: "Puces"`3件を除いた77件(食品・オーガニック食品・花・アート/手工芸・切手)を採用。加えて、同オープンデータには含まれない屋根付き市場(Marché des Enfants Rouges・Marché d'Aligre)をparis.fr公式ページを出典に2件手動追加し、計79件。`flea-markets.html`の「食品マルシェ・その他の市場」セクションと`map.html`のカテゴリ(`flea_market`、蚤の市と統合)に表示する。開催曜日ごとの時間は`h_deb_sem_1`(平日共通)/`h_deb_sam`(土)/`h_deb_dim`(日)から組み立てている。

## ミシュラン星付き(`michelin.html`)

`data/michelin.json` に2026年版ガイドの三ツ星9・二ツ星20・一ツ星98(計127)の情報を持つ。星・区・ジャンルで絞り込み可能。ミシュランガイドの改訂時に手動更新する(自動巡回の対象外)。

## 投稿機能(`post.html`)

訪問者が自分のおすすめ店・感想を投稿できるページ。Googleフォーム(https://forms.gle/RqxPGi8SPc8pb9TX9)を別タブで開くボタンを設置済み(詳細は`docs/design.md`の「投稿機能」節を参照)。承認後は`data/guest-recommendations.json`に追加し、各カテゴリページの「先輩カップルのおすすめ」タブに反映する。

## GitHub Pagesでの公開

公開URL: https://sasukechanparis.github.io/paris-osusume-guide/

2026-09-01にリポジトリを公開(public)で作成し、GitHub Pagesを有効化した。`main`ブランチにpushすると自動で反映される。URLは検索エンジンには特に対策していないが、公式LINEのリッチメニュー等では告知せず、むんたが個別に手渡す運用(`docs/design.md`の「アクセス設計」節を参照)。

## アクセス解析(GoatCounter)

全ページに [GoatCounter](https://www.goatcounter.com/)(無料・プライバシー配慮型)の計測タグを埋め込み済み。サイトコードは `paris-osusume` を想定。

**むんたに必要な作業(1回だけ)**: https://www.goatcounter.com/signup で サイトコード `paris-osusume` ・自分のメールアドレスで登録し、届いたメールのリンクから本登録を完了する。以降は https://paris-osusume.goatcounter.com/ でダッシュボードを確認できる。

**個別リンクの目印の付け方**: 人に渡すURLの末尾に `?ref=名前` を付けて共有する(例: `https://sasukechanparis.github.io/paris-osusume-guide/?ref=yamada`)。GoatCounterはこの`ref`パラメータを自動でソース(参照元)として認識し、ダッシュボードで「どの目印から来たか」が見られる。目印なし・見覚えのないソースからのアクセスが極端に増えたら、意図しないルートで広まっている可能性がある。
