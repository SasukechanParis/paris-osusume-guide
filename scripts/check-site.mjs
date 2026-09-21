#!/usr/bin/env node
// 公開前・更新後に走らせる小さなチェック。
//   node scripts/check-site.mjs              # 内部リンク・アンカー・JSON参照・ID重複・座標・日付・確認日の整合(エラーがあれば終了コード1)
//   node scripts/check-site.mjs --freshness  # 上に加えて、公式情報との照合が必要な項目(未確認・再確認の時期)の一覧
//   node scripts/check-site.mjs --external [--limit N]  # 外部リンクの疎通(参考情報。終了コードには影響しない)
// 外部リンクの結果は「閉店」「リンク切れ」と断定しない。アクセス拒否・タイムアウトは「自動では確認できない」として、手で開いて確認する。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';
import { auditItems, isIsoDate } from '../js/freshness.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
const readJson = (root, rel) => JSON.parse(read(root, rel));
const isoToday = (now = new Date()) => now.toISOString().slice(0, 10);

// JS が描画するアンカー(静的HTMLには無い)。ページごとに、データから正しい一覧を作って照合する
function dynamicAnchors(root, page) {
  const anchors = new Set();
  if (page === 'journey.html') {
    for (const card of readJson(root, 'data/official-info.json').cards) anchors.add(`official-${card.id}`);
    for (const stage of readJson(root, 'data/journey.json').stages) {
      anchors.add(`stage-${stage.id}`);
      anchors.add(`stage-${stage.id}-h`);
    }
  }
  return anchors;
}

const staticIds = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const LOCAL_LINK = /^(?:\.\/)?[\w\-/]+\.html(?:#[\w\-.:%]+)?$/;
const isExternal = (ref) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);

function pageAnchors(root, page, cache) {
  if (!cache.has(page)) {
    const ids = existsSync(join(root, page)) ? new Set(staticIds(read(root, page))) : new Set();
    for (const a of dynamicAnchors(root, page)) ids.add(a);
    cache.set(page, ids);
  }
  return cache.get(page);
}

// ref(相対リンク)が、存在するファイルとアンカーを指しているか。問題があれば文言、なければ null
function linkProblem(root, fromFile, ref, cache) {
  if (!ref || isExternal(ref)) return null;
  const [pathAndQuery, anchor] = ref.split('#');
  const path = pathAndQuery.split('?')[0];
  const target = path ? posix.normalize(posix.join(posix.dirname(fromFile), path)) : fromFile;
  if (target.startsWith('..')) return `${ref} → サイトの外を指しています`;
  if (!existsSync(join(root, target))) return `${ref} → ${target} がありません`;
  if (anchor && target.endsWith('.html')) {
    // place-<ID> は、カードが描画されたときに付く
    if (anchor.startsWith('place-')) return null;
    if (!pageAnchors(root, target, cache).has(decodeURIComponent(anchor))) return `${ref} → #${anchor} が ${target} にありません`;
  }
  return null;
}

function htmlChecks(root, files, add) {
  const cache = new Map();
  for (const file of files) {
    const scope = file.startsWith('en/') ? 'warn' : 'error'; // 英語版は今回の変更対象外。問題は警告にとどめる
    const html = read(root, file);
    const ids = staticIds(html);
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) add(scope, `${file}: id="${id}" が重複しています`);
      seen.add(id);
    }
    const refs = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) for (const part of m[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
    for (const ref of refs) {
      const problem = linkProblem(root, file, ref, cache);
      if (problem) add(scope, `${file}: ${problem}`);
    }
  }
  return cache;
}

function* walkValues(value, path = '') {
  if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) yield* walkValues(v, `${path}[${i}]`);
  } else if (value && typeof value === 'object') {
    yield { path, value, isObject: true };
    for (const [k, v] of Object.entries(value)) yield* walkValues(v, path ? `${path}.${k}` : k);
  } else {
    yield { path, value, isObject: false };
  }
}

const DATE_KEYS = /(?:^|\.)(?:date|verified_on|last_verified|added_date|published_on|edited_on|checked_on)$/;
const EXPIRY_KEYS = /(?:^|\.)(?:expires_on|valid_until|until)$/;
const BOUNDS = { lat: [48.5, 49.2], lng: [1.8, 2.9] }; // パリと近郊。外れたものは間違いの可能性

function dataChecks(root, cache, add, today) {
  const files = readdirSync(join(root, 'data')).filter((f) => f.endsWith('.json'));
  for (const name of files) {
    const rel = `data/${name}`;
    let data;
    try {
      data = readJson(root, rel);
    } catch (err) {
      add('error', `${rel}: JSONとして読めません(${err.message})`);
      continue;
    }
    for (const { path, value, isObject } of walkValues(data)) {
      if (isObject) {
        if (Array.isArray(value)) continue;
        if (typeof value.lat === 'number' && typeof value.lng === 'number') {
          const inBounds = value.lat >= BOUNDS.lat[0] && value.lat <= BOUNDS.lat[1] && value.lng >= BOUNDS.lng[0] && value.lng <= BOUNDS.lng[1];
          if (!inBounds) add('warn', `${rel}: ${path || '(先頭)'} の座標(${value.lat}, ${value.lng})がパリ周辺から外れています`);
        }
        continue;
      }
      if (typeof value !== 'string') continue;
      if (DATE_KEYS.test(path)) {
        if (!isIsoDate(value)) add('error', `${rel}: ${path} の日付が不正です(${value})`);
        else if (value > today) add('error', `${rel}: ${path} が未来の日付です(${value})`);
      } else if (EXPIRY_KEYS.test(path)) {
        if (!isIsoDate(value)) add('error', `${rel}: ${path} の日付が不正です(${value})`);
        else if (value < today) add('warn', `${rel}: ${path} の期限(${value})が過ぎています`);
      } else if (LOCAL_LINK.test(value) && /(?:^|\.)(?:link|page|href|url)$/.test(path)) {
        const problem = linkProblem(root, 'index.html', value, cache);
        if (problem) add('error', `${rel}: ${path} → ${problem}`);
      }
    }
    // 配列の中の id / uid の重複
    const arrays = Array.isArray(data) ? [['', data]] : Object.entries(data).filter(([, v]) => Array.isArray(v));
    for (const [key, list] of arrays) {
      for (const field of ['id', 'uid']) {
        const seen = new Set();
        for (const item of list) {
          const id = item && typeof item === 'object' ? item[field] : undefined;
          if (id === undefined) continue;
          if (seen.has(id)) add('error', `${rel}: ${key || '(先頭)'} の ${field}="${id}" が重複しています`);
          seen.add(id);
        }
      }
    }
  }
}

function freshnessChecks(root, cache, add, today) {
  const freshness = readJson(root, 'data/freshness.json');
  const files = { 'data/official-info.json': readJson(root, 'data/official-info.json') };
  const audited = auditItems(freshness, files, today);
  const ids = new Set();
  for (const { item, state } of audited) {
    const tag = `data/freshness.json: ${item.id}`;
    if (ids.has(item.id)) add('error', `${tag} が重複しています`);
    ids.add(item.id);
    if (item.refMissing) add('error', `${tag}: ref(${item.ref.file} の ${item.ref.card})が見つかりません`);
    if (state !== 'unverified') {
      if (!/^https:\/\//.test(item.source?.url ?? '')) add('error', `${tag}: 確認日があるのに出典URL(https)がありません`);
      if (!item.ref && !item.finding) add('error', `${tag}: 確認日があるのに、確認した内容(finding)がありません`);
    } else if (!item.action) {
      add('error', `${tag}: 未確認なのに、次にすること(action)がありません`);
    }
    const raw = freshness.items.find((i) => i.id === item.id);
    if (raw.ref && ('verified_on' in raw || 'source' in raw)) add('error', `${tag}: ref を使う項目は確認日・出典を持たない(参照先が正本)`);
    for (const w of item.where ?? []) {
      if (!existsSync(join(root, w.page))) add('error', `${tag}: ${w.page} がありません`);
      else if (w.anchor && !pageAnchors(root, w.page, cache).has(w.anchor)) add('error', `${tag}: ${w.page}#${w.anchor} がありません`);
    }
  }
  return audited;
}

// data-fresh の参照先が freshness.json にあるか
function freshMarkerChecks(root, files, add) {
  const known = new Set(readJson(root, 'data/freshness.json').items.map((i) => i.id));
  for (const file of files.filter((f) => !f.startsWith('en/'))) {
    for (const m of read(root, file).matchAll(/data-fresh="([^"]*)"/g)) {
      for (const id of m[1].split(/\s+/).filter(Boolean)) if (!known.has(id)) add('error', `${file}: data-fresh="${id}" が data/freshness.json にありません`);
    }
  }
}

export function checkSite({ root = ROOT, today = isoToday() } = {}) {
  const result = { errors: [], warnings: [], freshness: [] };
  const add = (level, message) => (level === 'error' ? result.errors : result.warnings).push(message);
  const jp = readdirSync(root).filter((f) => f.endsWith('.html'));
  const en = existsSync(join(root, 'en')) ? readdirSync(join(root, 'en')).filter((f) => f.endsWith('.html')).map((f) => `en/${f}`) : [];
  const files = [...jp, ...en];
  const cache = htmlChecks(root, files, add);
  dataChecks(root, cache, add, today);
  result.freshness = freshnessChecks(root, cache, add, today);
  freshMarkerChecks(root, files, add);
  // 今話題のこと: 最新の追加日が古すぎないか(週次の確認が止まっていないかの目安)
  const trending = readJson(root, 'data/trending.json');
  const newest = trending.map((t) => t.added_date).filter(isIsoDate).sort().at(-1);
  if (newest && (Date.parse(today) - Date.parse(newest)) / 86_400_000 > 30) add('warn', `data/trending.json: 最新の追加日(${newest})から30日以上たっています`);
  return result;
}

// ---------- 外部リンク(参考情報。断定しない) ----------
export function classifyLink({ status = null, error = null, timedOut = false } = {}) {
  if (timedOut) return { kind: 'timeout', note: '応答がありませんでした(混雑・遮断の可能性)。手で開いて確認してください' };
  if (error) return { kind: 'unreachable', note: '接続できませんでした(一時的な不調の可能性)。手で開いて確認してください' };
  if (status >= 200 && status < 300) return { kind: 'ok', note: '' };
  if (status >= 300 && status < 400) return { kind: 'redirect', note: '別のURLへ転送されています。新しいURLを確認してください' };
  if ([401, 403, 429, 999].includes(status)) return { kind: 'blocked', note: `アクセスが拒否されました(${status})。自動では確認できません。リンク切れとは限りません` };
  if (status === 404 || status === 410) return { kind: 'gone', note: `ページが見つかりません(${status})。リンク切れの可能性があります。手で開いて確認してください` };
  if (status >= 500) return { kind: 'server-error', note: `相手のサーバーの不調の可能性があります(${status})。時間をおいて確認してください` };
  return { kind: 'other', note: `想定外の応答(${status})。手で開いて確認してください` };
}

export function collectExternalLinks(root = ROOT) {
  const urls = new Map();
  const add = (url, from) => {
    if (!/^https?:\/\//.test(url) || /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|gc\.zgo\.at|goatcounter\.com|unpkg\.com|fonts\.g/.test(url)) return;
    if (!urls.has(url)) urls.set(url, from);
  };
  for (const f of readdirSync(root).filter((n) => n.endsWith('.html'))) {
    for (const m of read(root, f).matchAll(/\shref="(https?:\/\/[^"]+)"/g)) add(m[1], f);
  }
  for (const name of readdirSync(join(root, 'data')).filter((n) => n.endsWith('.json') && n !== 'toilets.json')) {
    for (const { value } of walkValues(readJson(root, `data/${name}`))) if (typeof value === 'string') add(value, `data/${name}`);
  }
  return [...urls].map(([url, from]) => ({ url, from }));
}

async function probe(url, timeoutMs = 10_000) {
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, signal: controller.signal, redirect: 'manual', headers: { 'user-agent': 'paris-guide-link-check' } });
      if (method === 'HEAD' && [400, 403, 405, 501].includes(res.status)) continue; // HEADを断るサイトはGETで確かめる
      return { status: res.status };
    } catch (err) {
      if (method === 'GET') return err.name === 'AbortError' ? { timedOut: true } : { error: err.message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: 'unknown' };
}

async function externalReport(limit) {
  const links = collectExternalLinks().slice(0, limit);
  const problems = [];
  let next = 0;
  const worker = async () => {
    while (next < links.length) {
      const link = links[next++];
      const verdict = classifyLink(await probe(link.url));
      if (verdict.kind !== 'ok') problems.push({ ...link, ...verdict });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`外部リンク ${links.length}件を確認(参考情報。ここでの結果だけで「閉店」「リンク切れ」と決めない)`);
  for (const p of problems.sort((a, b) => a.kind.localeCompare(b.kind))) console.log(`  [${p.kind}] ${p.url}\n      ${p.note}(${p.from})`);
  if (!problems.length) console.log('  すべて応答がありました');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--external')) {
    const i = args.indexOf('--limit');
    await externalReport(i >= 0 ? Number(args[i + 1]) || 50 : Infinity);
    return;
  }
  const result = checkSite();
  for (const w of result.warnings) console.log(`警告: ${w}`);
  for (const e of result.errors) console.log(`エラー: ${e}`);
  if (args.includes('--freshness')) {
    console.log('\n公式情報との照合が必要な項目');
    for (const { item, state, verifiedOn, dueOn } of result.freshness) {
      const label = { unverified: '未確認', due: '再確認の時期', current: '確認済み' }[state];
      console.log(`  [${label}] ${item.id}: ${item.label}${verifiedOn ? `(確認日 ${verifiedOn}、次の確認 ${dueOn} まで)` : ''}`);
      if (state !== 'current') console.log(`      → ${item.action}`);
    }
  }
  console.log(`\nエラー ${result.errors.length}件 / 警告 ${result.warnings.length}件`);
  if (result.errors.length) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
