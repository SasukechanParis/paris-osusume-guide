// 旅の流れ(journey.html)。中身は data/journey.json(既存記事へのリンクとチェック項目)と
// data/official-info.json(公式情報カード。確認日・出典つき)。記事本文は複製しない。

import { runPage } from './page-init.js';
import { loadJson } from './data.js';
import { mountChecklists } from './checklist.js';
import { escapeHtml } from './html.js';
import { showLoading } from './ui-status.js';

const link = (l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`;

function itemHtml(item, officialIds) {
  const links = (item.links ?? []).map(link);
  for (const id of item.official ?? []) {
    if (officialIds.has(id)) links.push(`<a href="#official-${id}">公式情報を見る(${id === 'etias' ? 'ETIAS' : 'EES'})</a>`);
  }
  return `
    <li class="check-item">
      <label class="check-label"><input type="checkbox" data-check="${item.id}"><span>${escapeHtml(item.text)}</span></label>
      ${links.length ? `<div class="check-links">${links.join('')}</div>` : ''}
    </li>`;
}

export function officialCardHtml(card) {
  const points = card.points.map((p) => `<dt>${escapeHtml(p.label)}</dt><dd>${escapeHtml(p.text)}</dd>`).join('');
  const links = card.links
    .map((l) => `<a class="btn btn-outline" href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`)
    .join('');
  const sources = card.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(' / ');
  return `
    <article class="official-card" id="official-${card.id}">
      <p class="official-badge">公式情報(${escapeHtml(card.verified_on)}に確認)</p>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="official-summary">${escapeHtml(card.summary)}</p>
      <dl class="official-facts">
        <dt>何を確認する?</dt><dd>${escapeHtml(card.check)}</dd>
        <dt>どの旅行者向け?</dt><dd>${escapeHtml(card.who)}</dd>
        ${points}
      </dl>
      <div class="card-actions">${links}</div>
      <p class="official-meta">情報確認日: ${escapeHtml(card.verified_on)}(このサイトの表示日ではなく、下の出典を確認した日です)。出典: ${sources}</p>
      <p class="official-warning">制度の開始時期・費用・条件は変わることがあります。出発前に、必ず公式ページで最新の状況を確認してください。</p>
    </article>`;
}

function stageHtml(stage, official) {
  const officialIds = new Set(official.cards.map((c) => c.id));
  const cards = stage.items.flatMap((i) => i.official ?? []).filter((id, n, all) => all.indexOf(id) === n && officialIds.has(id));
  return `
    <section class="stage" id="stage-${stage.id}" aria-labelledby="stage-${stage.id}-h">
      <div class="section-head"><div class="flag-dot"><i></i><i></i><i></i></div><h2 id="stage-${stage.id}-h">${escapeHtml(stage.title)}</h2><span class="stage-progress" data-checklist-count="journey-${stage.id}" aria-label="確認済みの数"></span></div>
      <p class="section-note">${escapeHtml(stage.lead)}</p>
      <ul class="checklist" data-checklist="journey-${stage.id}">${stage.items.map((i) => itemHtml(i, officialIds)).join('')}</ul>
      <div class="checklist-actions no-print"><button type="button" class="btn btn-outline" data-checklist-reset="journey-${stage.id}">この段階のチェックをリセット</button></div>
      ${cards.map((id) => officialCardHtml(official.cards.find((c) => c.id === id))).join('')}
    </section>`;
}

runPage(async () => {
  const root = document.getElementById('journey-root');
  showLoading(root, '読み込み中…');
  const [journey, official] = await Promise.all([loadJson('data/journey.json'), loadJson('data/official-info.json')]);
  root.innerHTML = journey.stages.map((s) => stageHtml(s, official)).join('');
  mountChecklists(document);
});
