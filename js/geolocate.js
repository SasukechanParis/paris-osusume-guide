// 現在地の取得(利用者が「現在地」ボタンを押したときだけ呼ぶ)。
// 有限の待ち時間を持ち、拒否・時間切れ・非対応を区別して次の行動を案内する。

export class GeoError extends Error {
  constructor(kind) {
    super(kind);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

const MESSAGES = {
  unsupported: 'この端末・ブラウザでは現在地を取得できません。主要地点か、住所・ホテル名から探してください。',
  denied: '現在地の利用が許可されていません。設定で許可するか、主要地点や住所・ホテル名から探してください。',
  timeout: '現在地を取得できませんでした(時間切れ)。電波の良い場所でもう一度試すか、主要地点・住所から探してください。',
  unavailable: '現在地を取得できませんでした。主要地点や住所・ホテル名から探してください。'
};

export function geoErrorMessage(kind) {
  return MESSAGES[kind] ?? MESSAGES.unavailable;
}

export function requestPosition({
  geolocation = globalThis.navigator?.geolocation,
  timeoutMs = 12000,
  watchdogMs = timeoutMs + 8000
} = {}) {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new GeoError('unsupported'));
      return;
    }
    let settled = false;
    let timer = null;
    const finish = (settle, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle(value);
    };
    // 許可ダイアログの放置などでコールバックが戻らない端末向けの保険
    timer = setTimeout(() => finish(reject, new GeoError('timeout')), watchdogMs);
    geolocation.getCurrentPosition(
      (pos) =>
        finish(resolve, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null
        }),
      (err) => finish(reject, new GeoError(err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'unavailable')),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
