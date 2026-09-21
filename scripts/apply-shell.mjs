#!/usr/bin/env node
// 日本語版の全ページに共通シェル(上部バー・下部タブ・viewport・共通CSS/JS)を書き込む。
// 定義は js/shell-data.js にある。使い方:
//   node scripts/apply-shell.mjs           # 全ページを更新
//   node scripts/apply-shell.mjs --check   # 同期ずれがあれば終了コード1(CI・テスト用)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ICONS, TABS, SOS, MENU_GROUPS, pageTabId } from '../js/shell-data.js';
import { ANALYTICS_GUARD_SOURCE } from '../js/analytics-guard.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

export function renderTop(file) {
  const current = pageTabId(file) === 'sos' ? ' aria-current="page"' : '';
  return [
    '<header class="app-bar">',
    '    <a class="app-bar-brand" href="index.html"><span class="app-bar-flag" aria-hidden="true"><i></i><i></i><i></i></span>パリおすすめ</a>',
    `    <a class="app-bar-sos" href="${SOS.href}"${current}>${SOS.label}</a>`,
    '  </header>'
  ].join('\n');
}

export function renderBottom(file) {
  const active = pageTabId(file);
  const items = TABS.map((tab) => {
    const current = tab.id === active ? ' aria-current="page"' : '';
    const badge = tab.badge ? '<span class="tab-badge" data-saved-count hidden></span>' : '';
    return `  <a class="tab" href="${tab.href}" data-tab="${tab.id}"${current}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[tab.icon]}</svg><span>${tab.label}</span>${badge}</a>`;
  });
  return ['<nav class="tab-bar" aria-label="メインメニュー">', ...items, '</nav>'].join('\n');
}

export function renderMenuGroups() {
  return MENU_GROUPS.map((group, i) => {
    const links = group.links
      .map(
        (link) =>
          `      <li><a class="menu-link" href="${link.href}"><span class="menu-link-label">${link.label}</span><span class="menu-link-desc">${link.desc}</span></a></li>`
      )
      .join('\n');
    return `    <section class="menu-group" aria-labelledby="menu-h-${i}">\n      <h2 class="menu-group-title" id="menu-h-${i}">${group.title}</h2>\n      <ul class="menu-list">\n${links}\n      </ul>\n    </section>`;
  }).join('\n');
}

// 計測(GoatCounter)より先に、URLのクエリ(検索語など)を送らない設定を差し込む(js/analytics-guard.js)
const HEAD_INNER = `<link rel="stylesheet" href="css/mobile.css">\n<script>${ANALYTICS_GUARD_SOURCE}</script>`;
const SCRIPTS_INNER = '<script type="module" src="js/shell.js"></script>';

function block(name, inner) {
  return `<!-- shell:${name} -->\n${inner}\n<!-- /shell:${name} -->`;
}

function blockRegex(name) {
  return new RegExp(`<!-- shell:${name} -->[\\s\\S]*?<!-- /shell:${name} -->`);
}

function hasBlock(html, name) {
  return blockRegex(name).test(html);
}

function replaceBlock(html, name, inner) {
  return html.replace(blockRegex(name), () => block(name, inner));
}

export function applyShell(html, file) {
  let out = html;

  out = out.replace(/<meta name="viewport"[^>]*>/, VIEWPORT);

  out = out.replace(/<body(?: class="([^"]*)")?>/, (_, cls) => {
    const classes = new Set((cls ?? '').split(/\s+/).filter(Boolean));
    classes.add('jp');
    return `<body class="${[...classes].join(' ')}">`;
  });

  if (hasBlock(out, 'head')) {
    out = replaceBlock(out, 'head', HEAD_INNER);
  } else {
    out = out.replace('</head>', () => `${block('head', HEAD_INNER)}\n</head>`);
  }

  const top = renderTop(file);
  if (hasBlock(out, 'top')) {
    out = replaceBlock(out, 'top', `  ${top}`);
  } else if (/<nav class="site-nav">[\s\S]*?<\/nav>/.test(out)) {
    out = out.replace(/ *<nav class="site-nav">[\s\S]*?<\/nav>/, () => `  ${block('top', `  ${top}`)}`);
  } else {
    throw new Error(`${file}: 上部ナビの差し込み位置(<!-- shell:top --> または旧 .site-nav)が見つかりません`);
  }

  const bottom = renderBottom(file);
  const tail = `${bottom}\n${SCRIPTS_INNER}`;
  if (hasBlock(out, 'bottom')) {
    out = replaceBlock(out, 'bottom', tail);
  } else {
    if (!/<\/div>\n(?=<script)/.test(out)) {
      throw new Error(`${file}: 下部ナビの差し込み位置(.page 終了直後の <script>)が見つかりません`);
    }
    out = out.replace(/<\/div>\n(?=<script)/, () => `</div>\n${block('bottom', tail)}\n`);
  }

  if (hasBlock(out, 'menu')) {
    out = replaceBlock(out, 'menu', renderMenuGroups());
  }

  return out;
}

export function listPages() {
  return readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .sort();
}

function main() {
  const check = process.argv.includes('--check');
  const drift = [];
  for (const file of listPages()) {
    const path = join(ROOT, file);
    const before = readFileSync(path, 'utf8');
    const after = applyShell(before, file);
    if (before === after) continue;
    drift.push(file);
    if (!check) writeFileSync(path, after);
  }
  if (check) {
    if (drift.length > 0) {
      console.error(`共通シェルが同期していないページ: ${drift.join(', ')}\n→ node scripts/apply-shell.mjs で更新してください`);
      process.exit(1);
    }
    console.log('共通シェル: 全ページ同期済み');
  } else {
    console.log(drift.length > 0 ? `更新: ${drift.join(', ')}` : '変更なし');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
