// 検索の利用状況を、固定のコードだけで数える(検索語そのものは、ここにも計測にも渡さない)。
//   search       … 結果が1件以上あった検索(code: query=検索語あり / filter=条件だけ / mixed=両方)
//   search-zero  … 0件だった検索(同じ code)
// 入力のたびに送らないよう、操作が止まって一定時間たった時点の状態を1回だけ送る。

import { track } from './analytics.js';

export function classifySearch({ hasQuery, hasFilters, count }) {
  if (!hasQuery && !hasFilters) return null;
  const code = hasQuery ? (hasFilters ? 'mixed' : 'query') : 'filter';
  return { event: count === 0 ? 'search-zero' : 'search', code };
}

// setTimeout / clearTimeout は window から切り離して呼ぶと Illegal invocation になるため、包んで渡す
const realTimers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };

// signature: 直前と同じ条件かを見分けるための、この端末の中だけで使う文字列(送らない)
// 計測の失敗で検索そのものを止めない(note は決して例外を投げない)
export function createSearchTracker({ send = track, delay = 1500, timers = realTimers } = {}) {
  let pending = null;
  let timer = null;
  let lastSent = null;
  return {
    note(signature, info) {
      try {
        timers.clear(timer);
        const kind = classifySearch(info);
        if (!kind) {
          pending = null;
          lastSent = null;
          return;
        }
        pending = { signature, kind };
        timer = timers.set(() => {
          if (pending && pending.signature !== lastSent) {
            lastSent = pending.signature;
            send(pending.kind.event, pending.kind.code);
          }
          pending = null;
        }, delay);
      } catch {
        pending = null;
      }
    }
  };
}
