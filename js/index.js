import { renderTrending, renderUpdatesList, splitTrending } from './render.js';
import { loadJson } from './data.js';
import { loadSection } from './page-init.js';
import { annotate } from './places.js';

// 「最近追加」と「今話題」は独立して読み込む。片方の通信が失敗しても、もう片方は表示する。
const updatesBox = document.getElementById('updates-box');
const trendingBox = document.getElementById('trending-list');
const trendingArchiveSection = document.getElementById('trending-archive');
const trendingArchiveBox = document.getElementById('trending-archive-list');

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
    const { current, archived } = splitTrending(trending);
    trendingBox.innerHTML = renderTrending(annotate(current, 'trending'));
    if (archived.length) {
      trendingArchiveBox.innerHTML = renderTrending(annotate(archived, 'trending'));
      trendingArchiveSection.hidden = false;
    }
  },
  { loadingText: '読み込み中…' }
);
