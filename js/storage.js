// 端末内保存の共通部品(保存リスト・ホテル・チェックリストなど)。
// localStorage が使えない(プライベートモード・容量不足・ブロック)場合でも例外を出さず、
// 「保存できなかった」ことを呼び出し側に伝え、そのセッション中はメモリ上で動かす。
// キーはサイト専用の接頭辞+データバージョン付き。中身の形式を変えるときは VERSION を上げる。

export const STORAGE_PREFIX = 'paris-osusume-guide:';
export const STORAGE_VERSION = 'v1';

function defaultBackend() {
  try {
    const ls = globalThis.localStorage;
    const probe = `${STORAGE_PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function createStorage(backend = defaultBackend()) {
  const memory = new Map();
  const fullKey = (name) => `${STORAGE_PREFIX}${STORAGE_VERSION}:${name}`;

  return {
    // 端末に永続保存できる状態か(falseならこのページを閉じると消える)
    persistent: backend !== null,

    // 壊れた保存データ・存在しないキーは fallback を返す(閲覧を妨げない)
    get(name, fallback = null) {
      const key = fullKey(name);
      try {
        // 保存に失敗して(容量不足など)メモリに退避した値は、端末側の古い値より新しい
        const raw = memory.has(key) ? memory.get(key) : backend?.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    // 戻り値: { ok: true } | { ok: false, reason: 'quota' | 'unavailable' }
    set(name, value) {
      const key = fullKey(name);
      const raw = JSON.stringify(value);
      if (!backend) {
        memory.set(key, raw);
        return { ok: false, reason: 'unavailable' };
      }
      try {
        backend.setItem(key, raw);
        memory.delete(key);
        return { ok: true };
      } catch (err) {
        memory.set(key, raw);
        const quota = err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
        return { ok: false, reason: quota ? 'quota' : 'unavailable' };
      }
    },

    remove(name) {
      const key = fullKey(name);
      memory.delete(key);
      try {
        backend?.removeItem(key);
      } catch {
        // 消せなくても閲覧は続けられる
      }
    },

    // このサイトが保存しているキー名(接頭辞を除いた名前)。設定画面の「保存データ一覧・全消去」用
    names() {
      const prefix = `${STORAGE_PREFIX}${STORAGE_VERSION}:`;
      const found = new Set([...memory.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)));
      try {
        if (backend) {
          for (let i = 0; i < backend.length; i += 1) {
            const k = backend.key(i);
            if (k && k.startsWith(prefix)) found.add(k.slice(prefix.length));
          }
        }
      } catch {
        // 列挙できなくてもよい
      }
      return [...found].sort();
    }
  };
}

let shared = null;
export function storage() {
  shared ??= createStorage();
  return shared;
}
