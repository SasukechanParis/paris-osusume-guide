// [data-fresh="id id …"] の要素に、その記述の「公式での確認状況」を書き足す。
// 確認できたものは日付と出典つきで、確認できていないものは「確認できていない」と正直に書く。
// 読み込みに失敗しても、ページの本文はそのまま読める(何も足さない)。
// 文言と判定は js/freshness.js(DOMに触らない)。ここはページに書き込むだけ。

import { loadJson } from './data.js';
import { badgeModel, renderBadge } from './freshness.js';

function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function run() {
  const targets = [...document.querySelectorAll('[data-fresh]')];
  if (!targets.length) return;
  let data;
  let files;
  try {
    const [freshness, official] = await Promise.all([loadJson('data/freshness.json'), loadJson('data/official-info.json')]);
    data = freshness;
    files = { 'data/official-info.json': official };
  } catch {
    return;
  }
  const today = todayIso();
  for (const el of targets) {
    const ids = (el.dataset.fresh ?? '').split(/\s+/).filter(Boolean);
    const model = badgeModel(ids, data, files, today);
    if (model.verified.length || model.unverified.length) el.innerHTML = renderBadge(model);
  }
}

run();
