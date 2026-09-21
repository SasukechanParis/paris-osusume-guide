# スマホ優先の改善(段階1〜7) 実装計画

> 入力: `パリガイド_改善案と実装プロンプト.md`(2026-09-21改訂版)。着手時HEAD `9113975`(提案書の確認時と同一)。
> 実装は静的HTML/CSS/ES Modules/JSONのまま。push・公開はしない。

**Goal:** 旅行前〜滞在中のスマホで「探す→比べる→保存する→現地で使う」を片手で完結できるようにする。

## Global Constraints(全段階)

- 日本語版は `noindex`・手渡し運用のまま。英語版(`/en/`)は共有CSS(`tokens/base/style/map.css`)と `js/geocode.js`・`js/nearby.js`・`js/distance.js` を使うため、**これらの既存ルール・既存の返り値は変えない**。日本語版の上書きは新規 `css/mobile.css` に `body.jp` スコープで書く。
- 店舗写真の新規追加・スーパー商品紹介は対象外。写真なしで完成するカード。
- 価格・営業時間・予約・設備・徒歩時間・訪問歴・評価を捏造しない。未確認は `null`(=画面に出さない)。
- 位置情報・ホテル・自由記述は計測イベント・共有URLに入れない。GPSは現在地ボタンを押したときだけ要求。
- ピンチズーム禁止にしない。ボタンは44×44CSS px以上、入力欄は16px。
- 状態は不変更新(新しいオブジェクトを返す)。純粋ロジックは `node --test` で検証、DOM部分はブラウザで検証。

## 構成(新規ファイル)

| 種別 | ファイル | 役割 |
|---|---|---|
| shell | `js/shell-data.js`, `scripts/apply-shell.mjs`, `css/mobile.css`, `js/shell.js`, `menu.html` | 上部バー(困ったとき常設)+下部タブ+メニュー。全ページの静的ブロックを1か所から生成し、テストで同期を検証 |
| 共通 | `js/ui-status.js`, `js/maps-links.js`, `js/spots.js`, `js/map-shared.js`, `js/state-restore.js`, `js/storage.js`, `js/analytics.js` | 読み込み/失敗/0件表示、Googleマップ経路URL、主要地点、地図の共有部品、戻ったときの状態復元、安全なlocalStorage、匿名イベント |
| 段階2 | `js/places.js`, `js/search-core.js`, `js/search-page.js`, `search.html`, `data/search-aliases.json`, `data/search-articles.json`, `data/place-aliases.json` | 店・施設・記事の横断検索、絞り込み、ホテル周辺、一覧/地図 |
| 段階3 | `js/saved.js`, `js/share.js`, `js/saved-page.js`, `saved.html` | 行きたいリスト、共有コード |
| 段階4 | `journey.html`, `data/journey.json`, `data/official-info.json`, `french.html`, `data/french-cards.json`, `js/checklist.js` | 旅の段階別入口、ETIAS/EES公式案内、フランス語カード、撮影準備 |
| 段階5 | `purpose.html`, `data/courses.json`, `data/place-facts.json`, `data/hotel-facts.json` | 目的別候補、モデルコース、ホテル比較、確認済み条件 |
| 段階6 | `sw.js`, `js/offline.js`, `settings.html` | 利用者操作で保存するオフラインパック、削除 |
| 段階7 | `data/freshness.json`, `data/site-config.json`, `scripts/check-site.mjs`, `js/report.js` | 確認日・出典、整合チェック、修正報告 |

## 段階ごとの完了確認

1. **段階1** テスト全通過 / 320・360・390・430pxで横はみ出しなし・タップ44px・入力16px / 上部から近く検索へ到達 / GPS拒否・住所失敗・JSON失敗で操作不能にならない / 経路ボタンがdirURL / 英語版の既存ページ無変更 / 画像の前後容量を記録
2. **段階2** 一覧と地図の件数一致 / URLで再現・戻るで復元 / ホテル保存・解除 / 欠損値を絞り込みに出さない
3. **段階3** リロード保持・重複・不正共有データ・削除済みID・取り込み時の重複
4. **段階4** 各段階の入口が既存記事だけで成立 / ETIAS等に出典・確認日 / フランス語カードの表示と戻り
5. **段階5** 根拠のない条件が出ない / 比較が縦並び / 未公開コースを完成扱いしない
6. **段階6** 初回オンライン→保存→サーバー停止→再読込で表示 / 保存前は約束しない / 削除
7. **段階7** チェックスクリプト通過 / 報告が「送信済み」と誤表示しない / 計測に住所・自由入力が含まれない

## 運営者への確認は最後に1つの一覧へまとめる(推測で埋めない)
