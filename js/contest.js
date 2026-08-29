import { renderContestDetail } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

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
  document.getElementById('contest-detail').innerHTML = renderContestDetail(contest, results, shops);
}

init();
