# パリ製パンコンクール図鑑 — 設計書

作成日: 2026-08-29

## 目的

パリで開催されるバゲット・クロワッサンなどの製パンコンクール情報を網羅し、日本語圏のパリ旅行者・在住日本人向けに公開する集客用Webサイト。副業として運用する。

## スコープ

- 大会情報(主催、開催頻度、審査基準、次回開催予定、歴代結果)
- 受賞店の地図・訪問ガイド
- 対象言語: 日本語のみ
- 対象コンクール: バゲット部門・クロワッサン部門から開始。将来的に他部門(pain au chocolat等)を追加できる構造にする

## 情報源(初期リスト)

| コンクール | 主催 | 公式情報源 |
|---|---|---|
| Grand Prix de la Meilleure Baguette de Paris | パリ市 | paris.fr, presse.paris.fr |
| Meilleur Croissant au Beurre du Grand Paris | Syndicat des Boulangers du Grand Paris | boulangersdugrandparis.com |

補助的なメディア(sortiraparis, lebonbon, parismag等)は裏取り用途で参照し、一次情報は必ず公式サイトを優先する。

## サイト構成(フロントエンド)

- vanilla HTML/CSS/JS。フレームワーク不使用(既存Pholio系プロジェクトと統一)
- ページ構成:
  - トップページ: 直近の更新・今後の開催予定
  - コンクール一覧(部門ごと)
  - コンクール詳細ページ: 歴代受賞者、審査基準、次回開催予定
  - 受賞店マップ: Leaflet.js + OpenStreetMapタイル(APIキー不要)、地図とリストを連動表示
- ホスティング: GitHub Pages(無料、既存プロジェクトと同じ運用)

## データ構造

```
data/
  contests.json   # コンクール定義
    { id, name, organizer, category, frequency, official_url, next_edition_date }
  results.json    # 開催年ごとの結果履歴(追記のみ、過去分は残す)
    { contest_id, year, winner_shop_id, date, source_url }
  shops.json      # 受賞店マスタ
    { id, name, address, lat, lng, arrondissement, wins: [{contest_id, year}] }
```

- 各エントリに `source_url` を必須とし、サイト上にも出典リンクを表示する(未確認情報を断定しないため)

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
