// モデルコース。既存の場所ID(uid)を参照して並べるだけで、新しい推薦や体験談は作らない。
// 公開(published)と未確認の下書き(draft)を分け、下書きしかない入口は完成済みとして出さない。
// 所要時間は直線距離から作らない。区間ごとに、Googleマップの経路画面へつなぐ。

import { buildDirectionsUrl } from './maps-links.js';

export function publishedCourses(courses) {
  return (courses ?? []).filter((c) => c.status === 'published' && Array.isArray(c.steps) && c.steps.length >= 2);
}

export function draftCourses(courses) {
  return (courses ?? []).filter((c) => c.status !== 'published');
}

// 必須の場所が1つでもデータにない(削除・改名された)コースは、壊れた状態で見せず null にする
export function resolveCourse(course, byUid) {
  const steps = [];
  for (const step of course.steps) {
    const place = byUid.get(step.uid);
    if (!place) {
      if (step.optional) continue;
      return null;
    }
    steps.push({ place, optional: step.optional === true, note: step.note ?? null });
  }
  return steps.length >= 2 ? { course, steps } : null;
}

// 隣り合う場所の間の経路リンク(出発地は前の場所。利用者の位置は使わない)
export function legLinks(steps) {
  return steps.map((step, i) => {
    if (i === 0) return null;
    const from = steps[i - 1].place;
    return buildDirectionsUrl(step.place, { lat: from.lat, lng: from.lng });
  });
}

export function coursesForGoal(courses, goalId) {
  return publishedCourses(courses).filter((c) => (c.goals ?? []).includes(goalId));
}
