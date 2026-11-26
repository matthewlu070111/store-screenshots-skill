/**
 * Environment diagnostics used by `--doctor` (and by bug reports).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT_DIR, PRESETS, THEMES, VERSION } from './constants.mjs';
import { findBrowser, renderPng } from './browser.mjs';
import { fileInfo } from './images.mjs';

export function doctor({ env = process.env, log = console.log } = {}) {
  log('\nstore-screenshots doctor\n');
  log(`Version:   ${VERSION}`);
  log(`Node:      ${process.version}`);
  log(`Platform:  ${process.platform} ${process.arch}`);
  log(`Project:   ${ROOT_DIR}`);
  log(`Presets:   ${Object.keys(PRESETS).length}`);
  log(`Themes:    ${Object.keys(THEMES).join(', ')}`);

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 18 || (major === 18 && minor < 17)) {
    log('\nNode:      UNSUPPORTED');
    log('store-screenshots requires Node 18.17 or newer.');
    return 1;
  }

  const browser = findBrowser({ env });
  if (!browser) {
    log('\nBrowser:   NOT FOUND');
    log('Install Chrome/Chromium/Edge, or set CHROME_PATH.');
    return 1;
  }
  log(`Browser:   ${browser.path}`);

  const directory = mkdtempSync(join(tmpdir(), 'store-shots-doctor-'));
  const html = join(directory, 'test.html');
  const png = join(directory, 'test.png');
  writeFileSync(
    html,
    '<!doctype html><html><body style="margin:0;background:linear-gradient(135deg,#6a11cb,#2575fc)"></body></html>',
  );

  let exitCode = 0;
  try {
    renderPng(browser, html, png, 320, 480, { env });
    const info = fileInfo(png);
    if (!info || info.width !== 320 || info.height !== 480) {
      log(`\nTest render: FAILED (${info ? `${info.width}×${info.height}` : 'no output'})`);
      exitCode = 1;
    } else {
      log(`Test render: OK (320×480, ${info.alpha ? 'alpha present' : 'no alpha'})`);
    }
  } catch (error) {
    log(`\nTest render: FAILED\n${error.message}`);
    exitCode = 1;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  log('\nFor Chinese text, macOS PingFang SC / HarmonyOS Sans / Noto Sans SC are recommended.');
  log('All generated files are opaque PNGs; App Store rejects alpha channels.');
  if (env.CHROME_NO_SANDBOX === '1') {
    log('CHROME_NO_SANDBOX=1 is set: only use this in trusted containers running as root.');
  }
  log('');
  return exitCode;
}
