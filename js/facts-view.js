// 確認済みの条件(data/place-facts.json)の表示。値のある項目だけを、確認日・根拠つきで見せる。
// 共通形式: 何がおすすめ(pick) / どんな人向け(for) / 予算 / 予約 / 注意点(caution)。予算は区分・食事の区分・1人か2人か・確認日を持つ。
// 値がない=未確認は、何も出さない(「安い」「予約不要」などにはしない)。

import { FACT_FILTERS } from './fact-schema.js';
import { escapeHtml } from './html.js';

const MEAL_TEXT = { lunch: 'ランチ', dinner: 'ディナー', any: '食事' };
const PER_TEXT = { person: '1人あたり', couple: '2人あたり' };
const BULK_TEXT = { light: '軽い', compact: 'かさばらない', bulky: 'かさばる' };

export function factsHtml(place) {
  const facts = place.facts;
  if (!facts) return '';
  const chips = [];
  for (const filter of FACT_FILTERS) {
    const value = facts[filter.key];
    if (value === undefined || value === null || filter.key === 'budget_band') continue; // 予算は下でまとめて出す
    const label = filter.labels[String(value)];
    if (label) chips.push(`<span class="fact-chip">${escapeHtml(filter.label)}: ${escapeHtml(label)}</span>`);
  }
  if (facts.budget?.band) {
    const b = facts.budget;
    const detail = [MEAL_TEXT[b.meal], PER_TEXT[b.per], b.verified_on ? `${b.verified_on}確認` : null].filter(Boolean).join('・');
    chips.unshift(`<span class="fact-chip">予算: ${escapeHtml(b.band)}${detail ? `(${escapeHtml(detail)})` : ''}</span>`);
  }
  if (typeof facts.price_eur === 'number') chips.push(`<span class="fact-chip">価格の目安: 約${facts.price_eur}€</span>`);
  if (facts.bulk && BULK_TEXT[facts.bulk]) chips.push(`<span class="fact-chip">かさばり: ${BULK_TEXT[facts.bulk]}</span>`);
  const lines = [
    facts.pick ? `<p class="fact-line"><strong>おすすめ:</strong> ${escapeHtml(facts.pick)}</p>` : '',
    facts.for ? `<p class="fact-line"><strong>こんな人に:</strong> ${escapeHtml(facts.for)}</p>` : '',
    facts.caution ? `<p class="fact-line fact-caution"><strong>注意:</strong> ${escapeHtml(facts.caution)}</p>` : ''
  ].join('');
  const verified = facts.verified_on
    ? `<span class="fact-verified">${escapeHtml(facts.verified_on)}確認${facts.source ? `・出典: ${escapeHtml(facts.source)}` : ''}</span>`
    : '';
  if (chips.length === 0 && !lines) return '';
  return `${chips.length || verified ? `<p class="fact-row">${chips.join('')}${verified}</p>` : ''}${lines}`;
}
