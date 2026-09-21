#!/usr/bin/env node
// 「オフライン用に保存」で端末へ保存するファイルの一覧(data/offline-pack.json)を作る。
//   node scripts/build-offline-pack.mjs           # 一覧を更新
//   node scripts/build-offline-pack.mjs --check   # ページやJSを直したのに一覧が古いとき終了コード1
// 対象ページから、CSS・JSの import(静的・動的)・画像を辿って集める。手で管理しない(保存し漏れで画面が壊れるのを防ぐ)。
// 地図(Leaflet・OpenStreetMapのタイル)は外部サービスなので保存しない。フォントはCDNで、読めなくても本文は読める。

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data/offline-pack.json');

// 通信が切れても使いたいページ(緊急・撮影準備・保存した店・フランス語・旅の流れ・空港・ガイド・検索など)
export const PACK_PAGES = [
  'index.html', 'menu.html', 'emergency.html', 'shoot-day.html', 'journey.html', 'transit.html', 'french.html', 'saved.html',
  'guide.html', 'airport.html', 'settings.html', 'search.html', 'purpose.html'
];
const OPTIONAL_DATA = ['data/toilets.json']; // 保存した場所にトイレがあるときだけ

const isLocal = (ref) => ref && !/^(?:[a-z]+:)?\/\//i.test(ref) && !ref.startsWith('#') && !ref.startsWith('data:');
const clean = (ref) => ref.split('#')[0].split('?')[0];

function importsOf(file) {
  const dir = posix.dirname(file);
  const text = readFileSync(join(ROOT, file), 'utf8');
  const found = [];
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) found.push(posix.normalize(posix.join(dir, m[1])));
  return found;
}

export function buildPack() {
  const css = new Set();
  const js = new Set();
  const images = new Set();
  const walk = (file) => {
    if (js.has(file)) return;
    if (!existsSync(join(ROOT, file))) throw new Error(`${file} が見つかりません(importの参照先)`);
    js.add(file);
    for (const dep of importsOf(file)) walk(dep);
  };
  for (const page of PACK_PAGES) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) if (isLocal(m[1])) css.add(clean(m[1]));
    for (const m of html.matchAll(/<script type="module" src="([^"]+)"/g)) if (isLocal(m[1])) walk(clean(m[1]));
    // <picture> の中身が元のPNG/JPG(数MB)の場合は、軽いWebP(srcset)だけを保存する
    for (const m of html.matchAll(/\ssrc="(assets\/[^"]+)"/g)) {
      const src = clean(m[1]);
      const webp = src.replace(/\.(png|jpe?g)$/i, '-800.webp');
      if (!existsSync(join(ROOT, webp))) images.add(src);
    }
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (isLocal(url)) images.add(clean(url));
      }
    }
  }
  const data = readdirSync(join(ROOT, 'data'))
    .filter((f) => f.endsWith('.json') && f !== 'offline-pack.json')
    .map((f) => `data/${f}`)
    .filter((f) => !OPTIONAL_DATA.includes(f))
    .sort();
  return {
    version: 1,
    note: 'scripts/build-offline-pack.mjs が自動生成。手で編集しない。オフライン保存の対象一覧。',
    pages: [...PACK_PAGES],
    css: [...css].sort(),
    js: [...js].sort(),
    images: [...images].sort(),
    data,
    optional: OPTIONAL_DATA
  };
}

function main() {
  const next = `${JSON.stringify(buildPack(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== next) {
      console.error('data/offline-pack.json が古くなっています → node scripts/build-offline-pack.mjs');
      process.exit(1);
    }
    console.log('オフライン保存の一覧: 最新');
    return;
  }
  writeFileSync(OUT, next);
  const pack = JSON.parse(next);
  console.log(`一覧を書き出しました(ページ${pack.pages.length}・CSS${pack.css.length}・JS${pack.js.length}・画像${pack.images.length}・データ${pack.data.length})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
