import assert from 'node:assert/strict';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { ROOT_DIR, VERSION } from '../../src/constants.mjs';
import { findBrowser } from '../../src/browser.mjs';
import { imageInfo } from '../../src/images.mjs';
import { sha256File } from '../../src/utils.mjs';

const BIN = join(ROOT_DIR, 'scripts', 'generate.mjs');

function runCli(args, cwd = ROOT_DIR) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, CHROME_NO_SANDBOX: '1', FORCE_COLOR: '0' },
  });
}

test('CLI prints its version', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('CLI lists presets including the required iPhone size', () => {
  const result = runCli(['--list-presets']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /iphone-6\.3/);
  assert.match(result.stdout, /1206×2622/);
});

test('CLI dry-runs the bundled demo', () => {
  const result = runCli(['examples/demo/demo.config.json', '--dry-run', '--quiet']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dry run OK: 12 screenshots/);
});

test('CLI dry-run writes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'store-shots-dry-'));
  try {
    writeFileSync(join(dir, 'config.json'), JSON.stringify({
      app: 'Dry run',
      outDir: './should-not-exist',
      sets: [{
        name: 'tiny',
        size: [320, 480],
        shots: [{ image: join(ROOT_DIR, 'examples', 'demo', 'assets', 'screens', '01-home.png') }],
      }],
    }, null, 2));
    const result = runCli(['config.json', '--dry-run'], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(dir, 'should-not-exist')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI rejects invalid options', () => {
  const result = runCli(['--nope']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option/);
});

test('CLI renders an exact-size opaque PNG and verifies it', { skip: !findBrowser() && 'no Chromium browser installed' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'store-shots-cli-'));
  try {
    mkdirSync(join(dir, 'screens'));
    copyFileSync(
      join(ROOT_DIR, 'examples', 'demo', 'assets', 'screens', '01-home.png'),
      join(dir, 'screens', 'home.png'),
    );
    writeFileSync(join(dir, 'store-shots.config.json'), JSON.stringify({
      app: 'CLI test',
      outDir: './out',
      sets: [{
        name: 'tiny',
        size: [320, 480],
        shots: [{ image: './screens/home.png', title: 'Hello' }],
      }],
    }, null, 2));

    const generated = runCli(['store-shots.config.json', '--quiet'], dir);
    assert.equal(generated.status, 0, generated.stderr);

    const png = join(dir, 'out', 'tiny-01.png');
    assert.equal(existsSync(png), true);
    const info = imageInfo(readFileSync(png));
    assert.equal(info.width, 320);
    assert.equal(info.height, 480);
    assert.equal(info.alpha, false);

    const manifest = JSON.parse(readFileSync(join(dir, 'out', 'manifest.json'), 'utf8'));
    assert.equal(manifest.generatorVersion, VERSION);
    assert.equal(manifest.sets[0].files[0].sha256, sha256File(png));

    const verified = runCli(['--verify', './out'], dir);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /All 1 file passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
