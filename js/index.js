import { renderTrending, renderUpdatesList } from './render.js';
import { loadJson } from './data.js';
import { loadSection } from './page-init.js';
import { annotate } from './places.js';

// 「最近追加」と「今話題」は独立して読み込む。片方の通信が失敗しても、もう片方は表示する。
const updatesBox = document.getElementById('updates-box');
const trendingBox = document.getElementById('trending-list');

loadSection(
  updatesBox,
  () => loadJson('data/updates.json'),
  (updates) => {
    updatesBox.innerHTML = `<ul class="updates-list">${renderUpdatesList(updates)}</ul>`;
  },
  { loadingText: '読み込み中…' }
);

loadSection(
  trendingBox,
  () => loadJson('data/trending.json'),
  (trending) => {
    trendingBox.innerHTML = renderTrending(annotate(trending, 'trending'));
  },
  { loadingText: '読み込み中…' }
);
