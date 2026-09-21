// フランス語カード(french.html)。日本語の用件を選ぶ → フランス語を表示 → 「相手に見せる」で大きく表示。
// 表示・コピー・お気に入りが基本。読み上げは、対応する端末でだけ出す任意機能で、自動再生しない。
// 音声が使えなくても、文字だけで完結する。

import { runPage } from './page-init.js';
import { loadJson } from './data.js';
import { storage } from './storage.js';
import { escapeHtml } from './html.js';
import { showToast } from './toast.js';
import { showLoading } from './ui-status.js';
import { track } from './analytics.js';

const FAV_KEY = 'french-favs';
const $ = (id) => document.getElementById(id);

let data = null;
let group = 'all'; // 'all' | 'fav' | グループID
let favs = [];
let opener = null;
let voice = null;

const loadFavs = (ids) => {
  const stored = storage().get(FAV_KEY, []);
  return Array.isArray(stored) ? stored.filter((id) => ids.has(id)) : [];
};

function cardHtml(card) {
  const fav = favs.includes(card.id);
  return `
    <article class="french-card" data-id="${card.id}">
      <p class="french-ja">${escapeHtml(card.ja)}</p>
      <p class="french-fr" lang="fr">${escapeHtml(card.fr)}</p>
      ${card.reading ? `<p class="french-reading">読み方(旅行ガイドより): ${escapeHtml(card.reading)}</p>` : ''}
      <div class="card-actions">
        <button type="button" class="btn" data-french="show">相手に見せる</button>
        <button type="button" class="btn btn-outline" data-french="copy">コピー</button>
        <button type="button" class="btn btn-outline fav-btn" data-french="fav" aria-pressed="${fav}" aria-label="「${escapeHtml(card.ja)}」をお気に入り${fav ? 'から外す' : 'に追加'}">${fav ? '★ お気に入り済み' : '☆ お気に入り'}</button>
        <button type="button" class="btn btn-outline" data-french="speak" ${voice ? '' : 'hidden'}>音声で聞く</button>
      </div>
    </article>`;
}

function renderGroups() {
  const chip = (id, label) => `<button type="button" class="chip${group === id ? ' is-active' : ''}" data-group="${id}" aria-pressed="${group === id}">${escapeHtml(label)}</button>`;
  $('french-groups').innerHTML = [
    chip('all', 'すべて'),
    chip('fav', `★ お気に入り(${favs.length})`),
    ...data.groups.map((g) => chip(g.id, g.label))
  ].join('');
}

function render() {
  renderGroups();
  const cards = data.cards.filter((c) => (group === 'all' ? true : group === 'fav' ? favs.includes(c.id) : c.group === group));
  const list = $('french-list');
  if (cards.length === 0) {
    list.innerHTML = '<div class="state-box is-empty" role="status">お気に入りはまだありません。カードの「☆ お気に入り」を押すと、ここに集まります。</div>';
    return;
  }
  // 「すべて」のときは場面ごとの見出しを付ける
  if (group === 'all') {
    list.innerHTML = data.groups
      .map((g) => {
        const inGroup = cards.filter((c) => c.group === g.id);
        return inGroup.length ? `<h2 class="subsection-title">${escapeHtml(g.label)}</h2>${inGroup.map(cardHtml).join('')}` : '';
      })
      .join('');
  } else list.innerHTML = cards.map(cardHtml).join('');
}

// ---------- 相手に見せる(全画面) ----------
function setBackgroundInert(inert) {
  for (const el of document.querySelectorAll('#french-page, .tab-bar')) {
    if (inert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }
}

function openShow(card, trigger) {
  opener = trigger;
  $('show-fr').textContent = card.fr;
  $('show-ja').textContent = card.ja;
  $('show-overlay').dataset.id = card.id;
  $('show-overlay').hidden = false;
  setBackgroundInert(true);
  $('show-close').focus();
  track('french', 'show');
}

function closeShow() {
  $('show-overlay').hidden = true;
  setBackgroundInert(false);
  opener?.focus(); // 押したボタンへフォーカスを戻す
  opener = null;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('コピーしました');
  } catch {
    showToast('自動でコピーできませんでした。文字を長押しして、選択してコピーしてください。');
  }
}

// ---------- 読み上げ(任意) ----------
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr')) ?? null;
}

function speak(text) {
  if (!voice) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function persistFavs() {
  const result = storage().set(FAV_KEY, favs);
  if (!result.ok) showToast('お気に入りをこの端末に保存できませんでした。このページを閉じると消えます。');
}

function bindEvents() {
  $('french-groups').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-group]');
    if (!chip) return;
    group = chip.dataset.group;
    render();
  });
  $('french-list').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-french]');
    if (!btn) return;
    const card = data.cards.find((c) => c.id === btn.closest('[data-id]').dataset.id);
    if (btn.dataset.french === 'show') openShow(card, btn);
    else if (btn.dataset.french === 'copy') copy(card.fr);
    else if (btn.dataset.french === 'speak') speak(card.fr);
    else if (btn.dataset.french === 'fav') {
      favs = favs.includes(card.id) ? favs.filter((id) => id !== card.id) : [...favs, card.id];
      persistFavs();
      const scrollY = window.scrollY;
      render();
      window.scrollTo(0, scrollY);
      $('french-list').querySelector(`[data-id="${card.id}"] [data-french="fav"]`)?.focus();
    }
  });
  $('show-close').addEventListener('click', closeShow);
  $('show-close-2').addEventListener('click', closeShow);
  $('show-copy').addEventListener('click', () => copy($('show-fr').textContent));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('show-overlay').hidden) closeShow();
  });
  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      pickVoice();
      if (voice) render();
    });
  }
}

runPage(async () => {
  showLoading($('french-list'), '読み込み中…');
  data = await loadJson('data/french-cards.json');
  favs = loadFavs(new Set(data.cards.map((c) => c.id)));
  pickVoice();
  bindEvents();
  render();
});
