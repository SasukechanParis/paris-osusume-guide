// 店・施設のデータを、検索・保存・共有で使う共通の形(Place)にそろえる読み取り用アダプター。
// 元のJSONの構造は変えない。IDはデータセットごとの接頭辞を付けて衝突を避ける(例: r.septime / m.septime)。
// 同一店は data/place-aliases.json の明示的な対応表でだけ1件にまとめる(別支店は決してまとめない)。

import { arrondissementLabel } from './render.js';
import { CATEGORY_STYLE } from './category-style.js';
import { normalizeText } from './text-normalize.js';

export const DATASET_CODES = {
  rec: 'r',
  guest: 'g',
  shop: 's',
  michelin: 'm',
  trending: 't',
  flea: 'f',
  march: 'a',
  free: 'e',
  passage: 'p',
  toilet: 'w'
};
const CODE_TO_DATASET = Object.fromEntries(Object.entries(DATASET_CODES).map(([ds, code]) => [code, ds]));

export function makeUid(ds, id) {
  return `${DATASET_CODES[ds]}.${id}`;
}

export function parseUid(uid) {
  const match = /^([a-z])\.([a-z0-9-]{1,80})$/.exec(String(uid));
  if (!match) return null;
  const ds = CODE_TO_DATASET[match[1]];
  return ds ? { ds, id: match[2] } : null;
}

export const SOURCE_LABEL = {
  sasuke: 'さすけ',
  guest: '先輩カップル',
  reference: '公式・出典つきデータ'
};

const STATUS_LABEL = { recommended: 'おすすめ', curious: '気になる(未訪問)' };

// 利用者向けの絞り込み(カテゴリのまとまり)
export const FILTER_GROUPS = [
  { id: 'eat', label: 'レストラン・カフェ', categories: ['restaurant', 'cafe'] },
  { id: 'sweets', label: 'スイーツ', categories: ['chocolatier', 'patisserie'] },
  { id: 'bread', label: 'パン屋・受賞店', categories: ['bakery', 'contest'] },
  { id: 'gift', label: 'お土産・スーパー', categories: ['souvenir', 'supermarket'] },
  { id: 'hotel', label: 'ホテル', categories: ['hotel'] },
  { id: 'michelin', label: 'ミシュラン星付き', categories: ['michelin'] },
  { id: 'market', label: '市場', categories: ['flea_market'] },
  { id: 'free', label: '無料スポット', categories: ['free_spot'] },
  { id: 'toilet', label: 'トイレ', categories: ['toilet'] },
  { id: 'trend', label: '今話題', categories: ['trending'] }
];

const CATEGORY_PAGE = {
  restaurant: 'restaurants.html',
  cafe: 'restaurants.html',
  chocolatier: 'chocolatiers.html',
  patisserie: 'chocolatiers.html',
  bakery: 'bakeries.html',
  souvenir: 'souvenirs.html',
  supermarket: 'supermarket.html',
  hotel: 'hotels.html',
  contest: 'bread.html',
  michelin: 'michelin.html',
  trending: 'index.html',
  flea_market: 'flea-markets.html',
  free_spot: 'free-spots.html',
  toilet: 'toilets-map.html'
};

function detailHref(place) {
  if (place.category === 'contest') return `shop.html?id=${place.id}`;
  if (place.category === 'toilet') return 'toilets-map.html';
  if (place.category === 'trending') return 'index.html#trending-h';
  return `${CATEGORY_PAGE[place.category]}#place-${place.uid}`;
}

function build(ds, item, { category, source, status = null }) {
  const place = {
    uid: makeUid(ds, item.id),
    ds,
    id: item.id,
    category,
    name: item.name,
    address: item.address ?? null,
    arrondissement: item.arrondissement ?? null,
    lat: typeof item.lat === 'number' ? item.lat : null,
    lng: typeof item.lng === 'number' ? item.lng : null,
    description: item.description ?? null,
    google_maps_url: item.google_maps_url ?? null,
    hours: item.hours ?? null,
    source,
    status,
    group: item.group ?? null,
    submitted_by: item.submitted_by ?? null,
    sourceUrl: item.source_url ?? null,
    stars: item.stars ?? null,
    genre: item.genre ?? null,
    hotel: item.hotel ?? null,
    access: item.access ?? null,
    pmr_accessible: item.pmr_accessible ?? null,
    baby_changing: item.baby_changing ?? null,
    alsoIn: []
  };
  return { ...place, href: detailHref(place) };
}

export const fromRecommendations = (items) =>
  items.map((it) => build('rec', it, { category: it.category, source: 'sasuke', status: it.status ?? null }));
export const fromGuest = (items) => items.map((it) => build('guest', it, { category: it.category, source: 'guest' }));
export const fromShops = (items) => items.map((it) => build('shop', it, { category: 'contest', source: 'reference' }));
export const fromMichelin = (items) => items.map((it) => build('michelin', it, { category: 'michelin', source: 'reference' }));
export const fromTrending = (items) => items.map((it) => build('trending', it, { category: 'trending', source: 'reference' }));
export const fromFleaMarkets = (items) => items.map((it) => build('flea', it, { category: 'flea_market', source: 'reference' }));
export const fromMarches = (items) => items.map((it) => build('march', it, { category: 'flea_market', source: 'reference' }));
export const fromFreeSpots = (items) => items.map((it) => build('free', it, { category: 'free_spot', source: 'reference' }));
// パッサージュは「さすけが実際に足を運んで確認した」と free-spots.html に明記されている
export const fromPassages = (items) => items.map((it) => build('passage', it, { category: 'free_spot', source: 'sasuke' }));
export const fromToilets = (items) => items.map((it) => build('toilet', it, { category: 'toilet', source: 'reference' }));

// ページのカードに id="place-<uid>" を付けるため、元のJSONの項目に uid を足す(元の項目は変更しない)
export function annotate(items, ds) {
  return items.map((item) => ({ ...item, uid: makeUid(ds, item.id) }));
}

export function placeCategories(place) {
  return [place.category, ...place.alsoIn.map((a) => a.category)];
}

function mergeInto(base, alias) {
  return {
    ...base,
    stars: base.stars ?? alias.stars,
    genre: base.genre ?? alias.genre,
    hotel: base.hotel ?? alias.hotel,
    lat: base.lat ?? alias.lat,
    lng: base.lng ?? alias.lng,
    address: base.address ?? alias.address,
    alsoIn: [...base.alsoIn, { uid: alias.uid, category: alias.category, name: alias.name }]
  };
}

// 対応表(same_place)に載っている重複だけを1件にまとめる。表にない類似店は触らない。
export function applyAliases(places, aliases) {
  const byUid = new Map(places.map((p) => [p.uid, p]));
  const dropped = new Set();
  const merged = new Map();
  for (const entry of aliases?.same_place ?? []) {
    const canonical = byUid.get(entry.canonical);
    if (!canonical) continue;
    let next = canonical;
    for (const aliasUid of entry.also) {
      const alias = byUid.get(aliasUid);
      if (!alias) continue;
      dropped.add(aliasUid);
      next = mergeInto(next, alias);
    }
    merged.set(next.uid, next);
  }
  return places.filter((p) => !dropped.has(p.uid)).map((p) => merged.get(p.uid) ?? p);
}

function tagsOf(place) {
  const tags = [];
  for (const category of placeCategories(place)) tags.push(CATEGORY_STYLE[category]?.label);
  tags.push(SOURCE_LABEL[place.source], STATUS_LABEL[place.status]);
  if (place.group === 'japanese') tags.push('日本食', '和食');
  if (place.stars) tags.push('ミシュラン', '★'.repeat(place.stars));
  if (place.pmr_accessible) tags.push('車椅子対応');
  if (place.baby_changing) tags.push('おむつ交換台');
  if (place.arrondissement) tags.push(arrondissementLabel(place.arrondissement), place.arrondissement);
  return tags.filter(Boolean);
}

// 検索用の正規化済みフィールドを付ける(名前・タグ・全文)
export function indexPlace(place) {
  const tags = tagsOf(place);
  const name = [place.name, ...place.alsoIn.map((a) => a.name)].join(' ');
  return {
    ...place,
    nameNorm: normalizeText(name),
    tagsNorm: normalizeText(tags.join(' ')),
    searchText: normalizeText(
      [name, place.address, place.description, place.genre, place.hotel, place.hours, place.access, ...tags].filter(Boolean).join(' ')
    )
  };
}

// data: 読み込んだJSON。toilets は必要になってから渡してよい(省略可)
export function buildPlaces(data, aliases = null) {
  const all = [
    ...fromRecommendations(data.recommendations ?? []),
    ...fromGuest(data.guestRecommendations ?? []),
    ...fromShops(data.shops ?? []),
    ...fromMichelin(data.michelin ?? []),
    ...fromTrending(data.trending ?? []),
    ...fromFleaMarkets(data.fleaMarkets ?? []),
    ...fromMarches(data.marches ?? []),
    ...fromFreeSpots(data.freeSpots ?? []),
    ...fromPassages(data.passages ?? []),
    ...fromToilets(data.toilets ?? [])
  ];
  return applyAliases(all, aliases).map(indexPlace);
}
