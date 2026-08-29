# パリ製パンコンクール図鑑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** パリのバゲット・クロワッサンコンクール情報(日程・ランキング・受賞店)を掲載し、現在地/住所から近い受賞店を探せる、モバイルファーストの日本語静的Webサイトを作る。

**Architecture:** vanilla HTML/CSS/JSの静的サイト。データはdata/配下のJSONファイルで管理し、ページ側でfetchして描画する。地図はGoogle Mapsへのリンクのみ(APIキー不要)。ジオコーディングはOpenStreetMap Nominatimを使う。GitHub Pagesでホスティングする。

**Tech Stack:** HTML5 / CSS3(カスタムプロパティ) / ES Modules(vanilla JS、フレームワークなし)、Node.js組み込みテストランナー(`node --test`、追加パッケージなし)、Google Fonts(Zen Old Mincho / Zen Kaku Gothic New / Libre Caslon Display)。

## Global Constraints

- vanilla HTML/CSS/JSのみ。フレームワーク・ビルドツール・npm依存パッケージは追加しない
- モバイルファースト: すべてのレイアウトは375px幅を基準に設計し、そこからデスクトップへ拡張する
- 対象言語は日本語のみ
- 配色は白背景ベース + フランス国旗の青(`--blue: #0055a4`)・赤(`--red: #ea4335`)を直接使う。中間色でぼかさない
- タイポグラフィ: 見出し=`Zen Old Mincho`、本文=`Zen Kaku Gothic New`、英字ラベル=`Libre Caslon Display`(Google Fontsから読み込み)
- すべてのコンクール結果・受賞店データには出典URL(`source_url`)を必須とし、画面にも出典リンクを表示する
- 地図表示はGoogle Mapsへのリンク方式のみ(`https://www.google.com/maps/search/?api=1&query={lat},{lng}`)。Google Maps JavaScript APIやLeafletなど、独自の地図描画ライブラリは使わない
- ランキングは公式発表された順位分だけを掲載する(捏造・推測で埋めない)
- 著作権が確認できていない店舗写真は掲載しない
- ダーク/ライテーマ両対応(`prefers-color-scheme` + `data-theme`属性の両方に対応するCSS変数設計)
- 参照済み設計書: `docs/design.md`

---

### Task 1: プロジェクト基盤とデザイントークンCSS

**Files:**
- Create: `css/tokens.css`
- Create: `css/base.css`
- Create: `index.html`

**Interfaces:**
- Produces: CSSカスタムプロパティ `--bg`, `--surface`, `--line`, `--blue`, `--red`, `--ink`, `--gray`(ライト/ダーク両対応)。以降のすべてのCSS・HTMLタスクがこれらの変数名をそのまま使う

- [ ] **Step 1: `css/tokens.css` を作成する**

```css
:root {
  --bg: #ffffff;
  --surface: #f7f7f5;
  --line: #e6e4de;
  --blue: #0055a4;
  --red: #ea4335;
  --ink: #16161a;
  --gray: #74726c;
  font-synthesis: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #121214;
    --surface: #1b1b1e;
    --line: #313136;
    --blue: #6ea8e0;
    --red: #ff7a6e;
    --ink: #f1f0ec;
    --gray: #a6a49c;
  }
}
:root[data-theme="dark"] {
  --bg: #121214;
  --surface: #1b1b1e;
  --line: #313136;
  --blue: #6ea8e0;
  --red: #ff7a6e;
  --ink: #f1f0ec;
  --gray: #a6a49c;
}
```

- [ ] **Step 2: `css/base.css` を作成する(リセットと共通レイアウト)**

```css
* { box-sizing: border-box; }
html, body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.page { max-width: 760px; margin: 0 auto; padding-bottom: 72px; }
img { max-width: 100%; display: block; }

.tricolore-rail { display: flex; height: 6px; }
.tricolore-rail span { flex: 1; }
.tricolore-rail span:nth-child(1) { background: var(--blue); }
.tricolore-rail span:nth-child(2) { background: var(--bg); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tricolore-rail span:nth-child(3) { background: var(--red); }

.flag-dot { display: flex; gap: 4px; }
.flag-dot i { width: 7px; height: 7px; border-radius: 50%; display: block; }
.flag-dot i:nth-child(1) { background: var(--blue); }
.flag-dot i:nth-child(2) { background: var(--ink); }
.flag-dot i:nth-child(3) { background: var(--red); }

.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 26px;
  border-bottom: 2px solid var(--ink);
  padding-bottom: 14px;
}
.section-head h2 { font-family: 'Zen Old Mincho', serif; font-weight: 700; font-size: 20px; margin: 0; }
.section-note { font-size: 12px; color: var(--gray); margin: -14px 0 24px; }

section { padding: 52px 20px 0; }
@media (min-width: 480px) {
  section { padding: 52px 32px 0; }
}
```

- [ ] **Step 3: `index.html` の骨格を作成する**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>パリ製パンコンクール図鑑</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Zen+Old+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="page">
  <div class="tricolore-rail"><span></span><span></span><span></span></div>
  <main id="app"></main>
</div>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: ブラウザで確認する**

`index.html` をブラウザで開き、白背景・トリコロールの帯が表示され、コンソールエラーが出ないことを確認する(`css/style.css` と `js/main.js` は次タスク以降で作るため、この時点では404が出るのが正常。404以外のエラーが出ていないことを確認する)。

- [ ] **Step 5: Commit**

```bash
cd "/Users/satoryosuke/Desktop/アプリ開発/paris-bread-contest-guide"
git add index.html css/tokens.css css/base.css
git commit -m "feat: add base HTML shell and design token CSS"
```

---

### Task 2: データファイル作成

**Files:**
- Create: `data/contests.json`
- Create: `data/results.json`
- Create: `data/shops.json`
- Test: `tests/data.test.js`

**Interfaces:**
- Produces: `contests.json`の各要素は `{ id, name, organizer, category, frequency, official_url, next_edition_date }`
- Produces: `results.json`の各要素は `{ contest_id, year, rankings: [{ rank, shop_id }], date, source_url }`
- Produces: `shops.json`の各要素は `{ id, name, address, lat, lng, arrondissement, description, google_maps_url, photo_url, wins: [{ contest_id, year, rank }] }`
- 以降のすべての描画タスクはこの3ファイルのスキーマをそのまま前提にする

- [ ] **Step 1: `data/contests.json` を作成する**

```json
[
  {
    "id": "baguette",
    "name": "Grand Prix de la Meilleure Baguette de Paris",
    "organizer": "パリ市",
    "category": "baguette",
    "frequency": "年1回(例年2月頃)",
    "official_url": "https://presse.paris.fr/agenda/grand-prix-de-la-meilleure-baguette-de-la-ville-de-paris-2026",
    "next_edition_date": null
  },
  {
    "id": "croissant",
    "name": "Meilleur Croissant au Beurre du Grand Paris",
    "organizer": "Syndicat des Boulangers du Grand Paris",
    "category": "croissant",
    "frequency": "年1回(例年4月頃)",
    "official_url": "https://boulangersdugrandparis.com/",
    "next_edition_date": null
  }
]
```

- [ ] **Step 2: `data/shops.json` を作成する**

```json
[
  {
    "id": "fournil-didot",
    "name": "Fournil Didot",
    "address": "103 rue Didot, 75014 Paris",
    "lat": 48.8272,
    "lng": 2.3129,
    "arrondissement": "14e",
    "description": "2026年グランプリを受賞したバゲット専門店。14時間の低温発酵が特徴。",
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=48.8272,2.3129",
    "photo_url": null,
    "wins": [{ "contest_id": "baguette", "year": 2026, "rank": 1 }]
  },
  {
    "id": "boulangerie-du-sentier",
    "name": "Boulangerie du Sentier",
    "address": "2e arrondissement, Paris",
    "lat": 48.8677,
    "lng": 2.3453,
    "arrondissement": "2e",
    "description": "2026年のMeilleur Croissant du Grand Parisで1位を獲得。",
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=48.8677,2.3453",
    "photo_url": null,
    "wins": [{ "contest_id": "croissant", "year": 2026, "rank": 1 }]
  }
]
```

注記: 緯度経度は正確な店舗所在地が確認でき次第、後続の自動更新ワークフローで補正する。現時点ではおおよそのアロンディスマン中心座標を暫定値として使う。

- [ ] **Step 3: `data/results.json` を作成する**

```json
[
  {
    "contest_id": "baguette",
    "year": 2026,
    "rankings": [{ "rank": 1, "shop_id": "fournil-didot" }],
    "date": "2026-02-26",
    "source_url": "https://presse.paris.fr/agenda/grand-prix-de-la-meilleure-baguette-de-la-ville-de-paris-2026"
  },
  {
    "contest_id": "croissant",
    "year": 2026,
    "rankings": [{ "rank": 1, "shop_id": "boulangerie-du-sentier" }],
    "date": "2026-05-12",
    "source_url": "https://boulangersdugrandparis.com/concours-du-meilleur-croissant-du-grand-paris-au-beurre-charentes-poitou-aop-7-avril-2026/"
  }
]
```

- [ ] **Step 4: JSON妥当性テストを書く**

```javascript
// tests/data.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function loadJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url)));
}

test('contests.json is valid and has required fields', () => {
  const contests = loadJson('../data/contests.json');
  assert.ok(Array.isArray(contests));
  for (const c of contests) {
    assert.ok(c.id && c.name && c.organizer && c.official_url);
  }
});

test('results.json rankings reference shop ids that exist in shops.json', () => {
  const results = loadJson('../data/results.json');
  const shops = loadJson('../data/shops.json');
  const shopIds = new Set(shops.map((s) => s.id));
  for (const r of results) {
    assert.ok(r.source_url, `result for ${r.contest_id} ${r.year} missing source_url`);
    for (const ranking of r.rankings) {
      assert.ok(shopIds.has(ranking.shop_id), `unknown shop_id ${ranking.shop_id}`);
    }
  }
});

test('shops.json entries have coordinates and google maps link', () => {
  const shops = loadJson('../data/shops.json');
  for (const s of shops) {
    assert.equal(typeof s.lat, 'number');
    assert.equal(typeof s.lng, 'number');
    assert.ok(s.google_maps_url.includes(String(s.lat)));
  }
});
```

- [ ] **Step 5: テストを実行して通ることを確認する**

Run: `cd "/Users/satoryosuke/Desktop/アプリ開発/paris-bread-contest-guide" && node --test tests/data.test.js`
Expected: 3 tests, 0 fail

- [ ] **Step 6: Commit**

```bash
git add data/ tests/data.test.js
git commit -m "feat: add initial contest, result, and shop data with validation tests"
```

---

### Task 3: 距離計算ユーティリティ(Haversine)

**Files:**
- Create: `js/distance.js`
- Test: `tests/distance.test.js`

**Interfaces:**
- Produces: `haversineDistanceKm(lat1, lng1, lat2, lng2)` → `number`(km)。Task 9がこの関数を使う
- Produces: `formatDistance(km)` → `string`(例: `"650m"` / `"1.2km"`)。Task 6・Task 10がこの関数を使う

- [ ] **Step 1: 失敗するテストを書く**

```javascript
// tests/distance.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceKm, formatDistance } from '../js/distance.js';

test('haversineDistanceKm returns 0 for identical points', () => {
  assert.equal(haversineDistanceKm(48.8566, 2.3522, 48.8566, 2.3522), 0);
});

test('haversineDistanceKm computes known Paris distance within tolerance', () => {
  // Eiffel Tower (48.8584, 2.2945) to Notre-Dame (48.8530, 2.3499) ≈ 4.3km
  const km = haversineDistanceKm(48.8584, 2.2945, 48.8530, 2.3499);
  assert.ok(km > 4.0 && km < 4.6, `expected ~4.3km, got ${km}`);
});

test('formatDistance shows meters under 1km', () => {
  assert.equal(formatDistance(0.65), '650m');
});

test('formatDistance shows km with one decimal at or above 1km', () => {
  assert.equal(formatDistance(1.2), '1.2km');
  assert.equal(formatDistance(12), '12.0km');
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/distance.test.js`
Expected: FAIL(`js/distance.js` が存在しないため `Cannot find module`)

- [ ] **Step 3: 最小実装を書く**

```javascript
// js/distance.js
const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/distance.test.js`
Expected: 4 tests, 0 fail

- [ ] **Step 5: Commit**

```bash
git add js/distance.js tests/distance.test.js
git commit -m "feat: add Haversine distance calculation and formatting utilities"
```

---

### Task 4: データ描画ユーティリティ(トップページ用)

**Files:**
- Create: `js/render.js`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `data/contests.json`, `data/results.json`, `data/shops.json` のスキーマ(Task 2で確定)
- Produces: `renderProgramList(contests)` → `string`(HTML片)
- Produces: `renderRankingGroups(results, shops, contests)` → `string`(HTML片)
- 以降のTask 5・6がこれらの関数をトップページ描画に使う

- [ ] **Step 1: 失敗するテストを書く**

```javascript
// tests/render.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderProgramList, renderRankingGroups } from '../js/render.js';

const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', next_edition_date: null }
];
const shops = [
  { id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e' }
];
const results = [
  {
    contest_id: 'baguette',
    year: 2026,
    rankings: [{ rank: 1, shop_id: 'fournil-didot' }],
    source_url: 'https://presse.paris.fr/example'
  }
];

test('renderProgramList includes contest name and organizer', () => {
  const html = renderProgramList(contests);
  assert.match(html, /Grand Prix de la Baguette/);
  assert.match(html, /パリ市/);
});

test('renderRankingGroups includes shop name, rank, and source link', () => {
  const html = renderRankingGroups(results, shops, contests);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /14e/);
  assert.match(html, /href="https:\/\/presse\.paris\.fr\/example"/);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/render.test.js`
Expected: FAIL(`js/render.js` が存在しない)

- [ ] **Step 3: 最小実装を書く**

```javascript
// js/render.js

export function renderProgramList(contests) {
  return contests
    .map(
      (c) => `
    <div class="program-row">
      <div>
        <p class="program-name">${c.name}</p>
        <p class="program-meta">主催: ${c.organizer}</p>
      </div>
      <div class="program-date">${c.next_edition_date ?? '次回未発表'}<span class="status">下書き待ち</span></div>
    </div>`
    )
    .join('');
}

export function renderRankingGroups(results, shops, contests) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestById = new Map(contests.map((c) => [c.id, c]));

  return results
    .map((result) => {
      const contest = contestById.get(result.contest_id);
      const rows = result.rankings
        .map((r) => {
          const shop = shopById.get(r.shop_id);
          return `
        <div class="ranking-row${r.rank === 1 ? ' is-first' : ''}">
          <span class="rank-num">${r.rank}</span>
          <div>
            <p class="ranking-shop-name">${shop.name}</p>
            <p class="ranking-arr">${shop.arrondissement}</p>
          </div>
          <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
        </div>`;
        })
        .join('');
      return `
    <div class="ranking-group">
      <p class="ranking-group-label">${contest.name}</p>
      ${rows}
    </div>`;
    })
    .join('');
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/render.test.js`
Expected: 2 tests, 0 fail

- [ ] **Step 5: Commit**

```bash
git add js/render.js tests/render.test.js
git commit -m "feat: add program list and ranking rendering utilities"
```

---

### Task 5: トップページのスタイルとレイアウト

**Files:**
- Create: `css/style.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `css/tokens.css`(Task 1)の変数名
- Consumes: `js/render.js`(Task 4)が生成するHTML断片のクラス名(`.program-row`, `.ranking-group`, `.ranking-row`など)とセレクタが一致している必要がある

- [ ] **Step 1: `css/style.css` を作成する(v3モックアップのCSSをベースに、モバイルファーストで記述)**

```css
header.hero { padding: 40px 20px 0; display: grid; grid-template-columns: 1fr; gap: 24px; }
.masthead { display: flex; align-items: center; gap: 14px; }
.masthead .bars { display: flex; gap: 3px; height: 30px; }
.masthead .bars i { width: 6px; display: block; }
.masthead .bars i:nth-child(1) { background: var(--blue); }
.masthead .bars i:nth-child(2) { background: var(--ink); }
.masthead .bars i:nth-child(3) { background: var(--red); }
.masthead .eyebrow {
  font-family: 'Libre Caslon Display', serif;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gray);
}

h1.title {
  font-family: 'Zen Old Mincho', serif;
  font-weight: 700;
  font-size: clamp(30px, 8vw, 50px);
  line-height: 1.3;
  margin: 0;
  text-wrap: balance;
  max-width: 10ch;
}
h1.title .accent { color: var(--red); }
.lede { font-size: 14px; line-height: 1.9; color: var(--gray); max-width: 46ch; margin: 0; }

.hero-image { width: 100%; border-radius: 2px; }

.program-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.program-row:first-child { padding-top: 0; }
.program-name { font-weight: 700; font-size: 14.5px; margin: 0 0 4px; }
.program-meta { font-size: 12px; color: var(--gray); margin: 0; }
.program-date { text-align: right; font-size: 11px; color: var(--gray); white-space: nowrap; }
.program-date .status {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  border: 1px solid var(--red);
  color: var(--red);
  padding: 3px 9px;
  border-radius: 999px;
}

.ranking-group { margin-bottom: 32px; }
.ranking-group:last-child { margin-bottom: 0; }
.ranking-group-label { font-family: 'Libre Caslon Display', serif; font-size: 13px; color: var(--blue); margin: 0 0 12px; }
.ranking-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.ranking-row:first-child { padding-top: 0; }
.rank-num { font-family: 'Zen Old Mincho', serif; font-weight: 700; font-size: 20px; color: var(--gray); }
.ranking-row.is-first .rank-num { font-size: 26px; color: var(--ink); }
.ranking-shop-name { font-weight: 700; font-size: 14px; margin: 0 0 3px; }
.ranking-arr { font-size: 11px; color: var(--gray); margin: 0; }
.ranking-source { font-size: 10px; color: var(--gray); text-decoration: none; border-bottom: 1px solid var(--line); white-space: nowrap; }

@media (min-width: 480px) {
  header.hero { padding: 56px 32px 0; }
}
```

- [ ] **Step 2: `index.html` の `<main id="app">` にセクション骨格を追加する**

```html
<main id="app">
  <header class="hero">
    <div class="masthead">
      <div class="bars"><i></i><i></i><i></i></div>
      <span class="eyebrow">Concours de Boulangerie · Paris</span>
    </div>
    <h1 class="title">パリ製<span class="accent">パン</span>コンクール図鑑</h1>
    <p class="lede">バゲット、クロワッサン——パリの職人技が競われる公式コンクールの日程・結果・受賞店を、出典付きでまとめています。</p>
    <img class="hero-image" src="assets/illustrations/hero-croissant-baguette.jpg" alt="印象派タッチで描かれたクロワッサンとバゲットのイラスト">
  </header>

  <section aria-labelledby="program-h">
    <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="program-h">今後の開催予定</h2></div>
    <div id="program-list"></div>
  </section>

  <section aria-labelledby="ranking-h">
    <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="ranking-h">最新ランキング</h2></div>
    <p class="section-note">公式発表された順位のみ掲載しています(発表範囲は大会ごとに異なります)</p>
    <div id="ranking-groups"></div>
  </section>
</main>
```

- [ ] **Step 3: `js/main.js` を作成してデータを読み込み描画する**

```javascript
// js/main.js
import { renderProgramList, renderRankingGroups } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  document.getElementById('program-list').innerHTML = renderProgramList(contests);
  document.getElementById('ranking-groups').innerHTML = renderRankingGroups(results, shops, contests);
}

init();
```

- [ ] **Step 4: ローカルサーバーで確認する**

Run: `cd "/Users/satoryosuke/Desktop/アプリ開発/paris-bread-contest-guide" && python3 -m http.server 8420`

ブラウザで `http://localhost:8420/` を開き、以下を確認する:
- ヒーロー画像(クロワッサン+バゲット)が表示される
- 「今後の開催予定」に2件表示される
- 「最新ランキング」にバゲット・クロワッサンそれぞれ1位が表示され、出典リンクが機能する
- 375px幅(スマホ相当)でレイアウトが崩れない

確認後、`Ctrl+C` でサーバーを止める。

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html js/main.js
git commit -m "feat: render top page program list and ranking from data files"
```

---

### Task 6: 受賞店一覧とGoogleマップリンク

**Files:**
- Modify: `js/render.js`
- Modify: `css/style.css`
- Modify: `index.html`
- Modify: `js/main.js`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `data/shops.json`(Task 2)、`formatDistance`は使わない(距離なしの一覧のため)
- Produces: `renderShopList(shops)` → `string`(HTML片)。Task 10の「近くの受賞店」結果表示と見た目を揃える

- [ ] **Step 1: 失敗するテストを追記する**

```javascript
// tests/render.test.js に追記
import { renderShopList } from '../js/render.js';

test('renderShopList includes shop name, address, and google maps link', () => {
  const shops = [
    {
      id: 'fournil-didot',
      name: 'Fournil Didot',
      address: '103 rue Didot, 75014 Paris',
      arrondissement: '14e',
      description: '低温発酵が特徴のバゲット専門店。',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
    }
  ];
  const html = renderShopList(shops);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /低温発酵/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/render.test.js`
Expected: FAIL(`renderShopList is not a function`)

- [ ] **Step 3: `js/render.js` に実装を追加する**

```javascript
// js/render.js に追記
export function renderShopList(shops) {
  return shops
    .map(
      (shop) => `
    <div class="shop-card">
      <p class="shop-name">${shop.name}</p>
      <p class="shop-meta">${shop.arrondissement} ・ ${shop.address}</p>
      ${shop.description ? `<p class="shop-desc">${shop.description}</p>` : ''}
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで開く</a>
    </div>`
    )
    .join('');
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/render.test.js`
Expected: 3 tests, 0 fail

- [ ] **Step 5: `css/style.css` にスタイルを追加する**

```css
.shop-card { padding: 18px 0; border-bottom: 1px solid var(--line); }
.shop-card:first-child { padding-top: 0; }
.shop-name { font-family: 'Zen Old Mincho', serif; font-weight: 700; font-size: 15px; margin: 0 0 4px; }
.shop-meta { font-size: 11.5px; color: var(--gray); margin: 0 0 8px; }
.shop-desc { font-size: 13px; line-height: 1.8; margin: 0 0 12px; }

.btn {
  display: inline-block;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 16px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--bg);
  border-radius: 2px;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}
.btn-outline { background: transparent; color: var(--ink); }
```

- [ ] **Step 6: `index.html` にセクションを追加する**

```html
<!-- ranking セクションの後、nearby セクションの前に追加 -->
<section aria-labelledby="shops-h">
  <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="shops-h">受賞店一覧</h2></div>
  <div id="shop-list"></div>
</section>
```

- [ ] **Step 7: `js/main.js` に描画呼び出しを追加する**

```javascript
// js/main.js の import を更新
import { renderProgramList, renderRankingGroups, renderShopList } from './render.js';

// init() 内、ranking-groups の描画の後に追加
document.getElementById('shop-list').innerHTML = renderShopList(shops);
```

- [ ] **Step 8: ローカルサーバーで確認する**

Run: `python3 -m http.server 8420`

「受賞店一覧」セクションが表示され、「Googleマップで開く」ボタンをタップすると新しいタブでGoogleマップが開くことを確認する。

- [ ] **Step 9: Commit**

```bash
git add js/render.js js/main.js css/style.css index.html tests/render.test.js
git commit -m "feat: add shop list section with Google Maps links"
```

---

### Task 7: ジオコーディングユーティリティ(Nominatim)

**Files:**
- Create: `js/geocode.js`
- Test: `tests/geocode.test.js`

**Interfaces:**
- Produces: `parseNominatimResults(json)` → `Array<{ lat: number, lng: number, label: string }>`。Task 9がこれを使う
- Produces: `geocodeAddress(query)` → `Promise<Array<{ lat: number, lng: number, label: string }>>`(実際のfetchを行うため単体テスト対象外。手動確認はTask 10で行う)

- [ ] **Step 1: 失敗するテストを書く(パース関数のみ、fetchはモックしない)**

```javascript
// tests/geocode.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNominatimResults } from '../js/geocode.js';

test('parseNominatimResults converts Nominatim response to lat/lng/label', () => {
  const raw = [
    { lat: '48.8566', lon: '2.3522', display_name: 'Paris, Île-de-France, France' }
  ];
  const result = parseNominatimResults(raw);
  assert.deepEqual(result, [{ lat: 48.8566, lng: 2.3522, label: 'Paris, Île-de-France, France' }]);
});

test('parseNominatimResults returns empty array for empty response', () => {
  assert.deepEqual(parseNominatimResults([]), []);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/geocode.test.js`
Expected: FAIL(`js/geocode.js` が存在しない)

- [ ] **Step 3: 実装を書く**

```javascript
// js/geocode.js
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT_PARAM = 'paris-bread-contest-guide (personal, non-commercial lookup)';

export function parseNominatimResults(raw) {
  return raw.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name
  }));
}

export async function geocodeAddress(query) {
  const url = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(query)}&email=${encodeURIComponent(USER_AGENT_PARAM)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status}`);
  }
  const json = await res.json();
  return parseNominatimResults(json);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/geocode.test.js`
Expected: 2 tests, 0 fail

- [ ] **Step 5: Commit**

```bash
git add js/geocode.js tests/geocode.test.js
git commit -m "feat: add Nominatim geocoding utility with response parsing"
```

---

### Task 8: 近くの受賞店ソートロジック

**Files:**
- Create: `js/nearby.js`
- Test: `tests/nearby.test.js`

**Interfaces:**
- Consumes: `haversineDistanceKm`(Task 3)、`data/shops.json`のスキーマ(Task 2)
- Produces: `sortShopsByDistance(shops, originLat, originLng)` → `Array<{ shop, distanceKm }>`(距離昇順)。Task 9のUI結線がこれを使う

- [ ] **Step 1: 失敗するテストを書く**

```javascript
// tests/nearby.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortShopsByDistance } from '../js/nearby.js';

const shops = [
  { id: 'far', name: 'Far Shop', lat: 48.9000, lng: 2.4000 },
  { id: 'near', name: 'Near Shop', lat: 48.8566, lng: 2.3525 }
];

test('sortShopsByDistance orders nearest first', () => {
  const result = sortShopsByDistance(shops, 48.8566, 2.3522);
  assert.equal(result[0].shop.id, 'near');
  assert.equal(result[1].shop.id, 'far');
});

test('sortShopsByDistance attaches distanceKm as a number', () => {
  const result = sortShopsByDistance(shops, 48.8566, 2.3522);
  assert.equal(typeof result[0].distanceKm, 'number');
  assert.ok(result[0].distanceKm < result[1].distanceKm);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/nearby.test.js`
Expected: FAIL(`js/nearby.js` が存在しない)

- [ ] **Step 3: 実装を書く**

```javascript
// js/nearby.js
import { haversineDistanceKm } from './distance.js';

export function sortShopsByDistance(shops, originLat, originLng) {
  return shops
    .map((shop) => ({
      shop,
      distanceKm: haversineDistanceKm(originLat, originLng, shop.lat, shop.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/nearby.test.js`
Expected: 2 tests, 0 fail

- [ ] **Step 5: Commit**

```bash
git add js/nearby.js tests/nearby.test.js
git commit -m "feat: add shop distance sorting logic"
```

---

### Task 9: 「近くの受賞店を探す」UI結線

**Files:**
- Modify: `js/render.js`
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `sortShopsByDistance`(Task 8)、`geocodeAddress`(Task 7)、`formatDistance`(Task 3)
- Produces: `renderNearbyResults(sortedShops)` → `string`(HTML片)

- [ ] **Step 1: 失敗するテストを追記する**

```javascript
// tests/render.test.js に追記
import { renderNearbyResults } from '../js/render.js';

test('renderNearbyResults shows shop name, formatted distance, and maps link', () => {
  const sorted = [
    {
      shop: {
        name: 'Fournil Didot',
        arrondissement: '14e',
        google_maps_url: 'https://www.google.com/maps/search/?api=1&query=48.8272,2.3129'
      },
      distanceKm: 0.65
    }
  ];
  const html = renderNearbyResults(sorted);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /650m/);
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.8272,2\.3129"/);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/render.test.js`
Expected: FAIL(`renderNearbyResults is not a function`)

- [ ] **Step 3: `js/render.js` に実装を追加する**

```javascript
// js/render.js の先頭 import に追加
import { formatDistance } from './distance.js';

// 末尾に追加
export function renderNearbyResults(sorted) {
  return sorted
    .map(
      ({ shop, distanceKm }) => `
    <div class="nearby-card">
      <div>
        <p class="nearby-card-name">${shop.name}</p>
        <p class="nearby-card-meta">${shop.arrondissement}</p>
      </div>
      <div class="nearby-distance">${formatDistance(distanceKm)}</div>
      <a class="btn btn-outline shop-map-link" href="${shop.google_maps_url}" target="_blank" rel="noopener">Googleマップで経路を見る</a>
    </div>`
    )
    .join('');
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/render.test.js`
Expected: 4 tests, 0 fail

- [ ] **Step 5: `index.html` にフォームと結果表示エリアを追加する**

```html
<!-- shop-list セクションの後に追加 -->
<section aria-labelledby="nearby-h">
  <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="nearby-h">近くの受賞店を探す</h2></div>
  <p class="section-note">現在地、またはホテル名・住所を入力すると、近い受賞店を距離順に表示します</p>

  <div class="nearby-form">
    <button id="gps-btn" class="btn gps-btn" type="button">現在地から探す</button>
    <div class="nearby-divider">または住所・ホテル名で検索</div>
    <div class="nearby-row">
      <input id="address-input" class="nearby-input" type="text" placeholder="例: Hôtel de la Paix, 9e arrondissement">
      <button id="address-search-btn" class="btn btn-outline" type="button">検索</button>
    </div>
    <p id="nearby-status" class="section-note" style="margin:0;"></p>
  </div>

  <div id="nearby-results" class="nearby-results"></div>
</section>
```

- [ ] **Step 6: `js/main.js` にイベントハンドラを追加する**

```javascript
// js/main.js の import を更新
import { renderProgramList, renderRankingGroups, renderShopList, renderNearbyResults } from './render.js';
import { sortShopsByDistance } from './nearby.js';
import { geocodeAddress } from './geocode.js';

// init() の最後、または別関数として追加
function setupNearbySearch(shops) {
  const statusEl = document.getElementById('nearby-status');
  const resultsEl = document.getElementById('nearby-results');

  function showResults(lat, lng) {
    const sorted = sortShopsByDistance(shops, lat, lng);
    resultsEl.innerHTML = renderNearbyResults(sorted);
    statusEl.textContent = '';
  }

  document.getElementById('gps-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusEl.textContent = 'この端末は現在地取得に対応していません。住所で検索してください。';
      return;
    }
    statusEl.textContent = '現在地を取得しています…';
    navigator.geolocation.getCurrentPosition(
      (pos) => showResults(pos.coords.latitude, pos.coords.longitude),
      () => { statusEl.textContent = '現在地を取得できませんでした。住所で検索してください。'; }
    );
  });

  document.getElementById('address-search-btn').addEventListener('click', async () => {
    const query = document.getElementById('address-input').value.trim();
    if (!query) return;
    statusEl.textContent = '検索しています…';
    try {
      const matches = await geocodeAddress(query);
      if (matches.length === 0) {
        statusEl.textContent = '住所が見つかりませんでした。表記を変えて試してください。';
        return;
      }
      showResults(matches[0].lat, matches[0].lng);
    } catch (err) {
      statusEl.textContent = '検索中にエラーが発生しました。しばらくしてから再度お試しください。';
    }
  });
}

// init() 内、shop-list 描画の後に追加
setupNearbySearch(shops);
```

- [ ] **Step 7: `css/style.css` にフォームと結果カードのスタイルを追加する**

```css
.nearby-form { background: var(--surface); padding: 20px; display: grid; gap: 12px; border-radius: 2px; }
.nearby-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.nearby-input {
  font-family: inherit; font-size: 14px; padding: 12px 14px;
  border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 2px;
}
.nearby-input:focus { outline: 2px solid var(--blue); outline-offset: 1px; }
.nearby-divider { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--gray); }
.nearby-divider::before, .nearby-divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.gps-btn { width: 100%; text-align: center; }

.nearby-results { margin-top: 20px; display: grid; gap: 1px; background: var(--line); }
.nearby-results:not(:empty) { border: 1px solid var(--line); }
.nearby-card { background: var(--bg); padding: 16px; display: grid; gap: 8px; }
.nearby-card-name { font-weight: 700; font-size: 14px; margin: 0 0 3px; }
.nearby-card-meta { font-size: 11px; color: var(--gray); margin: 0; }
.nearby-distance { font-family: 'Libre Caslon Display', serif; font-size: 16px; color: var(--blue); }

@media (min-width: 480px) {
  .nearby-card { grid-template-columns: 1fr auto auto; align-items: center; }
}
```

- [ ] **Step 8: ローカルサーバーで確認する**

Run: `python3 -m http.server 8420`

- 「現在地から探す」ボタンを押すとブラウザが位置情報許可を求め、許可すると結果が距離順に表示される(ローカル環境では位置情報がおおよそのIPベース値になる場合がある)
- 住所欄に `Tour Eiffel, Paris` などと入力して「検索」を押すと、Nominatimからの応答をもとに結果が表示される(ネットワーク接続が必要)
- 375px幅で入力欄・ボタンが操作しやすいサイズになっているか確認する

- [ ] **Step 9: Commit**

```bash
git add js/render.js js/main.js css/style.css index.html tests/render.test.js
git commit -m "feat: wire up nearby shop search with GPS and address geocoding"
```

---

### Task 10: コンクール詳細ページ

**Files:**
- Create: `contest.html`
- Modify: `js/render.js`
- Modify: `js/main.js`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: URLクエリパラメータ `?id=baguette` で `data/contests.json` から対象コンクールを特定
- Produces: `renderContestDetail(contest, results, shops)` → `string`(HTML片)

- [ ] **Step 1: 失敗するテストを追記する**

```javascript
// tests/render.test.js に追記
import { renderContestDetail } from '../js/render.js';

test('renderContestDetail shows organizer, frequency, and all rankings for the contest', () => {
  const contest = { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', frequency: '年1回(例年2月頃)' };
  const results = [
    {
      contest_id: 'baguette',
      year: 2026,
      rankings: [{ rank: 1, shop_id: 'fournil-didot' }],
      source_url: 'https://presse.paris.fr/example'
    }
  ];
  const shops = [{ id: 'fournil-didot', name: 'Fournil Didot', arrondissement: '14e' }];

  const html = renderContestDetail(contest, results, shops);
  assert.match(html, /パリ市/);
  assert.match(html, /年1回/);
  assert.match(html, /Fournil Didot/);
  assert.match(html, /2026/);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test tests/render.test.js`
Expected: FAIL(`renderContestDetail is not a function`)

- [ ] **Step 3: `js/render.js` に実装を追加する**

```javascript
// js/render.js 末尾に追加
export function renderContestDetail(contest, results, shops) {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const contestResults = results
    .filter((r) => r.contest_id === contest.id)
    .sort((a, b) => b.year - a.year);

  const yearBlocks = contestResults
    .map((result) => {
      const rows = result.rankings
        .map((r) => {
          const shop = shopById.get(r.shop_id);
          return `<li>${r.rank}位: ${shop.name}(${shop.arrondissement})</li>`;
        })
        .join('');
      return `
    <div class="contest-year-block">
      <p class="ranking-group-label">${result.year}年</p>
      <ul>${rows}</ul>
      <a class="ranking-source" href="${result.source_url}">出典 ↗</a>
    </div>`;
    })
    .join('');

  return `
    <p class="program-meta">主催: ${contest.organizer} ・ 開催頻度: ${contest.frequency}</p>
    ${yearBlocks}`;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test tests/render.test.js`
Expected: 5 tests, 0 fail

- [ ] **Step 5: `contest.html` を作成する**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>コンクール詳細 - パリ製パンコンクール図鑑</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Zen+Old+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="page">
  <div class="tricolore-rail"><span></span><span></span><span></span></div>
  <header class="hero">
    <a href="index.html" class="eyebrow">← パリ製パンコンクール図鑑</a>
    <h1 class="title" id="contest-title"></h1>
  </header>
  <section>
    <div id="contest-detail"></div>
  </section>
</div>
<script type="module" src="js/contest.js"></script>
</body>
</html>
```

- [ ] **Step 6: `js/contest.js` を作成する**

```javascript
// js/contest.js
import { renderContestDetail } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  const contest = contests.find((c) => c.id === id);
  if (!contest) {
    document.getElementById('contest-detail').textContent = 'コンクールが見つかりませんでした。';
    return;
  }

  document.getElementById('contest-title').textContent = contest.name;
  document.getElementById('contest-detail').innerHTML = renderContestDetail(contest, results, shops);
}

init();
```

- [ ] **Step 7: トップページのランキング見出しからリンクを張る**

`index.html` の `renderRankingGroups` 呼び出し結果は変更せず、`js/render.js` の `renderRankingGroups` 内の `ranking-group-label` を詳細ページへのリンクに変える:

```javascript
// js/render.js の renderRankingGroups 内、該当行を置き換え
return `
    <div class="ranking-group">
      <a class="ranking-group-label" href="contest.html?id=${contest.id}">${contest.name}</a>
      ${rows}
    </div>`;
```

対応するテスト(`renderRankingGroups includes shop name...`)のアサーションに以下を追加する:

```javascript
assert.match(html, /href="contest\.html\?id=baguette"/);
```

- [ ] **Step 8: 全テストを実行して確認する**

Run: `node --test tests/`
Expected: 全テストPASS

- [ ] **Step 9: ローカルサーバーで確認する**

Run: `python3 -m http.server 8420`

トップページのランキング見出し(例: 「Grand Prix de la Meilleure Baguette de Paris」)をタップし、`contest.html?id=baguette` に遷移して年度別ランキングと出典リンクが表示されることを確認する。

- [ ] **Step 10: Commit**

```bash
git add contest.html js/render.js js/contest.js tests/render.test.js
git commit -m "feat: add contest detail page with yearly ranking history"
```

---

### Task 11: 実イラスト画像の最終配置とレスポンシブ確認

**Files:**
- Modify: `css/style.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `assets/illustrations/hero-croissant-baguette.jpg`(既存、Task 5で参照済み)、`assets/illustrations/croissant.jpg`、`assets/illustrations/baguette.jpg`

- [ ] **Step 1: コンクール一覧行にアイコン画像を追加する**

`index.html` の `program-list` は `js/render.js` の `renderProgramList` が生成するため、そちらにアイコンを追加する。まず `tests/render.test.js` 先頭の共有テストデータ `contests` に `category` フィールドを追加する(Task4時点では未定義だった):

```javascript
// tests/render.test.js 先頭付近、既存の contests 定義を置き換え
const contests = [
  { id: 'baguette', name: 'Grand Prix de la Baguette', organizer: 'パリ市', category: 'baguette', next_edition_date: null }
];
```

次に `js/render.js` の `renderProgramList` を置き換える:

```javascript
// js/render.js の renderProgramList を置き換え
export function renderProgramList(contests) {
  const iconByCategory = {
    baguette: 'assets/illustrations/baguette.jpg',
    croissant: 'assets/illustrations/croissant.jpg'
  };
  return contests
    .map(
      (c) => `
    <div class="program-row">
      <img class="program-icon" src="${iconByCategory[c.category] ?? ''}" alt="${c.category}">
      <div>
        <p class="program-name">${c.name}</p>
        <p class="program-meta">主催: ${c.organizer}</p>
      </div>
      <div class="program-date">${c.next_edition_date ?? '次回未発表'}<span class="status">下書き待ち</span></div>
    </div>`
    )
    .join('');
}
```

対応するテストのアサーションに以下を追加する(`tests/render.test.js`):

```javascript
assert.match(html, /baguette\.jpg/);
```

- [ ] **Step 2: `css/style.css` にアイコンスタイルを追加し、`program-row` のグリッドを更新する**

```css
.program-row {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.program-icon { width: 44px; height: 44px; object-fit: cover; border-radius: 50%; }
```

- [ ] **Step 3: テストを実行する**

Run: `node --test tests/`
Expected: 全テストPASS

- [ ] **Step 4: 375px幅と1024px幅の両方でブラウザ確認する**

Run: `python3 -m http.server 8420`

ブラウザの開発者ツールでビューポート幅を375pxと1024pxに切り替え、以下を確認する:
- ヒーロー画像・アイコン画像が正しいアスペクト比で表示される
- 375px幅でボタン・入力欄が指でタップしやすい大きさ(44px以上の高さ)になっている
- 横スクロールが発生していない

- [ ] **Step 5: Commit**

```bash
git add js/render.js css/style.css tests/render.test.js
git commit -m "feat: add contest icons and verify mobile/desktop layout"
```

---

### Task 12: README作成と自動更新ワークフローの運用メモ

**Files:**
- Create: `README.md`

**Interfaces:**
- なし(ドキュメントのみ)

- [ ] **Step 1: `README.md` を作成する**

```markdown
# パリ製パンコンクール図鑑

パリのバゲット・クロワッサンコンクールの日程・ランキング・受賞店情報をまとめた静的サイト。

## ローカルでの確認方法

\`\`\`bash
python3 -m http.server 8420
\`\`\`

ブラウザで `http://localhost:8420/` を開く。

## テストの実行

\`\`\`bash
node --test tests/
\`\`\`

## データの更新方法

1. `data/contests.json` / `data/results.json` / `data/shops.json` を編集する
2. `node --test tests/data.test.js` でスキーマ・出典URL・shop_id参照の整合性を確認する
3. ローカルサーバーで表示を確認する
4. コミットする

## 自動更新ワークフロー(運用イメージ)

`docs/design.md` の「自動更新ワークフロー」節を参照。週1回、Claudeが公式サイトを巡回して差分の下書きを作成する。完全自動公開はせず、むんたがチャットで内容を確認・承認してからdata/*.jsonを更新する。

## GitHub Pagesでの公開

このリポジトリをGitHubにpushし、リポジトリ設定でGitHub Pagesを有効化する(公開は別途承認の上で行う)。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with local dev, testing, and update workflow instructions"
```

---

## Out of Scope for This Plan

- GitHubへのリモートpushとGitHub Pages公開設定の実行(リポジトリ作成・公開は共有影響があるため、実装完了後に別途むんたの承認を得てから行う)
- 週次自動更新Scheduled Taskの実際の登録(`docs/design.md` のワークフロー定義に基づき、サイト実装完了後に別途設定する)
- pain au chocolatなど他部門の追加(将来の拡張として`data/contests.json`に追加できる構造にはなっている)
