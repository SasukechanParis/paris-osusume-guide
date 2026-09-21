// 起点の選択(撮影を終えた場所・今いる場所)。現在地(押したときだけ許可を求める)・保存したホテル・主要地点・
// ホテル名/住所(明示的な検索。複数候補は選択)から選ぶ。位置はこのページ内だけで使い、URLにも保存にも入れない。

import { MAIN_SPOTS, findSpot } from './spots.js';
import { requestPosition, geoErrorMessage } from './geolocate.js';
import { createGeoSearch, shortLabel } from './geo-search.js';
import { escapeHtml } from './html.js';

// onAnchor({ kind: 'gps'|'spot'|'hotel'|'address', lat, lng, label, id? })
export function mountAnchorPicker({ container, label, hotel, onAnchor }) {
  container.innerHTML = `
    <fieldset class="anchor-picker">
      <legend>${escapeHtml(label)}</legend>
      <div class="chip-row" id="picker-chips">
        <button type="button" class="chip" data-pick="gps" aria-pressed="false">現在地</button>
        ${hotel ? `<button type="button" class="chip" data-pick="hotel" aria-pressed="false">宿泊先: ${escapeHtml(hotel.name)}</button>` : ''}
      </div>
      <label class="field-label" for="picker-spot">主要地点から選ぶ</label>
      <select id="picker-spot">
        <option value="">選んでください</option>
        ${MAIN_SPOTS.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('')}
      </select>
      <label class="field-label" for="picker-address">ホテル名・住所で探す</label>
      <div class="nearby-row">
        <input id="picker-address" class="nearby-input" type="text" placeholder="例: Hôtel de la Paix, 9e arrondissement">
        <button id="picker-address-btn" class="btn btn-outline" type="button">検索</button>
      </div>
      <p id="picker-status" class="section-note" role="status" aria-live="polite"></p>
      <div id="picker-candidates" class="nearby-candidates"></div>
    </fieldset>`;

  const $ = (id) => container.querySelector(`#${id}`);
  const status = $('picker-status');

  function setActive(kind, id = null) {
    for (const chip of container.querySelectorAll('[data-pick]')) chip.setAttribute('aria-pressed', String(chip.dataset.pick === kind));
    if (kind !== 'spot') $('picker-spot').value = '';
    else $('picker-spot').value = id ?? '';
  }

  container.querySelector('#picker-chips').addEventListener('click', async (event) => {
    const chip = event.target.closest('[data-pick]');
    if (!chip) return;
    if (chip.dataset.pick === 'hotel' && hotel) {
      setActive('hotel');
      status.textContent = '';
      onAnchor({ kind: 'hotel', lat: hotel.lat, lng: hotel.lng, label: hotel.name });
      return;
    }
    if (chip.dataset.pick === 'gps') {
      status.textContent = '現在地を取得しています…(許可を求められたら「許可」を選んでください)';
      try {
        const pos = await requestPosition();
        status.textContent = '';
        setActive('gps');
        onAnchor({ kind: 'gps', lat: pos.lat, lng: pos.lng, label: '現在地' });
      } catch (err) {
        status.textContent = geoErrorMessage(err?.kind);
      }
    }
  });

  $('picker-spot').addEventListener('change', (event) => {
    const spot = findSpot(event.target.value);
    if (!spot) return;
    setActive('spot', spot.id);
    status.textContent = '';
    onAnchor({ kind: 'spot', id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.label });
  });

  createGeoSearch({
    input: $('picker-address'),
    button: $('picker-address-btn'),
    statusEl: status,
    candidatesEl: $('picker-candidates'),
    onResolve: (point) => {
      setActive('address');
      onAnchor({ kind: 'address', lat: point.lat, lng: point.lng, label: point.label });
    }
  });

  return {
    // URLの near=spot:xxx / hotel から起点を復元したとき、選択表示だけ合わせる
    show(anchor) {
      if (!anchor) return setActive(null);
      setActive(anchor.kind, anchor.id);
    },
    labelOf: (anchor) => (anchor.kind === 'gps' ? '現在地' : anchor.kind === 'address' ? `「${shortLabel(anchor.label)}」付近` : anchor.label)
  };
}
