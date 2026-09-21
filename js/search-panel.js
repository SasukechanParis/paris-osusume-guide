// 絞り込みパネル(基準地点・カテゴリ・推薦元・状態・日本食・エリア・確認済みの条件)。
// 骨組みは1回だけ作り、以後は押下状態(aria-pressed)などだけを更新する
// → 入力欄や、キーボード操作中のフォーカスが再描画で失われない。

import { FILTER_GROUPS, SOURCE_LABEL } from './places.js';
import { RADIUS_OPTIONS } from './search-core.js';
import { MAIN_SPOTS } from './spots.js';
import { arrondissementLabel } from './render.js';
import { escapeHtml } from './html.js';

const chip = (attrs, label) => `<button type="button" class="chip" ${attrs} aria-pressed="false">${escapeHtml(label)}</button>`;

export const STATUS_OPTIONS = [
  ['recommended', 'おすすめ'],
  ['curious', '気になる(未訪問)']
];

export function panelSkeleton({ arrondissements, factFilters }) {
  const facts = factFilters
    .map(
      (f) => `
    <fieldset class="filter-block">
      <legend>${escapeHtml(f.label)}<span class="filter-note">(確認できたお店のみ)</span></legend>
      <div class="chip-row">${f.options.map((o) => chip(`data-fact="${f.key}" data-value="${o.value}"`, `${o.label}(${o.count})`)).join('')}</div>
    </fieldset>`
    )
    .join('');
  return `
    <fieldset class="filter-block">
      <legend>どこの近く?</legend>
      <div class="chip-row" id="anchor-chips">
        ${chip('data-anchor="none"', '指定なし')}
        ${chip('data-anchor="gps"', '現在地')}
        <button type="button" class="chip" data-anchor="hotel" aria-pressed="false" hidden></button>
      </div>
      <label class="field-label" for="anchor-spot">主要地点から選ぶ</label>
      <select id="anchor-spot">
        <option value="">選んでください</option>
        ${MAIN_SPOTS.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('')}
      </select>
      <label class="field-label" for="anchor-address">ホテル名・住所で探す</label>
      <div class="nearby-row">
        <input id="anchor-address" class="nearby-input" type="text" placeholder="例: Hôtel de la Paix, 9e arrondissement">
        <button id="anchor-address-btn" class="btn btn-outline" type="button">検索</button>
      </div>
      <p id="anchor-status" class="section-note" role="status" aria-live="polite"></p>
      <div id="anchor-candidates" class="nearby-candidates"></div>
      <div id="anchor-save-wrap"></div>
      <div id="hotel-box" class="hotel-box"></div>
      <div id="radius-block" hidden>
        <p class="field-label">この範囲に限る(直線距離)</p>
        <div class="chip-row">
          ${RADIUS_OPTIONS.map((r) => chip(`data-radius="${r}"`, r >= 1000 ? `${r / 1000}km以内` : `${r}m以内`)).join('')}
          ${chip('data-radius="0"', '範囲を限らない')}
        </div>
      </div>
    </fieldset>
    <fieldset class="filter-block">
      <legend>カテゴリ</legend>
      <div class="chip-row">${FILTER_GROUPS.map((g) => chip(`data-cat="${g.id}"`, g.label)).join('')}</div>
    </fieldset>
    <fieldset class="filter-block">
      <legend>推薦元</legend>
      <div class="chip-row">${Object.entries(SOURCE_LABEL).map(([id, label]) => chip(`data-src="${id}"`, label)).join('')}</div>
    </fieldset>
    <fieldset class="filter-block">
      <legend>さすけの評価<span class="filter-note">(さすけのおすすめ・気になるのみが対象)</span></legend>
      <div class="chip-row">${STATUS_OPTIONS.map(([id, label]) => chip(`data-st="${id}"`, label)).join('')}${chip('data-jp="1"', '日本食')}</div>
    </fieldset>
    <fieldset class="filter-block">
      <legend>エリア</legend>
      <label class="visually-hidden" for="arr-select">エリア</label>
      <select id="arr-select">
        <option value="all">すべてのエリア</option>
        ${arrondissements.map((a) => `<option value="${a}">${escapeHtml(arrondissementLabel(a))}</option>`).join('')}
      </select>
    </fieldset>
    ${facts}
    <div class="filter-footer">
      <button id="panel-clear" type="button" class="btn btn-outline">条件をすべて解除</button>
      <button id="panel-done" type="button" class="btn">結果を見る</button>
    </div>`;
}

const setPressed = (root, selector, pressed) => {
  for (const el of root.querySelectorAll(selector)) el.setAttribute('aria-pressed', String(pressed(el)));
};

export function syncPanel(root, { state, anchor, hotel }) {
  setPressed(root, '[data-cat]', (el) => state.cats.includes(el.dataset.cat));
  setPressed(root, '[data-src]', (el) => state.sources.includes(el.dataset.src));
  setPressed(root, '[data-st]', (el) => state.statuses.includes(el.dataset.st));
  setPressed(root, '[data-jp]', () => state.japanese);
  setPressed(root, '[data-fact]', (el) => state.facts[el.dataset.fact] === el.dataset.value);
  setPressed(root, '[data-radius]', (el) => Number(el.dataset.radius) === (state.radius ?? 0));
  setPressed(root, '[data-anchor="none"]', () => !anchor);
  setPressed(root, '[data-anchor="gps"]', () => anchor?.kind === 'gps');
  setPressed(root, '[data-anchor="hotel"]', () => anchor?.kind === 'hotel');
  root.querySelector('#arr-select').value = state.arr;
  root.querySelector('#anchor-spot').value = anchor?.kind === 'spot' ? anchor.id : '';
  root.querySelector('#radius-block').hidden = !anchor;

  const hotelChip = root.querySelector('[data-anchor="hotel"]');
  hotelChip.hidden = !hotel;
  if (hotel) hotelChip.textContent = `宿泊先: ${hotel.name}`;
  const hotelBox = root.querySelector('#hotel-box');
  hotelBox.innerHTML = hotel
    ? `<p class="hotel-box-text">保存した宿泊先: <strong>${escapeHtml(hotel.name)}</strong>(${escapeHtml(hotel.savedAt)}に保存・この端末だけに保存)。位置は検索した時点のものです。宿泊先が変わったら「変更」してください。</p>
       <div class="card-actions"><button type="button" class="btn btn-outline" data-hotel="change">変更</button><button type="button" class="btn btn-outline" data-hotel="clear">保存を解除</button></div>`
    : '';
}
