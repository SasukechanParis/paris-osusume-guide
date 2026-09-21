// 住所・ホテル名の検索フォーム(近く検索・地図・検索ページで共通)。
// - 実行は「検索」ボタンかEnterのみ(入力のたびに外部サービスへ送らない)。日本語入力の変換確定のEnterでは実行しない
// - 実行中の連打・古いリクエスト結果による上書きを防ぐ。Nominatimの利用ポリシー(1秒に1回)を守る
// - 候補が複数あるときは、利用者に選んでもらう

import { geocodeAddress } from './geocode.js';
import { escapeHtml } from './html.js';

const MIN_INTERVAL_MS = 1100;
const CANDIDATE_LIMIT = 5;
// パリとその周辺(イル・ド・フランス)を優先して候補を並べる
const PARIS_VIEWBOX = '1.4,49.3,3.6,48.1';

export function shortLabel(label, parts = 3) {
  return String(label ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, parts)
    .join(', ');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createGeoSearch({ input, button, statusEl, candidatesEl, onResolve, geocode = geocodeAddress }) {
  let seq = 0;
  let busy = false;
  let lastRequestAt = 0;

  input.setAttribute('enterkeyhint', 'search');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('spellcheck', 'false');
  if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', '住所またはホテル名');

  function setBusy(value) {
    busy = value;
    button.disabled = value;
    input.setAttribute('aria-busy', String(value));
  }

  function clearCandidates() {
    if (candidatesEl) candidatesEl.innerHTML = '';
  }

  function pick(point) {
    clearCandidates();
    statusEl.textContent = '';
    onResolve(point);
  }

  function showCandidates(matches) {
    if (!candidatesEl) {
      pick(matches[0]);
      return;
    }
    candidatesEl.innerHTML = `
      <p class="candidates-title">候補が${matches.length}件見つかりました。近い場所を選んでください</p>
      <ul class="candidates-list">
        ${matches
          .map(
            (m, i) =>
              `<li><button type="button" class="candidate-btn" data-index="${i}">${escapeHtml(shortLabel(m.label))}</button></li>`
          )
          .join('')}
      </ul>`;
    candidatesEl.onclick = (event) => {
      const btn = event.target.closest('.candidate-btn');
      if (btn) pick(matches[Number(btn.dataset.index)]);
    };
    statusEl.textContent = '';
    candidatesEl.querySelector('.candidate-btn')?.focus();
  }

  async function run() {
    const query = input.value.trim();
    if (!query) {
      statusEl.textContent = '住所やホテル名を入力してください。';
      input.focus();
      return;
    }
    if (busy) return;
    const mySeq = ++seq;
    setBusy(true);
    clearCandidates();
    statusEl.textContent = '検索しています…(入力した文字はOpenStreetMapの検索サービスに送られます)';
    try {
      const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      const matches = await geocode(query, { limit: CANDIDATE_LIMIT, countrycodes: 'fr', viewbox: PARIS_VIEWBOX });
      if (mySeq !== seq) return;
      if (matches.length === 0) {
        statusEl.textContent = '見つかりませんでした。表記を変えるか、通り名+郵便番号(例: 11 Rue Volney 75002)で試してください。';
      } else if (matches.length === 1) {
        pick(matches[0]);
      } else {
        showCandidates(matches);
      }
    } catch (err) {
      if (mySeq !== seq) return;
      console.error(err);
      statusEl.textContent = '検索できませんでした。通信状況を確認して、もう一度お試しください。上の主要地点からも探せます。';
    } finally {
      if (mySeq === seq) setBusy(false);
    }
  }

  button.addEventListener('click', run);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    run();
  });

  return { run, cancel: () => { seq += 1; setBusy(false); clearCandidates(); } };
}
