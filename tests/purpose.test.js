import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlaces } from '../js/places.js';
import { buildAliasIndex } from '../js/search-core.js';
import { GOAL_IDS, GOALS, selectForGoal, reasonsFor, runGoal, searchLinkFor } from '../js/purpose-core.js';
import { publishedCourses, draftCourses, resolveCourse, legLinks, coursesForGoal } from '../js/courses.js';
import { findSpot } from '../js/spots.js';

const load = (path) => JSON.parse(readFileSync(new URL(`../data/${path}.json`, import.meta.url)));
const data = {
  recommendations: load('recommendations'), guestRecommendations: load('guest-recommendations'), shops: load('shops'),
  michelin: load('michelin'), trending: load('trending'), fleaMarkets: load('flea-markets'), marches: load('marches'),
  freeSpots: load('free-spots'), passages: load('passages')
};
const places = buildPlaces(data, load('place-aliases'));
const byUid = new Map(places.map((p) => [p.uid, p]));
const aliasIndex = buildAliasIndex(load('search-aliases').groups);
const opera = findSpot('opera');
const anchor = { lat: opera.lat, lng: opera.lng, kind: 'spot' };

test('five goals exist, each with a selection rule that yields real candidates', () => {
  assert.deepEqual(GOAL_IDS, ['after-shoot', 'sit', 'japanese', 'rain', 'souvenir']);
  for (const id of GOAL_IDS) assert.ok(selectForGoal(places, id).length > 0, id);
});

test('after-shoot needs the place where the shoot ended (chosen by the user), then sorts nearest first', () => {
  assert.deepEqual(runGoal(places, 'after-shoot', { aliasIndex }), { needAnchor: true, results: [] });
  const { results } = runGoal(places, 'after-shoot', { anchor, aliasIndex });
  assert.ok(results.length >= 5);
  for (let i = 1; i < results.length; i++) assert.ok(results[i - 1].distanceKm <= results[i].distanceKm);
  assert.ok(results.every((r) => ['sasuke', 'guest'].includes(r.place.source)), 'さすけ・先輩カップルの推薦だけ(メディア由来の一覧は混ぜない)');
  assert.ok(results.every((r) => r.reasons.some((x) => /直線/.test(x))), '距離は「直線」と明記');
});

test('Japanese food uses only the 6 curated 日本食 picks (a condition that exists in the data)', () => {
  const found = selectForGoal(places, 'japanese');
  assert.equal(found.length, 6);
  assert.ok(found.every((p) => p.group === 'japanese'));
});

test('rain: passages (roofed by definition) and museums/libraries whose description says so — terraces, squares and parks are NOT called indoor', () => {
  const rain = selectForGoal(places, 'rain');
  const uids = new Set(rain.map((p) => p.uid));
  assert.ok(rain.some((p) => p.ds === 'passage'));
  for (const outdoor of ['e.place-du-tertre', 'e.institut-du-monde-arabe-terrasse', 'e.galeries-lafayette-terrasse', 'e.square-rene-viviani']) {
    assert.ok(!uids.has(outdoor), `${outdoor} は屋外なので出さない`);
  }
  for (const indoor of ['e.musee-carnavalet', 'e.petit-palais']) assert.ok(uids.has(indoor), indoor);
});

test('reasons contain only facts from the data and never promise entry, availability or waiting time', () => {
  for (const id of GOAL_IDS) {
    for (const place of selectForGoal(places, id).slice(0, 12)) {
      const text = reasonsFor(id, place, 0.4).join(' ');
      assert.doesNotMatch(text, /予約(不要|なし)|待ち時間なし|ドレス.*(可|OK)|空いて|営業中|徒歩\d/, `${id}:${place.uid}`);
    }
  }
  const curious = places.find((p) => p.status === 'curious');
  assert.match(reasonsFor('sit', curious).join(' '), /未訪問/, '未訪問の区別を消さない');
});

test('the "search with the same conditions" link never carries GPS, addresses or hotel coordinates', () => {
  assert.equal(searchLinkFor('after-shoot', 'spot:opera'), 'search.html?cat=eat&near=spot%3Aopera');
  assert.equal(searchLinkFor('japanese'), 'search.html?cat=eat&jp=1');
  assert.doesNotMatch(searchLinkFor('after-shoot', 'gps'), /near/);
  assert.doesNotMatch(searchLinkFor('after-shoot', 'address'), /near/);
  assert.ok(Object.keys(GOALS).length === 5);
});

// ---------- コース ----------
const courses = load('courses').courses;

test('published courses resolve against real places; drafts are separate and never treated as finished', () => {
  const published = publishedCourses(courses);
  assert.deepEqual(published.map((c) => c.id), ['passages-three']);
  assert.deepEqual(draftCourses(courses).map((c) => c.id), ['after-shoot-draft']);
  assert.equal(coursesForGoal(courses, 'after-shoot').length, 0, '下書きしかない入口(撮影後)にコースを出さない');
  assert.equal(coursesForGoal(courses, 'rain').length, 1);
  for (const course of published) {
    for (const step of course.steps) assert.ok(byUid.has(step.uid), `${course.id}: unknown ${step.uid}`);
    assert.ok(course.basis.length > 20, 'コースの根拠が書いてある');
    assert.doesNotMatch(JSON.stringify(course), /\d+\s*(分|時間)/, '所要時間を書かない');
  }
});

test('a course whose required place disappeared is hidden instead of shown broken; optional gaps are skipped', () => {
  const course = { id: 'x', steps: [{ uid: 'p.passage-jouffroy' }, { uid: 'r.gone-forever' }] };
  assert.equal(resolveCourse(course, byUid), null);
  const optional = { id: 'y', steps: [{ uid: 'p.passage-jouffroy' }, { uid: 'r.gone', optional: true }, { uid: 'p.passage-verdeau' }] };
  assert.equal(resolveCourse(optional, byUid).steps.length, 2);
});

test('each leg links to the external route screen from the previous stop (no computed walking minutes)', () => {
  const resolved = resolveCourse(publishedCourses(courses)[0], byUid);
  const links = legLinks(resolved.steps);
  assert.equal(links[0], null);
  for (const url of links.slice(1)) {
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
    assert.match(url, /origin=/);
  }
});

test('the passage course follows the map order south→north (Panoramas → Jouffroy → Verdeau)', () => {
  const lats = ['p.passage-des-panoramas', 'p.passage-jouffroy', 'p.passage-verdeau'].map((u) => byUid.get(u).lat);
  assert.ok(lats[0] < lats[1] && lats[1] < lats[2]);
});
