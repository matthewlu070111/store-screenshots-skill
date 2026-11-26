import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verify } from '../../src/verify.mjs';
import { sha256File } from '../../src/utils.mjs';
import { ROOT_DIR } from '../../src/constants.mjs';

const FIXTURES = join(ROOT_DIR, 'test', 'fixtures');

test('verify passes a matching manifest', () => {
  const dir = makeDir();
  try {
    copyFileSync(join(FIXTURES, 'sample.png'), join(dir, 'shot.png'));
    writeManifest(dir, {
      width: 11,
      height: 3,
      sha256: sha256File(join(dir, 'shot.png')),
    });
    const result = verify(dir, { log() {} });
    assert.equal(result.errors, 0);
    assert.equal(result.checked, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify reports dimension mismatches and alpha channels', () => {
  const dir = makeDir();
  try {
    copyFileSync(join(FIXTURES, 'sample-alpha.png'), join(dir, 'shot.png'));
    writeManifest(dir, { width: 10, height: 4, sha256: sha256File(join(dir, 'shot.png')) });
    const result = verify(dir, { log() {} });
    assert.equal(result.errors, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify reports missing files and hash drift', () => {
  const dir = makeDir();
  try {
    copyFileSync(join(FIXTURES, 'sample.png'), join(dir, 'shot.png'));
    writeManifest(dir, { width: 11, height: 3, sha256: '0'.repeat(64) });
    const result = verify(dir, { log() {} });
    assert.equal(result.errors, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify reports missing manifests', () => {
  const dir = makeDir();
  try {
    assert.throws(() => verify(dir, { log() {} }), /No manifest\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify enforces minShots', () => {
  const dir = makeDir();
  try {
    copyFileSync(join(FIXTURES, 'sample.png'), join(dir, 'shot.png'));
    writeManifest(dir, {
      width: 11,
      height: 3,
      sha256: sha256File(join(dir, 'shot.png')),
      minShots: 2,
    });
    const result = verify(dir, { log() {} });
    assert.equal(result.errors, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeDir() {
  const dir = mkdtempSync(join(tmpdir(), 'store-shots-verify-'));
  mkdirSync(join(dir, 'nested'), { recursive: true });
  return dir;
}

function writeManifest(dir, { width, height, sha256, minShots = null }) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    app: 'Test',
    sets: [{
      device: 'custom',
      width,
      height,
      minShots,
      maxShots: 10,
      maxMB: 8,
      files: [{ file: 'shot.png', width, height, sha256 }],
    }],
  }, null, 2));
}
