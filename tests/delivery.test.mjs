import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
test('delivered HTML contains valid executable JavaScript and no external script dependencies', async () => {
  const html = await readFile(new URL('../TORNADO-TOWN.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  assert.doesNotMatch(scripts[0][1], /\bsrc\s*=/i);
  assert.doesNotThrow(() => new vm.Script(scripts[0][2], { filename: 'delivered-game.js' }));
  assert.doesNotMatch(html, /<link[^>]+(?:href|src)=/i);
  assert.doesNotMatch(html, /INLINE_GAME|INLINE_STYLE/);
  const served = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.equal(served, html);
});
