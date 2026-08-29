import { renderProgramList, renderRankingGroups } from './render.js';

async function loadJson(path) {
  const res = await fetch(path);
  return res.json();
}

async function init() {
  const [contests, results, shops] = await Promise.all([
    loadJson('data/contests.json'),
    loadJson('data/results.json'),
    loadJson('data/shops.json')
  ]);

  document.getElementById('program-list').innerHTML = renderProgramList(contests);
  document.getElementById('ranking-groups').innerHTML = renderRankingGroups(results, shops, contests);
}

init();
