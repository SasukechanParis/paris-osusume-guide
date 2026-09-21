// ホテルの比較(hotels.html)。カードの「比較に追加」で最大3件を選び、項目ごとに縦に並べて比べる。
// 確認できた項目だけを載せ、未確認は「未確認」と出す(js/compare-core.js)。選択は端末内(セッション)に覚える。

import { buildComparison, toggleCompare, MAX_COMPARE, COMPARE_DISCLAIMER } from './compare-core.js';
import { loadOptional } from './places-loader.js';
import { escapeHtml } from './html.js';
import { showToast } from './toast.js';
import { rememberUi, recallUi } from './state-restore.js';

export function renderCompareButton(uid) {
  return `<button type="button" class="btn btn-outline compare-btn" data-compare="${uid}" aria-pressed="false">比較に追加</button>`;
}

function panelHtml(comparison) {
  const rows = comparison.rows
    .map(
      (row) => `
      <section class="compare-row" aria-labelledby="cmp-${row.id}">
        <h3 class="compare-attr" id="cmp-${row.id}">${escapeHtml(row.label)}</h3>
        <dl class="compare-cells">
          ${row.cells.map((c) => `<div class="compare-cell"><dt>${escapeHtml(c.name)}</dt><dd>${escapeHtml(c.text)}</dd></div>`).join('')}
        </dl>
      </section>`
    )
    .join('');
  return `
    <div class="compare-head">
      <h2 class="compare-title" id="compare-title" tabindex="-1">ホテルの比較(${comparison.hotels.length}件)</h2>
      <button type="button" class="btn btn-outline" data-compare-close>閉じる</button>
    </div>
    ${rows}
    ${comparison.hasFacts ? '' : '<p class="filter-note">支度スペース・鏡・自然光・荷物預かり・エレベーターなど、確認できた項目はまだ掲載していません。確認でき次第、ここに追加します(未確認を「なし」とは扱いません)。</p>'}
    <p class="filter-note compare-disclaimer">${escapeHtml(COMPARE_DISCLAIMER)}</p>`;
}

export async function initHotelCompare(hotels) {
  const slot = document.getElementById('compare-slot');
  if (!slot) return;
  const factsFile = await loadOptional('data/hotel-facts.json', { facts: {} });
  const facts = factsFile.facts ?? {};
  const byUid = new Map(hotels.map((h) => [h.uid, h]));

  let selected = (recallUi('compare') ?? []).filter((uid) => byUid.has(uid)).slice(0, MAX_COMPARE);

  const tray = document.createElement('div');
  tray.className = 'compare-tray';
  tray.hidden = true;
  tray.innerHTML = `
    <span class="compare-count" role="status" aria-live="polite"></span>
    <button type="button" class="btn" data-compare-open>比較する</button>
    <button type="button" class="btn btn-outline" data-compare-clear>クリア</button>`;
  document.body.append(tray);

  function paint() {
    for (const button of document.querySelectorAll('[data-compare]')) {
      const on = selected.includes(button.dataset.compare);
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? '比較から外す' : '比較に追加';
    }
    tray.hidden = selected.length === 0;
    document.body.classList.toggle('has-compare-tray', selected.length > 0);
    tray.querySelector('.compare-count').textContent = `比較: ${selected.length}/${MAX_COMPARE}件`;
    tray.querySelector('[data-compare-open]').disabled = selected.length < 2;
    tray.querySelector('[data-compare-open]').title = selected.length < 2 ? '2件以上選ぶと比べられます' : '';
    rememberUi('compare', selected);
  }

  function openPanel() {
    const comparison = buildComparison(selected.map((uid) => byUid.get(uid)), facts);
    slot.innerHTML = `<section class="compare-panel" aria-labelledby="compare-title">${panelHtml(comparison)}</section>`;
    slot.hidden = false;
    slot.querySelector('#compare-title').focus();
    slot.scrollIntoView({ block: 'start' });
  }

  function closePanel() {
    slot.hidden = true;
    slot.innerHTML = '';
    tray.querySelector('[data-compare-open]').focus();
  }

  document.addEventListener('click', (event) => {
    const add = event.target.closest('[data-compare]');
    if (add) {
      const result = toggleCompare(selected, add.dataset.compare);
      if (result.full) showToast(`比較できるのは${MAX_COMPARE}件までです。どれかを外してください。`);
      selected = result.selected;
      paint();
      if (!slot.hidden) openPanel();
      return;
    }
    if (event.target.closest('[data-compare-open]')) openPanel();
    else if (event.target.closest('[data-compare-close]')) closePanel();
    else if (event.target.closest('[data-compare-clear]')) {
      selected = [];
      paint();
      if (!slot.hidden) closePanel();
    }
  });
  slot.hidden = true;
  paint();
}
