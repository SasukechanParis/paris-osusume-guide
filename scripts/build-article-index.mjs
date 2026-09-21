#!/usr/bin/env node
// 記事(ガイド・空港・緊急・撮影当日・お土産の選び方)の見出しと要約から、検索用の軽量な索引を作る。
//   node scripts/build-article-index.mjs           # data/search-articles.json を更新
//   node scripts/build-article-index.mjs --check   # 記事を直したのに索引が古いとき終了コード1
// 記事の本文は書き換えない。索引は「どのページのどの見出しに何が書いてあるか」を指すだけ。

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data/search-articles.json');

const PAGES = [
  { file: 'guide.html', label: '旅行ガイド' },
  { file: 'airport.html', label: '空港アクセス' },
  { file: 'emergency.html', label: '困ったとき' },
  { file: 'shoot-day.html', label: '撮影当日ガイド' },
  // お土産ページは「選び方」の4カード(souvenir-*)だけを記事として扱う(店の一覧は場所として検索できる)
  { file: 'souvenirs.html', label: 'お土産', idPrefix: 'souvenir-' }
];

// ページ全体・一覧ページの一部を指す入口(本文は持たない)。トイレ・地図など「場所」でもある語の記事側の入口。
const ENTRIES = [
  { file: 'toilets-map.html', anchor: '', title: 'トイレマップ', summary: '公衆トイレ581件を地図で表示。エリアで絞り込み・現在地や住所から近くを探せます', keywords: ['トイレ', '公衆トイレ', 'toilet'] },
  { file: 'free-spots.html', anchor: 'toilet-nearby-h', title: '近くの公衆トイレを探す', summary: '現在地・住所から近い公衆トイレを距離順に表示します', keywords: ['トイレ', '公衆トイレ', 'toilet'], label: '無料スポット' },
  { file: 'map.html', anchor: '', title: '地図', summary: '全カテゴリのお店をまとめて地図で見る', keywords: ['地図', 'map'] },
  { file: 'post.html', anchor: '', title: '投稿する', summary: 'おすすめのお店や感想を教えてください', keywords: ['投稿', '口コミ'] }
];

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'", '&quot;': '"' };

export function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(text, max = 90) {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : text;
}

const first = (html, re) => re.exec(html)?.[1] ?? '';

function extractPage({ file, label, idPrefix }) {
  const html = readFileSync(join(ROOT, file), 'utf8');
  const entries = [];

  // セクション見出し(h2 に id があるもの)
  const sectionRe = /<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g;
  const sections = [...html.matchAll(sectionRe)].map((m) => ({ id: m[1], title: stripTags(m[2]), index: m.index }));
  const sectionAt = (index) => [...sections].reverse().find((s) => s.index <= index)?.title ?? '';

  if (!idPrefix) {
    sections.forEach((section, i) => {
      if (section.id === 'scenarios-h') return; // 非表示の見出し
      const own = html.slice(section.index, sections[i + 1]?.index ?? html.length);
      const note = stripTags(first(own, /<p class="section-note">([\s\S]*?)<\/p>/));
      const desc = stripTags(first(own, /<p class="trending-desc">([\s\S]*?)<\/p>/));
      entries.push({
        id: `${file}#${section.id}`,
        page: file,
        anchor: section.id,
        title: section.title,
        section: label,
        summary: summarize(note || desc || section.title),
        text: '',
        keywords: []
      });
    });
  }

  // 緊急ページ: 各シナリオ(article.emergency-card)
  for (const m of html.matchAll(/<article class="emergency-card" id="([^"]+)">([\s\S]*?)<\/article>/g)) {
    const title = stripTags(first(m[2], /<h2>([\s\S]*?)<\/h2>/));
    const answer = stripTags(first(m[2], /<p class="emergency-answer">([\s\S]*?)<\/p>/));
    entries.push({ id: `${file}#${m[1]}`, page: file, anchor: m[1], title, section: label, summary: summarize(answer), text: summarize(stripTags(m[2]), 500), keywords: [] });
  }

  // カード(id付きの .trending-card)
  const cardRe = /<div class="trending-card" id="([^"]+)">/g;
  const cards = [...html.matchAll(cardRe)];
  cards.forEach((card, i) => {
    const id = card[1];
    if (idPrefix && !id.startsWith(idPrefix)) return;
    const start = card.index + card[0].length;
    const nextStart = cards[i + 1]?.index ?? html.length;
    const sectionEnd = html.indexOf('</section>', start);
    const end = Math.min(nextStart, sectionEnd === -1 ? html.length : sectionEnd);
    const body = html.slice(start, end);
    const title = stripTags(first(body, /<p class="trending-name">([\s\S]*?)<\/p>/)).replace(/^Q\.\s*/, '');
    const descs = [...body.matchAll(/<p class="trending-desc">([\s\S]*?)<\/p>/g)].map((d) => stripTags(d[1]));
    const text = descs.join(' ');
    entries.push({
      id: `${file}#${id}`,
      page: file,
      anchor: id,
      title,
      section: `${label}${sectionAt(card.index) ? ` › ${sectionAt(card.index)}` : ''}`,
      summary: summarize(text || title),
      text: summarize(text, 500),
      keywords: []
    });
  });

  return entries;
}

export function buildIndex() {
  const articles = PAGES.flatMap(extractPage);
  for (const e of ENTRIES) {
    articles.push({ id: `${e.file}#${e.anchor}`, page: e.file, anchor: e.anchor, title: e.title, section: e.label ?? '', summary: e.summary, text: '', keywords: e.keywords });
  }
  return { version: 1, note: 'scripts/build-article-index.mjs が各ページの見出し・カードから自動生成。手で編集しない。', articles };
}

function main() {
  const next = `${JSON.stringify(buildIndex(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(OUT, 'utf8');
    } catch {
      // 未生成
    }
    if (current !== next) {
      console.error('data/search-articles.json が古くなっています → node scripts/build-article-index.mjs');
      process.exit(1);
    }
    console.log('記事索引: 最新');
    return;
  }
  writeFileSync(OUT, next);
  console.log(`記事索引を書き出しました(${JSON.parse(next).articles.length}件)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
