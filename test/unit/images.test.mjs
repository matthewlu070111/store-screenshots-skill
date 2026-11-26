import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileInfo, imageData, imageInfo } from '../../src/images.mjs';
import { ROOT_DIR } from '../../src/constants.mjs';

const FIXTURES = join(ROOT_DIR, 'test', 'fixtures');

test('imageInfo reads PNG, JPEG, WebP and SVG headers', () => {
  assert.deepEqual(imageInfo(readFixture('sample.png')), { width: 11, height: 3, alpha: false, format: 'png' });
  assert.deepEqual(imageInfo(readFixture('sample-alpha.png')), { width: 9, height: 4, alpha: true, format: 'png' });
  assert.deepEqual(imageInfo(readFixture('sample.jpg')), { width: 8, height: 6, alpha: false, format: 'jpeg' });
  assert.deepEqual(imageInfo(readFixture('sample.webp')), { width: 7, height: 5, alpha: false, format: 'webp' });
});

test('imageInfo reads SVG dimensions from width/height', () => {
  const info = imageInfo(readFixture('../../examples/demo/assets/logo.svg'));
  assert.equal(info.width, 128);
  assert.equal(info.height, 128);
  assert.equal(info.format, 'svg');
  assert.equal(info.alpha, true);
});

test('imageInfo returns null for unknown bytes', () => {
  assert.equal(imageInfo(Buffer.from('definitely not an image')), null);
});

test('imageData embeds a data URL and hashes the source', () => {
  const data = imageData(join(FIXTURES, 'sample.png'), ROOT_DIR, 'screenshot', { warn() {} });
  assert.match(data.dataUrl, /^data:image\/png;base64,/);
  assert.equal(data.width, 11);
  assert.equal(data.height, 3);
  assert.match(data.sha256, /^[a-f0-9]{64}$/);
});

test('imageData rejects missing files and unsupported formats', () => {
  assert.throws(() => imageData('missing.png', FIXTURES, 'screenshot'), /not found/);
  assert.throws(() => imageData('sample.png', ROOT_DIR, 'screenshot'), /not found/);

  const tmp = mkdtempSync(join(tmpdir(), 'store-shots-image-'));
  try {
    const gif = join(tmp, 'x.gif');
    writeFileSync(gif, 'GIF89a');
    assert.throws(
      () => imageData(gif, tmp, 'logo', { warn() {} }),
      /Unsupported logo format/,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('fileInfo returns null for a missing path', () => {
  assert.equal(fileInfo(join(FIXTURES, 'nope.png')), null);
});

function readFixture(name) {
  return readFileSync(join(FIXTURES, name));
}
