// 「今どうしたい?」を条件付きの結果へ。生成AIや外部APIは使わず、既存データの確かな項目だけで候補を選ぶ。
// 合う理由も、データにある事実(推薦元・区分・直線距離・説明文の語)だけから作る。
// ドレスで入店できる・予約なしで入れる・待ち時間がない、といったことは、根拠がない限り決して言わない。

import { DEFAULT_STATE, searchPlaces } from './search-core.js';
import { placeCategories, SOURCE_LABEL } from './places.js';
import { formatDistance } from './distance.js';

const EAT = new Set(['restaurant', 'cafe']);
// 「屋内の施設」と言ってよいのは、説明文にこれらの語があるものだけ(テラス・広場・公園は含めない)
const INDOOR_WORDS = ['博物館', '美術館', '図書館'];
const STATUS_TEXT = { recommended: 'さすけのおすすめ', curious: 'さすけが気になっている(未訪問)' };

const isEat = (p) => placeCategories(p).some((c) => EAT.has(c));
const hasIndoorWord = (p) => INDOOR_WORDS.some((w) => (p.description ?? '').includes(w));

export const GOAL_IDS = ['after-shoot', 'sit', 'japanese', 'rain', 'souvenir'];

// select: 候補にする条件 / needsAnchor: 起点(撮影を終えた場所など)を利用者に選んでもらう
export const GOALS = {
  'after-shoot': { select: (p) => isEat(p) && (p.source === 'sasuke' || p.source === 'guest'), needsAnchor: true, searchCats: ['eat'] },
  sit: { select: (p) => placeCategories(p).includes('cafe'), needsAnchor: false, searchCats: ['eat'] },
  japanese: { select: (p) => p.group === 'japanese', needsAnchor: false, searchCats: ['eat'], japanese: true },
  rain: { select: (p) => p.ds === 'passage' || (p.ds === 'free' && hasIndoorWord(p)), needsAnchor: false, searchCats: ['free'] },
  souvenir: { select: (p) => placeCategories(p).some((c) => c === 'souvenir' || c === 'supermarket'), needsAnchor: false, searchCats: ['gift'] }
};

export function selectForGoal(places, goalId) {
  return places.filter(GOALS[goalId].select);
}

// 「合う理由」: 表示してよい事実だけ
export function reasonsFor(goalId, place, distanceKm = null) {
  const reasons = [];
  if (place.source === 'guest') reasons.push('先輩カップルのおすすめ');
  else if (place.status && STATUS_TEXT[place.status]) reasons.push(STATUS_TEXT[place.status]);
  else if (place.source === 'sasuke') reasons.push(SOURCE_LABEL.sasuke);
  if (goalId === 'rain') {
    if (place.ds === 'passage') reasons.push('屋根付きのアーケード街(パッサージュ)');
    else reasons.push('屋内の展示施設(説明に博物館・美術館・図書館とあります)');
  }
  if (goalId === 'japanese' && place.group === 'japanese') reasons.push('日本食(現地の人お墨付きとして紹介)');
  if (goalId === 'sit') reasons.push('カフェ・サロン・ド・テ');
  if (place.stars) reasons.push(`ミシュラン${'★'.repeat(place.stars)}`);
  if (distanceKm !== null) reasons.push(`起点から直線${formatDistance(distanceKm)}`);
  return reasons;
}

// 戻り値: { needAnchor, results: [{ place, distanceKm, reasons }] }
export function runGoal(places, goalId, { anchor = null, aliasIndex }) {
  const goal = GOALS[goalId];
  if (goal.needsAnchor && !anchor) return { needAnchor: true, results: [] };
  const pool = selectForGoal(places, goalId);
  const found = searchPlaces(pool, DEFAULT_STATE, { aliasIndex, anchor });
  return { needAnchor: false, results: found.map((r) => ({ place: r.place, distanceKm: r.distanceKm, reasons: reasonsFor(goalId, r.place, r.distanceKm) })) };
}

// 「条件を絞って探す」ページ(search.html)へ、同じ条件で移る
export function searchLinkFor(goalId, near = null) {
  const goal = GOALS[goalId];
  const params = new URLSearchParams();
  if (goal.searchCats) params.set('cat', goal.searchCats.join(','));
  if (goal.japanese) params.set('jp', '1');
  if (near && (near === 'hotel' || near.startsWith('spot:'))) params.set('near', near);
  return `search.html?${params.toString()}`;
}
