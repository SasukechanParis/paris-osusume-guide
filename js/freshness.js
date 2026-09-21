// 「公式情報と照合が必要な項目」(data/freshness.json)の判定。DOMには触らない。
// 確認日を持つのは、公式資料で確かめた項目だけ。確認していない項目に今日の日付を入れることはない。

import { escapeHtml } from './html.js';

export const TOPIC_LABEL = {
  entry: '入国',
  transit: '交通',
  price: '価格',
  hours: '営業時間',
  emergency: '緊急',
  tax: '免税'
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

export function addDays(iso, days) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function formatJa(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

// files: { 'data/official-info.json': <parsed json> }。ref のある項目は、確認日と出典を参照先から読む(二重管理しない)
export function resolveItem(item, files = {}) {
  if (!item.ref) return { ...item, source: item.source ?? null, verified_on: item.verified_on ?? null };
  const file = files[item.ref.file];
  const card = file?.cards?.find((c) => c.id === item.ref.card);
  if (!card) return { ...item, verified_on: null, source: null, refMissing: true };
  const source = card.sources?.[0] ? { label: card.sources[0].label, url: card.sources[0].url } : null;
  return { ...item, verified_on: card.verified_on ?? file.verified_on ?? null, source, finding: item.finding ?? card.summary };
}

// state: 'current'(確認済みで期間内) / 'due'(再確認の時期) / 'unverified'(未確認)
export function itemState(resolved, { today, defaultDays = 120 } = {}) {
  if (!resolved.verified_on) return { state: 'unverified', verifiedOn: null, dueOn: null };
  const days = resolved.recheck_after_days ?? defaultDays;
  const dueOn = addDays(resolved.verified_on, days);
  return { state: today && today >= dueOn ? 'due' : 'current', verifiedOn: resolved.verified_on, dueOn };
}

export function auditItems(data, files, today) {
  return (data.items ?? []).map((item) => {
    const resolved = resolveItem(item, files);
    return { item: resolved, ...itemState(resolved, { today, defaultDays: data.default_recheck_days }) };
  });
}

// ページ内の注記の中身(HTML文字列)
export function renderBadge(model) {
  const lines = model.verified.map((v) => {
    const source = v.source ? ` <a class="ranking-source" href="${escapeHtml(v.source.url)}" target="_blank" rel="noopener">出典 ↗</a>` : '';
    const due = v.due ? ' 確認から時間がたっています。最新は公式でご確認ください。' : '';
    return `<p class="fresh-line is-verified">公式で確認(${escapeHtml(v.dateText)}): ${escapeHtml(v.short)}${due}${source}</p>`;
  });
  if (model.unverified.length) {
    lines.push(
      `<p class="fresh-line is-unverified">公式ページでは確認できていない記述: ${model.unverified.map(escapeHtml).join('、')}。最新は公式アプリ・公式ページでご確認ください。</p>`
    );
  }
  return lines.join('');
}

// 確認済みの項目は日付つきで、未確認の項目はまとめて1行にする
export function badgeModel(ids, data, files, today) {
  const audited = auditItems(data, files, today);
  const picked = ids.map((id) => audited.find((a) => a.item.id === id)).filter(Boolean);
  const verified = picked.filter((a) => a.state !== 'unverified');
  const unverified = picked.filter((a) => a.state === 'unverified');
  return {
    verified: verified.map((a) => ({
      id: a.item.id,
      short: a.item.short ?? a.item.label,
      dateText: formatJa(a.verifiedOn),
      due: a.state === 'due',
      source: a.item.source
    })),
    unverified: unverified.map((a) => a.item.short ?? a.item.label)
  };
}
