// 検索結果のカード(写真なしで完成する形)。純粋関数: 文字列を返すだけ。
// 名前・住所・説明はHTMLに埋め込む前に必ずエスケープする(名前に「&」を含む店がある)。

import { arrondissementLabel, renderCardActions } from './render.js';
import { CATEGORY_STYLE } from './category-style.js';
import { SOURCE_LABEL, placeCategories } from './places.js';
import { formatDistance } from './distance.js';
import { escapeHtml } from './html.js';
import { factsHtml } from './facts-view.js';

export { factsHtml };

const STATUS_LABEL = { recommended: 'おすすめ', curious: '気になる(未訪問)' };

function badges(place) {
  const out = [];
  for (const category of placeCategories(place)) {
    const label = CATEGORY_STYLE[category]?.label;
    if (label) out.push(`<span class="status-badge status-badge-genre">${escapeHtml(label)}</span>`);
  }
  if (place.status) out.push(`<span class="status-badge status-badge-${place.status}">${STATUS_LABEL[place.status]}</span>`);
  out.push(`<span class="status-badge status-badge-source">${escapeHtml(SOURCE_LABEL[place.source])}</span>`);
  if (place.group === 'japanese') out.push('<span class="status-badge status-badge-genre">日本食</span>');
  if (place.stars) out.push(`<span class="status-badge status-badge-michelin">${'★'.repeat(place.stars)}</span>`);
  return out.join('');
}

// options: { distanceKm, origin, selected, actionsExtra }  actionsExtra は保存ボタンなど呼び出し側の追加要素
// reasons: 「合う理由」(目的別の結果で、データにある事実だけ)。mapButton: 検索ページ内の地図で位置を見るボタン
export function renderPlaceCard(place, { distanceKm = null, origin = null, selected = false, actionsExtra = '', save = true, reasons = null, mapButton = true } = {}) {
  const meta = [place.arrondissement ? arrondissementLabel(place.arrondissement) : null, place.address].filter(Boolean).map(escapeHtml).join(' ・ ');
  const detail = `<a class="ranking-source detail-link" href="${place.href}">一覧ページで見る</a>`;
  const onMap =
    mapButton && place.lat !== null ? '<button type="button" class="btn btn-outline" data-action="show-on-map">地図で位置を見る</button>' : '';
  const reasonRow = reasons?.length
    ? `<p class="reason-row"><span class="reason-label">合う理由</span>${reasons.map((r) => `<span class="reason-chip">${escapeHtml(r)}</span>`).join('')}</p>`
    : '';
  return `
    <article class="trending-card place-card search-card${selected ? ' is-selected' : ''}" data-uid="${place.uid}"${selected ? ' aria-current="true"' : ''}>
      <p class="trending-name">${escapeHtml(place.name)}</p>
      <p class="nearby-card-badges">${badges(place)}</p>
      ${reasonRow}
      ${meta ? `<p class="trending-meta">${meta}</p>` : ''}
      ${place.hours ? `<p class="trending-meta">時間: ${escapeHtml(place.hours)}</p>` : ''}
      ${place.description ? `<p class="trending-desc place-desc">${escapeHtml(place.description)}</p>` : ''}
      ${factsHtml(place)}
      ${distanceKm !== null ? `<p class="nearby-distance"><span class="nearby-distance-value">${formatDistance(distanceKm)}</span><span class="nearby-distance-note">直線距離</span></p>` : ''}
      ${renderCardActions(place, { origin, save, extra: `${actionsExtra}${onMap}${detail}` })}
    </article>`;
}

export function renderArticleCard(article) {
  const href = `${article.page}${article.anchor ? `#${article.anchor}` : ''}`;
  return `
    <a class="article-card" href="${href}">
      <span class="article-card-section">${escapeHtml(article.section || '記事')}</span>
      <span class="article-card-title">${escapeHtml(article.title)}</span>
      <span class="article-card-summary">${escapeHtml(article.summary ?? '')}</span>
    </a>`;
}
