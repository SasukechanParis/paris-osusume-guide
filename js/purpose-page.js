// 目的から探す(purpose.html)。目的(撮影後の食事・雨の日・休憩・日本食・お土産)を選ぶと、
// 既存データから条件に合う候補を少数、理由つきで出す。起点(撮影を終えた場所など)は利用者が選ぶ。
// 位置(現在地・住所・ホテル座標)はURLにも計測にも入れない。共有してよい起点(主要地点・保存ホテルの指定)だけURLで再現する。

import { runPage } from './page-init.js';
import { loadJson } from './data.js';
import { loadPlaceData } from './places-loader.js';
import { buildAliasIndex } from './search-core.js';
import { GOAL_IDS, runGoal, searchLinkFor } from './purpose-core.js';
import { coursesForGoal, resolveCourse, legLinks } from './courses.js';
import { mountAnchorPicker } from './anchor-picker.js';
import { renderPlaceCard } from './search-cards.js';
import { findSpot } from './spots.js';
import { storage } from './storage.js';
import { loadHotel } from './hotel-anchor.js';
import { escapeHtml } from './html.js';
import { showLoading } from './ui-status.js';

const PAGE = 5;
const $ = (id) => document.getElementById(id);

let texts = null;
let places = [];
let byUid = new Map();
let aliasIndex = new Map();
let courses = [];
let goalId = 'after-shoot';
let anchor = null;
let shown = PAGE;
let picker = null;
const hotel = loadHotel(storage());

function nearCode() {
  if (!anchor) return null;
  if (anchor.kind === 'spot') return `spot:${anchor.id}`;
  return anchor.kind === 'hotel' ? 'hotel' : null; // 現在地・住所はURLに載せない
}

function syncUrl() {
  const params = new URLSearchParams({ goal: goalId });
  if (nearCode()) params.set('near', nearCode());
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function renderNav() {
  $('goal-nav').innerHTML = GOAL_IDS.map(
    (id, i) => `<a class="stage-link" href="purpose.html?goal=${id}" data-goal="${id}"${id === goalId ? ' aria-current="page"' : ''}><span class="stage-num">${i + 1}</span>${escapeHtml(texts.goals[id].short)}</a>`
  ).join('');
}

function renderCourses() {
  const found = coursesForGoal(courses, goalId)
    .map((c) => resolveCourse(c, byUid))
    .filter(Boolean);
  $('courses-section').hidden = found.length === 0;
  $('courses-list').innerHTML = found
    .map(({ course, steps }) => {
      const links = legLinks(steps);
      return `
        <article class="course-card">
          <h3 class="course-title">${escapeHtml(course.title)}</h3>
          <p class="section-note">${escapeHtml(course.lead ?? '')}</p>
          <ol class="course-steps">
            ${steps
              .map(
                (s, i) => `
              <li class="course-step">
                <p class="course-step-name">${escapeHtml(s.place.name)}${s.optional ? '<span class="status-badge">立ち寄り(任意)</span>' : ''}</p>
                <p class="trending-meta">${escapeHtml(s.place.address ?? '')}</p>
                ${s.note ? `<p class="trending-desc">${escapeHtml(s.note)}</p>` : ''}
                <div class="card-actions">
                  ${links[i] ? `<a class="btn btn-outline" href="${links[i]}" target="_blank" rel="noopener" data-route>前の場所からの経路</a>` : ''}
                  <a class="btn btn-outline" href="${s.place.href}">詳しく見る</a>
                </div>
              </li>`
              )
              .join('')}
          </ol>
          <p class="filter-note">${escapeHtml(course.caveat ?? '')}</p>
          <p class="filter-note course-basis">このコースの根拠: ${escapeHtml(course.basis)}</p>
        </article>`;
    })
    .join('');
}

function render() {
  const goal = texts.goals[goalId];
  $('goal-h').textContent = goal.title;
  $('goal-lead').textContent = goal.lead;
  $('goal-caveat').textContent = goal.caveat;
  $('goal-links').innerHTML =
    [...(goal.links ?? []).map((l) => `<a class="btn btn-outline" href="${l.href}">${escapeHtml(l.label)}</a>`),
      `<a class="btn btn-outline" href="${searchLinkFor(goalId, nearCode())}">条件を絞って探す</a>`].join('');
  renderNav();

  const { needAnchor, results } = runGoal(places, goalId, { anchor, aliasIndex });
  if (needAnchor) {
    $('goal-summary').textContent = '';
    $('goal-results').innerHTML = `<div class="state-box is-empty" role="status"><p class="state-message">${escapeHtml(goal.anchorLabel)}を選ぶと、近い順に候補を出します。</p></div>`;
    $('goal-more').innerHTML = '';
  } else {
    const visible = results.slice(0, shown);
    $('goal-summary').textContent = anchor
      ? `${picker.labelOf(anchor)}から近い順(直線距離)・${results.length}件中${visible.length}件を表示`
      : `候補 ${results.length}件中${visible.length}件を表示`;
    $('goal-results').innerHTML = visible
      .map((r) => renderPlaceCard(r.place, { distanceKm: r.distanceKm, origin: anchor ? { lat: anchor.lat, lng: anchor.lng, kind: anchor.kind } : null, reasons: r.reasons, mapButton: false }))
      .join('');
    const rest = results.length - visible.length;
    $('goal-more').innerHTML = rest > 0 ? `<button type="button" class="btn btn-outline nearby-more-btn">もっと見る(あと${rest}件)</button>` : '';
  }
  renderCourses();
  syncUrl();
}

function setAnchor(next) {
  anchor = next;
  shown = PAGE;
  render();
  $('goal-summary').scrollIntoView({ block: 'start' });
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const id = params.get('goal');
  goalId = GOAL_IDS.includes(id) ? id : 'after-shoot';
  const near = params.get('near') ?? '';
  if (near.startsWith('spot:')) {
    const spot = findSpot(near.slice(5));
    anchor = spot ? { kind: 'spot', id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.label } : null;
  } else if (near === 'hotel' && hotel) anchor = { kind: 'hotel', lat: hotel.lat, lng: hotel.lng, label: hotel.name };
  else anchor = null;
}

runPage(async () => {
  showLoading($('goal-results'), '読み込み中…');
  const [loaded, purposeTexts, aliasFile, courseFile] = await Promise.all([
    loadPlaceData(),
    loadJson('data/purposes.json'),
    loadJson('data/search-aliases.json').catch(() => ({ groups: [] })),
    loadJson('data/courses.json').catch(() => ({ courses: [] }))
  ]);
  places = loaded.places;
  byUid = new Map(places.map((p) => [p.uid, p]));
  texts = purposeTexts;
  aliasIndex = buildAliasIndex(aliasFile.groups ?? []);
  courses = courseFile.courses ?? [];
  readUrl();

  picker = mountAnchorPicker({ container: $('anchor-box'), label: texts.goals[goalId].anchorLabel, hotel, onAnchor: setAnchor });
  picker.show(anchor);

  $('goal-more').addEventListener('click', (event) => {
    if (!event.target.closest('.nearby-more-btn')) return;
    shown += PAGE;
    render();
  });
  render();
});
