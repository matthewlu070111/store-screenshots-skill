#!/usr/bin/env node
/**
 * Repository hygiene check used by `npm run check` and CI.
 *
 * This is intentionally dependency-free: JSON parsing, file presence, package
 * metadata, and `node --check` syntax validation cover the failure modes this
 * project can actually hit.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT_DIR, PRESETS, THEMES } from '../src/constants.mjs';

const REQUIRED = [
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'README.zh-CN.md',
  'SECURITY.md',
  'SKILL.md',
  'package.json',
  'presets.json',
  'themes.json',
  'schema/config.schema.json',
  'templates/poster.html',
  'scripts/generate.mjs',
  'src/index.mjs',
  'examples/demo/demo.config.json',
  'examples/demo/assets/logo.svg',
  'examples/template.config.json',
  '.github/workflows/ci.yml',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/dependabot.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  'CITATION.cff',
  'docs/architecture.md',
  'docs/images/ios-hero.webp',
  'docs/images/social-preview.png',
  'examples/README.md',
  'scripts/test.mjs',
];

const errors = [];
const checks = [];

function check(name, condition, detail = '') {
  checks.push(name);
  if (!condition) errors.push(`${name}${detail ? `: ${detail}` : ''}`);
}

for (const file of REQUIRED) {
  check(`required file ${file}`, existsSync(join(ROOT_DIR, file)));
}

const files = walk(ROOT_DIR);
const jsonFiles = files.filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`invalid JSON ${relative(file)}: ${error.message}`);
  }
}
check('all JSON files parse', jsonFiles.length > 0);

const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'));
check('package name', pkg.name === 'store-screenshots');
check('package version', /^\d+\.\d+\.\d+$/.test(pkg.version));
check('package license', pkg.license === 'MIT');
check('package type', pkg.type === 'module');
check('package engines.node', pkg.engines?.node === '>=18.17');
check('package repository', String(pkg.repository?.url || '').includes('store-screenshots-skill'));

for (const [name, target] of Object.entries(pkg.bin || {})) {
  const file = join(ROOT_DIR, target);
  check(`bin ${name} exists`, existsSync(file));
  if (process.platform !== 'win32' && existsSync(file)) {
    check(`bin ${name} is executable`, Boolean(statSync(file).mode & 0o111));
  }
}

check('presets count', Object.keys(PRESETS).length >= 20);
check('iphone-6.3 preset', PRESETS['iphone-6.3']?.width === 1206 && PRESETS['iphone-6.3']?.height === 2622);
check('themes count', Object.keys(THEMES).length === 8);
check('poster template placeholder', readFileSync(join(ROOT_DIR, 'templates/poster.html'), 'utf8').includes('__SHOT_DATA__'));

const mjsFiles = files.filter((file) => file.endsWith('.mjs'));
for (const file of mjsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`syntax error ${relative(file)}:\n${result.stderr.trim()}`);
  }
}
check(`syntax check (${mjsFiles.length} modules)`, true);

const readme = readFileSync(join(ROOT_DIR, 'README.md'), 'utf8');
check('README links the Chinese edition', readme.includes('README.zh-CN.md'));
check('README links the license', readme.includes('LICENSE'));

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem${errors.length === 1 ? '' : 's'} found:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${checks.length} checks passed (${jsonFiles.length} JSON files, ${mjsFiles.length} modules).`);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'out', '.debug-html'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function relative(file) {
  return file.slice(ROOT_DIR.length + 1);
}
