// 横断検索の純粋ロジック(DOMなし)。店・施設は places.js の Place、記事は data/search-articles.json。
// 方針: 根拠のあるデータだけで絞り込む。値のない店を「安い」「予約不要」などとは扱わない。
//       条件を黙って緩めない(0件のときは利用者が条件を外す)。

import { normalizeText } from './text-normalize.js';
import { haversineDistanceKm } from './distance.js';
import { FILTER_GROUPS, SOURCE_LABEL, placeCategories } from './places.js';
import { findSpot } from './spots.js';
import { FACT_FILTERS } from './fact-schema.js';

export const RADIUS_OPTIONS = [500, 1000, 2000];

const GROUP_IDS = new Set(FILTER_GROUPS.map((g) => g.id));
const VALID_SOURCES = new Set(Object.keys(SOURCE_LABEL));
const VALID_STATUSES = new Set(['recommended', 'curious']);
const VALID_ARRONDISSEMENTS = new Set([
  ...Array.from({ length: 20 }, (_, i) => (i === 0 ? '1er' : `${i + 1}e`)),
  'Hauts-de-Seine',
  'Seine-Saint-Denis',
  'Val-de-Marne'
]);

// 「確認済みの条件」で絞り込むための項目(定義は js/fact-schema.js)。データに値が1件でもあるものだけ画面に出す。
export { FACT_FILTERS };

// data/place-facts.json の1件を、検索・表示で使う形にそろえる(予算は band を絞り込み用の budget_band にも写す)
export function normalizeFacts(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const budgetBand = raw.budget?.band ?? raw.budget_band;
  return budgetBand ? { ...raw, budget_band: budgetBand } : { ...raw };
}

export const DEFAULT_STATE = Object.freeze({
  q: '',
  cats: [],
  sources: [],
  statuses: [],
  arr: 'all',
  japanese: false,
  near: null, // null | 'spot:<id>' | 'hotel' | 'gps' | 'address'(gps/addressはURLに載せない)
  radius: null,
  view: 'list',
  facts: {}
});

const unique = (list) => [...new Set(list)];

// ---------- URL ⇔ 状態 ----------
export function parseSearchParams(params) {
  const list = (key, valid) => unique((params.get(key) ?? '').split(',').filter((v) => valid.has(v)));
  const nearRaw = params.get('near') ?? '';
  let near = null;
  if (nearRaw === 'hotel') near = 'hotel';
  else if (/^spot:[a-z0-9-]+$/.test(nearRaw) && findSpot(nearRaw.slice(5))) near = nearRaw;
  const radius = Number(params.get('r'));
  const arr = params.get('arr') ?? 'all';
  const facts = {};
  for (const filter of FACT_FILTERS) {
    const value = params.get(filter.param);
    if (value && Object.hasOwn(filter.labels, value)) facts[filter.key] = value;
  }
  return {
    ...DEFAULT_STATE,
    q: (params.get('q') ?? '').trim().slice(0, 80),
    cats: list('cat', GROUP_IDS),
    sources: list('src', VALID_SOURCES),
    statuses: list('st', VALID_STATUSES),
    arr: VALID_ARRONDISSEMENTS.has(arr) ? arr : 'all',
    japanese: params.get('jp') === '1',
    near,
    radius: near && RADIUS_OPTIONS.includes(radius) ? radius : null,
    view: params.get('view') === 'map' ? 'map' : 'list',
    facts
  };
}

// 共有・再現してよい条件だけをURLにする。現在地・住所・ホテルの座標は決して載せない。
export function buildSearchParams(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.cats.length) params.set('cat', state.cats.join(','));
  if (state.sources.length) params.set('src', state.sources.join(','));
  if (state.statuses.length) params.set('st', state.statuses.join(','));
  if (state.arr !== 'all') params.set('arr', state.arr);
  if (state.japanese) params.set('jp', '1');
  const urlSafeNear = state.near === 'hotel' || (state.near ?? '').startsWith('spot:');
  if (urlSafeNear) {
    params.set('near', state.near);
    if (state.radius) params.set('r', String(state.radius));
  }
  if (state.view === 'map') params.set('view', 'map');
  for (const filter of FACT_FILTERS) {
    if (state.facts[filter.key] !== undefined) params.set(filter.param, state.facts[filter.key]);
  }
  return params;
}

// ---------- 別名(少数の明示的な辞書) ----------
export function buildAliasIndex(groups) {
  const index = new Map();
  for (const group of groups) {
    const terms = unique(group.map(normalizeText).filter(Boolean));
    for (const term of terms) {
      const set = index.get(term) ?? new Set();
      for (const t of terms) set.add(t);
      index.set(term, set);
    }
  }
  return index;
}

// 入力語 → その語と同じ意味の語の一覧。語が別名の語を含む場合(例: ラーメン屋)は、3文字以上の別名だけ展開する
export function expandToken(token, aliasIndex) {
  const alternatives = new Set([token]);
  const exact = aliasIndex.get(token);
  if (exact) for (const t of exact) alternatives.add(t);
  else {
    for (const [term, synonyms] of aliasIndex) {
      if (term.length >= 3 && token.includes(term)) for (const t of synonyms) alternatives.add(t);
    }
  }
  return [...alternatives];
}

// 空白を含む別名(例: "tax free")は、語ごとに分けず1つのまとまりとして扱う
export function expandQuery(query, aliasIndex) {
  let rest = normalizeText(query);
  const phrases = [];
  const multiWord = [...aliasIndex.keys()].filter((term) => term.includes(' ')).sort((a, b) => b.length - a.length);
  for (const term of multiWord) {
    if (rest.includes(term)) {
      phrases.push(expandToken(term, aliasIndex));
      rest = rest.replace(term, ' ');
    }
  }
  const tokens = rest.split(' ').filter(Boolean);
  return [...phrases, ...tokens.map((token) => expandToken(token, aliasIndex))];
}

// ---------- 一致度 ----------
// すべての語(AND)が一致しなければ0。名前一致 > タグ一致 > 全文一致。
export function matchScore(place, tokenAlternatives) {
  let total = 0;
  for (const alternatives of tokenAlternatives) {
    let best = 0;
    for (const alt of alternatives) {
      if (place.nameNorm === alt) best = Math.max(best, 100);
      else if (place.nameNorm.startsWith(alt)) best = Math.max(best, 70);
      else if (place.nameNorm.includes(alt)) best = Math.max(best, 50);
      else if (place.tagsNorm.includes(alt)) best = Math.max(best, 30);
      else if (place.searchText.includes(alt)) best = Math.max(best, 10);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

// ---------- 確認済みの条件 ----------
function factValue(place, key) {
  const value = place.facts?.[key];
  return value === undefined || value === null ? null : String(value);
}

function matchesFacts(place, selected) {
  return Object.entries(selected).every(([key, value]) => factValue(place, key) === value);
}

// データに値が1件でもある条件だけを返す(飾りのフィルターを出さない)
export function availableFactFilters(places) {
  const result = [];
  for (const filter of FACT_FILTERS) {
    const counts = new Map();
    for (const place of places) {
      const value = factValue(place, filter.key);
      if (value !== null && Object.hasOwn(filter.labels, value)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    if (counts.size > 0) {
      result.push({
        ...filter,
        options: Object.keys(filter.labels).filter((v) => counts.has(v)).map((v) => ({ value: v, label: filter.labels[v], count: counts.get(v) }))
      });
    }
  }
  return result;
}

export function attachFacts(places, factsByUid) {
  return places.map((place) => {
    const facts = normalizeFacts(factsByUid?.[place.uid]);
    return facts ? { ...place, facts } : place;
  });
}

// ---------- 検索・絞り込み ----------
export function hasCriteria(state, { anchor = null, bbox = null } = {}) {
  return Boolean(
    state.q || state.cats.length || state.sources.length || state.statuses.length || state.arr !== 'all' ||
      state.japanese || anchor || bbox || Object.keys(state.facts).length
  );
}

const STATUS_RANK = { recommended: 0, curious: 1 };

function compareResults(hasQuery, hasAnchor) {
  return (a, b) => {
    if (hasAnchor) return a.distanceKm - b.distanceKm || b.score - a.score;
    if (hasQuery && a.score !== b.score) return b.score - a.score;
    const status = (STATUS_RANK[a.place.status] ?? 2) - (STATUS_RANK[b.place.status] ?? 2);
    return status || a.place.name.localeCompare(b.place.name, 'ja');
  };
}

// anchor: {lat,lng}(現在地・主要地点・ホテル)。bbox: {south,west,north,east}(地図の範囲)
export function searchPlaces(places, state, { aliasIndex, anchor = null, bbox = null }) {
  const tokenAlternatives = expandQuery(state.q, aliasIndex);
  const wanted = state.cats.length
    ? new Set(FILTER_GROUPS.filter((g) => state.cats.includes(g.id)).flatMap((g) => g.categories))
    : null;
  const results = [];
  for (const place of places) {
    if (wanted && !placeCategories(place).some((c) => wanted.has(c))) continue;
    if (state.sources.length && !state.sources.includes(place.source)) continue;
    if (state.statuses.length && !state.statuses.includes(place.status)) continue;
    if (state.arr !== 'all' && place.arrondissement !== state.arr) continue;
    if (state.japanese && place.group !== 'japanese') continue;
    if (!matchesFacts(place, state.facts)) continue;
    if (bbox) {
      if (place.lat === null) continue;
      if (place.lat < bbox.south || place.lat > bbox.north || place.lng < bbox.west || place.lng > bbox.east) continue;
    }
    let distanceKm = null;
    if (anchor) {
      if (place.lat === null) continue;
      distanceKm = haversineDistanceKm(anchor.lat, anchor.lng, place.lat, place.lng);
      if (state.radius && distanceKm * 1000 > state.radius) continue;
    }
    let score = 0;
    if (tokenAlternatives.length > 0) {
      score = matchScore(place, tokenAlternatives);
      if (score === 0) continue;
    }
    results.push({ place, score, distanceKm });
  }
  return results.sort(compareResults(tokenAlternatives.length > 0, Boolean(anchor)));
}

// ---------- 記事(見出し・要約から作った索引) ----------
export function indexArticles(articles) {
  return articles.map((a) => ({
    ...a,
    titleNorm: normalizeText(a.title),
    keywordsNorm: normalizeText((a.keywords ?? []).join(' ')),
    textNorm: normalizeText(`${a.title} ${a.summary ?? ''} ${a.text ?? ''}`)
  }));
}

export function searchArticles(articles, tokenAlternatives) {
  if (tokenAlternatives.length === 0) return [];
  const hits = [];
  for (const article of articles) {
    let total = 0;
    for (const alternatives of tokenAlternatives) {
      let best = 0;
      for (const alt of alternatives) {
        if (article.titleNorm.includes(alt)) best = Math.max(best, 100);
        else if (article.keywordsNorm.includes(alt)) best = Math.max(best, 60);
        else if (article.textNorm.includes(alt)) best = Math.max(best, 20);
      }
      if (best === 0) {
        total = 0;
        break;
      }
      total += best;
    }
    if (total > 0) hits.push({ article, score: total });
  }
  return hits.sort((a, b) => b.score - a.score);
}
