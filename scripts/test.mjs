#!/usr/bin/env node
/**
 * Cross-platform test runner.
 *
 * `node --test <dir>` handling differs across Node releases, so discover the
 * files here and pass an explicit list. This keeps `npm test` working on
 * Node 18.17+ and on Windows.
 */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('Usage: node scripts/test.mjs <test-dir> [test-dir...]');
  process.exit(1);
}

const files = [];
for (const root of roots) {
  const dir = resolve(process.cwd(), root);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.test.mjs')) files.push(join(dir, entry.name));
  }
}

if (!files.length) {
  console.error(`No .test.mjs files found in: ${roots.join(', ')}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
