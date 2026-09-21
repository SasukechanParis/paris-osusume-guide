import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listPages, ROOT } from '../scripts/apply-shell.mjs';

test('every image referenced by a Japanese page exists, and hero images are WebP-first and lazy', () => {
  for (const file of listPages()) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    for (const [, src] of html.matchAll(/(?:src|srcset)="(assets\/[^" ]+)/g)) {
      assert.ok(existsSync(join(ROOT, src)), `${file}: ${src} is missing`);
    }
    for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const part of set.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        assert.ok(existsSync(join(ROOT, url)), `${file}: srcset ${url} is missing`);
        assert.ok(statSync(join(ROOT, url)).size < 250 * 1024, `${url} is over 250KB (mobile data)`);
      }
    }
    for (const [tag] of html.matchAll(/<img class="hero-image"[^>]*>/g)) {
      assert.match(tag, /width="\d+" height="\d+"/, `${file}: hero image without width/height (layout shift)`);
      assert.match(tag, /loading="lazy"/, file);
    }
  }
});
