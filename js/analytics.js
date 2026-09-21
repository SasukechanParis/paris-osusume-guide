// 匿名の利用集計(GoatCounter)。改善に必要な少数のイベントだけを、固定のコードで数える。
// 住所・ホテル名・現在地・自由入力の検索語・共有データ・店名は、決して送らない(ここに渡さない)。
// 計測がブロックされていても(count.js が読み込めない等)、すべての機能はそのまま動く。

export const EVENTS = ['search', 'search-zero', 'route', 'save', 'share', 'offline', 'french', 'report'];
const CODE_PATTERN = /^[a-z0-9-]{1,24}$/;

// 送るパスを組み立てる(テスト用に分離)。許可されていないイベントは null
export function eventPath(event, code = '') {
  if (!EVENTS.includes(event)) return null;
  return code && CODE_PATTERN.test(code) ? `event/${event}/${code}` : `event/${event}`;
}

export function track(event, code = '') {
  const path = eventPath(event, code);
  if (!path) return;
  try {
    globalThis.goatcounter?.count?.({ path, title: event, event: true });
  } catch {
    // 計測の失敗で機能を止めない
  }
}
