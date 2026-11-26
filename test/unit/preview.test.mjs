import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreview } from '../../src/preview.mjs';

test('buildPreview renders sections and escapes user copy', () => {
  const html = buildPreview({
    app: '<script>alert(1)</script>',
    generatedAt: '2026-01-01T00:00:00.000Z',
    sets: [{
      kind: 'app-preview-poster',
      store: 'App Store',
      device: 'iphone-6.3',
      locale: 'en-US',
      width: 1206,
      height: 2622,
      files: [{
        file: 'en-US/iphone-6-3-01.png',
        title: '<b>Hello</b>',
        width: 1206,
        height: 2622,
      }],
    }],
  });

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /App Preview poster/);
  assert.match(html, /&lt;b&gt;Hello&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /en-US\/iphone-6-3-01\.png/);
});

test('buildPreview handles an empty manifest', () => {
  const html = buildPreview({ app: 'Empty', sets: [] });
  assert.match(html, /Empty/);
  assert.match(html, /<main>/);
});
