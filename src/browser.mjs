/**
 * Browser discovery and headless PNG rendering.
 *
 * Rendering uses the locally installed Chrome/Chromium/Edge in headless mode,
 * which gives us real font shaping and exact dimensions without bundling a
 * browser or a rendering engine.
 */
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

export function findBrowser({ env = process.env, platform = process.platform } = {}) {
  const explicit = env.CHROME_PATH;
  const candidates = [];
  if (explicit) candidates.push(explicit);

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Arc.app/Contents/MacOS/Arc',
    );
  } else if (platform === 'win32') {
    const roots = [
      env.PROGRAMFILES,
      env['PROGRAMFILES(X86)'],
      env.LOCALAPPDATA,
    ].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        join(root, 'Chromium', 'Application', 'chrome.exe'),
      );
    }
  } else {
    for (const command of [
      'google-chrome',
      'google-chrome-stable',
      'chromium',
      'chromium-browser',
      'microsoft-edge',
      'brave-browser',
    ]) {
      const found = spawnSync('which', [command], { encoding: 'utf8' });
      if (found.status === 0) candidates.push(found.stdout.trim());
    }
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return { path: candidate, name: basename(candidate) };
  }
  return null;
}

export function renderPng(browser, htmlPath, outputPath, width, height, {
  quiet = false,
  env = process.env,
  timeout = 240_000,
} = {}) {
  if (!browser) throw new Error('No Chromium-based browser available.');
  const profile = mkdtempSync(join(tmpdir(), 'store-shots-profile-'));

  const browserArgs = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
    '--virtual-time-budget=2500',
    '--run-all-compositor-stages-before-draw',
    `--window-size=${width},${height}`,
    `--user-data-dir=${profile}`,
    `--screenshot=${outputPath}`,
    pathToFileURL(htmlPath).href,
  ];
  if (env.CHROME_NO_SANDBOX === '1') browserArgs.splice(1, 0, '--no-sandbox');

  let result;
  try {
    result = spawnSync(browser.path, browserArgs, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }

  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || '')
      .trim()
      .split('\n')
      .slice(-8)
      .join('\n');
    throw new Error(`Headless render failed with ${browser.name}.${detail ? `\n${detail}` : ''}`);
  }
  if (result.error && result.error.code !== 'ETIMEDOUT') {
    throw new Error(`Headless render failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !quiet) {
    const first = (result.stderr || '').trim().split('\n')[0];
    if (first) console.warn(`  (browser note: ${first})`);
  }
}
