import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { applyShell, listPages, ROOT } from '../scripts/apply-shell.mjs';
import { TABS, MENU_GROUPS, PAGE_TAB } from '../js/shell-data.js';

const pages = listPages();

test('there is at least the known set of Japanese pages', () => {
  for (const file of ['index.html', 'menu.html', 'map.html', 'emergency.html', 'restaurants.html']) {
    assert.ok(pages.includes(file), file);
  }
});

test('every page is in sync with js/shell-data.js (run: node scripts/apply-shell.mjs)', () => {
  for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    assert.equal(applyShell(html, file), html, `${file} is out of sync`);
  }
});

test('every page allows pinch-zoom, covers the safe area, and loads the shared mobile css/js', () => {
  for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? '';
    assert.match(viewport, /viewport-fit=cover/, file);
    assert.doesNotMatch(viewport, /user-scalable\s*=\s*(no|0)/i, `${file} disables zoom`);
    assert.doesNotMatch(viewport, /maximum-scale/i, `${file} limits zoom`);
    assert.match(html, /<link rel="stylesheet" href="css\/mobile\.css">/, file);
    assert.match(html, /<script type="module" src="js\/shell\.js"><\/script>/, file);
    assert.match(html, /<body class="jp[ "]/, file);
    assert.doesNotMatch(html, /class="site-nav"/, `${file} still has the old 17-item nav`);
  }
});

test('the emergency entry (困ったとき) is reachable from the top bar of every page', () => {
  for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    assert.match(html, /<a class="app-bar-sos" href="emergency\.html"/, file);
  }
});

test('the bottom tab bar has 4-5 primary actions and marks at most one as current', () => {
  assert.ok(TABS.length >= 4 && TABS.length <= 5);
  for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    const bar = html.match(/<nav class="tab-bar"[\s\S]*?<\/nav>/)?.[0] ?? '';
    assert.equal((bar.match(/class="tab"/g) ?? []).length, TABS.length, file);
    assert.ok((bar.match(/aria-current="page"/g) ?? []).length <= 1, file);
  }
});

test('tab and menu links point at pages that exist, and every page maps to a tab', () => {
  const hrefs = [...TABS.map((t) => t.href), ...MENU_GROUPS.flatMap((g) => g.links.map((l) => l.href))];
  for (const href of hrefs) {
    const file = href.split('#')[0];
    assert.ok(existsSync(join(ROOT, file)), `${href} does not exist`);
  }
  for (const file of Object.keys(PAGE_TAB)) assert.ok(existsSync(join(ROOT, file)), `PAGE_TAB has unknown page ${file}`);
});

test('the menu page lists every category page reachable from the old 17-item nav', () => {
  const menu = readFileSync(join(ROOT, 'menu.html'), 'utf8');
  for (const file of [
    'emergency.html', 'airport.html', 'shoot-day.html', 'bread.html', 'michelin.html', 'restaurants.html',
    'chocolatiers.html', 'bakeries.html', 'souvenirs.html', 'supermarket.html', 'hotels.html',
    'flea-markets.html', 'free-spots.html', 'guide.html', 'map.html', 'post.html'
  ]) {
    assert.ok(menu.includes(`href="${file}"`), `menu.html lacks ${file}`);
  }
});
