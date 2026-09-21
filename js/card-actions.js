// カードの説明文を3行に折りたたみ、あふれる場合だけ「続きを読む」を出す。
// 閉じたときは元のカードの位置へ戻す(長い説明を開いたまま下へ流れてしまわないように)。

const READY = 'clampReady';

function needsToggle(desc) {
  desc.classList.add('is-clamped');
  desc.classList.remove('is-open');
  return desc.scrollHeight > desc.clientHeight + 1;
}

function ensureToggle(desc) {
  let btn = desc.nextElementSibling?.classList.contains('desc-toggle') ? desc.nextElementSibling : null;
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'desc-toggle';
    desc.after(btn);
  }
  btn.hidden = false;
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = '続きを読む';
  return btn;
}

// 非表示のパネル(別タブなど)は計測できないため、表示されてから再度呼ぶ
export function enhanceCards(root = document) {
  for (const desc of root.querySelectorAll('.place-desc')) {
    if (desc.dataset[READY] || desc.offsetParent === null) continue;
    desc.dataset[READY] = '1';
    if (needsToggle(desc)) ensureToggle(desc);
    else desc.classList.remove('is-clamped');
  }
}

// フォント読み込み後・画面幅の変更後に折りたたみ判定をやり直す
export function refreshClamps(root = document) {
  for (const desc of root.querySelectorAll('.place-desc[data-clamp-ready]')) {
    if (desc.offsetParent === null || desc.classList.contains('is-open')) continue;
    const overflow = needsToggle(desc);
    const btn = desc.nextElementSibling?.classList.contains('desc-toggle') ? desc.nextElementSibling : null;
    if (overflow) ensureToggle(desc);
    else {
      desc.classList.remove('is-clamped');
      if (btn) btn.hidden = true;
    }
  }
}

// 検索結果などから「一覧ページで見る」で来たとき(#place-<uid>)、その店のカードへ移動して目立たせる。
// 別タブ(先輩カップルのおすすめ)の中にあれば、そのタブを開く
export function focusPlaceFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id.startsWith('place-')) return false;
  const card = document.getElementById(id);
  if (!card) return false;
  const hiddenPanel = card.closest('[hidden]');
  if (hiddenPanel?.id?.endsWith('-panel')) {
    document.querySelector(`#source-tabs [data-source="${hiddenPanel.id.replace(/-panel$/, '')}"]`)?.click();
  }
  card.scrollIntoView({ block: 'start' });
  card.classList.add('is-target');
  setTimeout(() => card.classList.remove('is-target'), 3500);
  return true;
}

// JSで描画されるセクション(旅の流れの公式情報カードなど)への #アンカー。
// ブラウザ標準のジャンプは描画前に終わってしまうため、描画後にもう一度移動する
export function scrollToHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: 'start' });
  return true;
}

export function onToggleClick(event) {
  const btn = event.target.closest?.('.desc-toggle');
  if (!btn) return;
  const desc = btn.previousElementSibling;
  if (!desc) return;
  const open = !desc.classList.contains('is-open');
  desc.classList.toggle('is-open', open);
  desc.classList.toggle('is-clamped', !open);
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? '閉じる' : '続きを読む';
  if (!open) desc.closest('.place-card')?.scrollIntoView({ block: 'nearest' });
}
