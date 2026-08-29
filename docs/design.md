# パリ製パンコンクール図鑑 — 設計書

作成日: 2026-08-29

## 目的

パリで開催されるバゲット・クロワッサンなどの製パンコンクール情報を網羅し、日本語圏のパリ旅行者・在住日本人向けに公開する集客用Webサイト。副業として運用する。

## スコープ

- 大会情報(主催、開催頻度、審査基準、次回開催予定、歴代ランキング)
- 受賞店の地図・訪問ガイド・説明文
- 現在地/宿泊先住所から近い受賞店を検索する機能
- 対象言語: 日本語のみ
- 対象コンクール: バゲット部門・クロワッサン部門から開始。将来的に他部門(pain au chocolat等)を追加できる構造にする

## 情報源(初期リスト)

| コンクール | 主催 | 公式情報源 |
|---|---|---|
| Grand Prix de la Meilleure Baguette de Paris | パリ市 | paris.fr, presse.paris.fr |
| Meilleur Croissant au Beurre du Grand Paris | Syndicat des Boulangers du Grand Paris | boulangersdugrandparis.com |

補助的なメディア(sortiraparis, lebonbon, parismag等)は裏取り用途で参照し、一次情報は必ず公式サイトを優先する。

## ビジュアルデザイン

- 白ベース + フランス国旗のトリコロール(青・赤)をそのまま使う。中間色でぼかさない
- タイポグラフィ: 見出しは明朝(Zen Old Mincho)、本文はゴシック(Zen Kaku Gothic New)、英字ラベルはセリフ(Libre Caslon Display)
- イラストは印象派タッチ(筆致・色の重なりが見える絵画調)。ChatGPTで生成し、`assets/illustrations/` に格納する
  - 白背景で統一生成し、必要に応じて背景除去して使用
- テンプレ的な装飾(円形スタンプ、点線囲み、ベタなゴールド×クリームの配色)は避ける
- モックアップ: [Artifact](https://claude.ai/code/artifact/41ab42f2-706f-4c5a-b9d2-6ac5e2c535ba) で方向性を確認済み

## サイト構成(フロントエンド)

- vanilla HTML/CSS/JS。フレームワーク不使用(既存Pholio系プロジェクトと統一)
- **モバイルファースト**: 主要な閲覧はスマートフォンを想定し、レイアウト・タップ領域・文字サイズをまず375px幅で設計してからデスクトップに広げる
- ページ構成:
  - トップページ: 直近の更新・今後の開催予定
  - コンクール一覧(部門ごと)
  - コンクール詳細ページ: 歴代ランキング(公式発表された順位分)、審査基準、次回開催予定
  - 受賞店一覧: アロンディスマン別のリスト表示。各店に「Googleマップで開く」ボタン(独自の地図描画はしない)
  - 近くのパン屋さん検索: 現在地(GPS)または住所/ホテル名を入力し、受賞店を近い順に一覧表示。各結果にも「Googleマップで経路を見る」ボタンを付ける
- 地図の扱い: Google Maps JavaScript APIは使わない(APIキー・課金設定が必要なため)。代わりに `https://www.google.com/maps/search/?api=1&query={lat},{lng}` 形式のリンクで、タップ時にユーザーの使い慣れたGoogleマップアプリ/サイトを開く
- ホスティング: GitHub Pages(無料、既存プロジェクトと同じ運用)

## データ構造

```
data/
  contests.json   # コンクール定義
    { id, name, organizer, category, frequency, official_url, next_edition_date }
  results.json    # 開催年ごとの結果履歴(追記のみ、過去分は残す)
    { contest_id, year, rankings: [{ rank, shop_id }], date, source_url }
    # rankings は公式発表された順位分だけを格納する(発表が優勝者のみの年は1件だけになる)
  shops.json      # 受賞店マスタ
    { id, name, address, lat, lng, arrondissement, description, google_maps_url, photo_url, wins: [{contest_id, year, rank}] }
    # description: 店の紹介文(任意)
    # photo_url: 著作権が確認できた画像のみ設定。無ければ null(Googleマップへのリンクで代替)
```

- 各エントリに `source_url` を必須とし、サイト上にも出典リンクを表示する(未確認情報を断定しないため)

## 近くのパン屋さん検索

- 位置情報の入力: ブラウザのGeolocation API(現在地の自動取得)と、住所/ホテル名の手入力の両方に対応
- 住所→座標変換(ジオコーディング): OpenStreetMapのNominatim API(無料・APIキー不要)を使用。利用ポリシーに従い、User-Agentを設定しリクエスト頻度を抑える
- 距離計算: 取得した座標とshops.jsonの緯度経度からHaversine公式でクライアントサイドJSにより算出し、近い順にソートして一覧表示
- 店舗写真: 無断使用を避け、`photo_url`が確認済みの場合のみ表示。無い場合はGoogleマップへのリンクで店構えを確認できるようにする

## 自動更新ワークフロー

```
ROLE: パリの製パンコンクール情報の定期巡回・下書き作成担当
GOAL: 新しい開催日程・結果が出ていたら、data/*.json への差分案を用意する
INPUT: contests.json に登録された各 official_url + 補助メディア
TOOLS: WebSearch / WebFetch(読み取りのみ)
TRIGGER: 週1回(頻度は運用開始後に調整可)
OUTPUT: 差分があれば下書きをプロジェクト内の一時ファイルに保存。差分がなければ何も出力しない
APPROVAL: data/*.json への書き込み・git commit/push は、むんたがClaudeとのチャットで内容を確認し承認した後にのみ行う。完全自動公開はしない
FAILURE: サイト構造の変化などで情報を取得できない場合は「確認できず」と記録し、推測で埋めない。次回巡回に持ち越す
LOG: 実行日時・チェックしたURL・検出した差分の有無を記録する
```

運用イメージ: むんたが気の向いた時にClaudeとのセッションを開き「パン大会情報の下書きを確認して」と依頼する。溜まっている差分候補があれば提示し、承認後にデータファイルを更新してコミットする。空振りが続いても長いレポートは作らない。

## 除外事項(今回のスコープ外)

- 完全自動公開(人間の承認なしでのサイト反映)
- iOSアプリ化(将来検討の余地はあるが今回はWebのみ)
- 英語・フランス語対応
- プッシュ通知などのネイティブ機能
- 著作権未確認の店舗写真の掲載
