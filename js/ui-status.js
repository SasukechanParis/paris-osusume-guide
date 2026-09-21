// 読み込み中・失敗・0件を見分けて表示する共通部品。
// 「データがない」と「通信に失敗した」を混同しないため、必ずここを通す。

import { DataLoadError } from './data.js';

export function describeLoadError(err) {
  if (err instanceof DataLoadError) {
    switch (err.reason) {
      case 'network':
        return '通信できませんでした。電波の良い場所でもう一度お試しください。';
      case 'timeout':
        return '読み込みに時間がかかっています。通信状況を確認して、もう一度お試しください。';
      case 'status':
        return `データを読み込めませんでした(エラーコード ${err.status})。時間をおいてもう一度お試しください。`;
      case 'parse':
        return 'データの形式が正しくないため表示できません。';
    }
  }
  return '読み込み中に問題が起きました。もう一度お試しください。';
}

export function loadingHtml(text = '読み込み中…') {
  return `<div class="state-box is-loading" role="status" aria-live="polite"><span class="state-spinner" aria-hidden="true"></span>${text}</div>`;
}

export function errorHtml(message, retryLabel = 'もう一度読み込む') {
  return `<div class="state-box is-error" role="alert"><p class="state-message">${message}</p><button type="button" class="btn btn-outline state-retry">${retryLabel}</button></div>`;
}

export function emptyHtml(text) {
  return `<div class="state-box is-empty" role="status">${text}</div>`;
}

export function showLoading(el, text) {
  if (el) el.innerHTML = loadingHtml(text);
}

export function showError(el, err, onRetry = () => location.reload()) {
  if (!el) return;
  el.innerHTML = errorHtml(describeLoadError(err));
  el.querySelector('.state-retry')?.addEventListener('click', onRetry, { once: true });
}

export function showEmpty(el, text) {
  if (el) el.innerHTML = emptyHtml(text);
}
