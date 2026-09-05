import { renderContestDetail, renderYearPanel, buildShopWinCounts } from './render.js';
import { loadJson } from './data.js';

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  const contest = contests.find((c) => c.id === id);
  if (!contest) {
    document.getElementById('contest-detail').textContent = 'コンクールが見つかりませんでした。';
    return;
  }

  document.getElementById('contest-title').textContent = contest.name;

  const { meta, tabs, panel } = renderContestDetail(contest, results, shops);
  document.getElementById('contest-meta').innerHTML = meta;
  document.getElementById('year-tabs').innerHTML = tabs;
  document.getElementById('year-panel').innerHTML = panel;

  const contestResults = results.filter((r) => r.contest_id === contest.id);
  const winCounts = buildShopWinCounts(results);

  document.getElementById('year-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    const year = Number(btn.dataset.year);
    const result = contestResults.find((r) => r.year === year);
    if (!result) return;

    document.querySelectorAll('#year-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('year-panel').innerHTML = renderYearPanel(result, shops, winCounts);
  });
}

init();
