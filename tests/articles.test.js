import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndex, stripTags, ROOT } from '../scripts/build-article-index.mjs';

const stored = JSON.parse(readFileSync(join(ROOT, 'data/search-articles.json'), 'utf8'));

test('data/search-articles.json is up to date with the pages (run: node scripts/build-article-index.mjs)', () => {
  assert.equal(`${JSON.stringify(buildIndex(), null, 2)}\n`, readFileSync(join(ROOT, 'data/search-articles.json'), 'utf8'));
});

test('every article entry links to an existing page and, when it has an anchor, an element with that id', () => {
  const ids = new Set();
  for (const article of stored.articles) {
    assert.ok(!ids.has(article.id), `duplicate article id ${article.id}`);
    ids.add(article.id);
    assert.ok(article.title.length > 0, article.id);
    assert.ok(existsSync(join(ROOT, article.page)), `${article.page} does not exist`);
    if (article.anchor) {
      const html = readFileSync(join(ROOT, article.page), 'utf8');
      assert.match(html, new RegExp(`id="${article.anchor}"`), `${article.page} has no #${article.anchor}`);
    }
  }
});

test('stripTags turns markup into plain searchable text', () => {
  assert.equal(stripTags('<p>A<br>B &amp; <strong>C</strong></p>'), 'A B & C');
});
