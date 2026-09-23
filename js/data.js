// データ・JSの更新時はこの VERSION を書き換える(全ページの fetch に ?v= が付く)。
// sw.js の VERSION と一致させること(tests/offline.test.js が検証する)。
export const VERSION = '2026-09-23-1';

export class DataLoadError extends Error {
  constructor(reason, { path, status = null, cause = null } = {}) {
    super(`${reason}: ${path}${status ? ` (${status})` : ''}`);
    this.name = 'DataLoadError';
    this.reason = reason; // 'network' | 'timeout' | 'status' | 'parse'
    this.path = path;
    this.status = status;
    this.cause = cause;
  }
}

// 通信失敗・タイムアウト・HTTPエラー・壊れたJSONをすべて DataLoadError にして投げる。
// 呼び出し側は「データが0件」と「取得に失敗した」を区別して表示できる。
export async function loadJson(path, { timeoutMs = 20000, fetchImpl = globalThis.fetch } = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${path}${sep}v=${VERSION}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res;
    try {
      res = await fetchImpl(url, { signal: controller.signal });
    } catch (cause) {
      throw new DataLoadError(cause?.name === 'AbortError' ? 'timeout' : 'network', { path, cause });
    }
    if (!res.ok) throw new DataLoadError('status', { path, status: res.status });
    try {
      return await res.json();
    } catch (cause) {
      throw new DataLoadError(cause?.name === 'AbortError' ? 'timeout' : 'parse', { path, cause });
    }
  } finally {
    clearTimeout(timer);
  }
}
