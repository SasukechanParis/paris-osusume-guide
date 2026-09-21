// 店・施設データの読み込み(検索ページ・保存ページで共通)。
// 1つのJSONが失敗しても、読めた分で動かす。すべて失敗したときだけ、通信できていないとして例外にする。

import { loadJson } from './data.js';
import { buildPlaces } from './places.js';
import { attachFacts } from './search-core.js';

export const CORE_SOURCES = {
  recommendations: 'data/recommendations.json',
  guestRecommendations: 'data/guest-recommendations.json',
  shops: 'data/shops.json',
  michelin: 'data/michelin.json',
  trending: 'data/trending.json',
  fleaMarkets: 'data/flea-markets.json',
  marches: 'data/marches.json',
  freeSpots: 'data/free-spots.json',
  passages: 'data/passages.json'
};

export async function loadOptional(path, fallback) {
  try {
    return await loadJson(path);
  } catch (err) {
    console.error(err);
    return fallback;
  }
}

export async function loadCore() {
  const entries = await Promise.all(
    Object.entries(CORE_SOURCES).map(async ([key, path]) => {
      try {
        return { key, data: await loadJson(path) };
      } catch (err) {
        return { key, error: err };
      }
    })
  );
  const failed = entries.filter((e) => e.error);
  if (failed.length === entries.length) throw failed[0].error;
  return { data: Object.fromEntries(entries.filter((e) => !e.error).map((e) => [e.key, e.data])), failedCount: failed.length };
}

export function assemblePlaces(data, aliases, facts) {
  return attachFacts(buildPlaces(data, aliases), facts);
}

// withToilets: トイレ581件(約400KB)は必要なときだけ取得する
export async function loadPlaceData({ withToilets = false } = {}) {
  const [core, aliases, factsFile, toilets] = await Promise.all([
    loadCore(),
    loadOptional('data/place-aliases.json', null),
    loadOptional('data/place-facts.json', { facts: {} }),
    withToilets ? loadJson('data/toilets.json') : Promise.resolve(null)
  ]);
  const data = toilets ? { ...core.data, toilets } : core.data;
  const facts = factsFile.facts ?? {};
  return { data, aliases, facts, places: assemblePlaces(data, aliases, facts), failedCount: core.failedCount };
}
