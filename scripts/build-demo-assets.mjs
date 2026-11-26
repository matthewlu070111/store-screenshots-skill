#!/usr/bin/env node
/**
 * Rebuild the synthetic demo screenshots used by examples/demo.
 *
 * These are not real product captures; they exist so the repository has a
 * runnable, self-contained demo. The generator treats them like any other
 * source screenshot.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_DIR } from '../src/constants.mjs';
import { findBrowser, renderPng } from '../src/browser.mjs';
import { fileInfo } from '../src/images.mjs';

const SOURCE_DIR = join(ROOT_DIR, 'examples', 'demo', 'source');
const OUTPUT_DIR = join(ROOT_DIR, 'examples', 'demo', 'assets', 'screens');

const PAGES = [
  { source: '01-home.html', output: '01-home.png', width: 1179, height: 2556 },
  { source: '02-session.html', output: '02-session.png', width: 1179, height: 2556 },
  { source: '03-insights.html', output: '03-insights.png', width: 1179, height: 2556 },
  { source: '04-tablet.html', output: '04-tablet.png', width: 2064, height: 2752 },
  { source: '05-android.html', output: '05-android.png', width: 1080, height: 1920 },
];

const browser = findBrowser();
if (!browser) {
  console.error('No Chrome/Chromium/Edge found. Install one or set CHROME_PATH.');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const page of PAGES) {
  const output = join(OUTPUT_DIR, page.output);
  process.stdout.write(`Rendering ${page.source} → ${page.output} (${page.width}×${page.height}) `);
  renderPng(browser, join(SOURCE_DIR, page.source), output, page.width, page.height, {
    env: process.env,
  });
  const info = fileInfo(output);
  if (!info || info.width !== page.width || info.height !== page.height) {
    throw new Error(`Unexpected output size for ${page.output}: ${JSON.stringify(info)}`);
  }
  console.log(`✓ ${info.width}×${info.height}`);
}

console.log(`\nDemo sources written to ${OUTPUT_DIR}`);
