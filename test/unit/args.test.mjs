import assert from 'node:assert/strict';
import test from 'node:test';
import { helpText, parseArgs } from '../../src/args.mjs';
import { VERSION } from '../../src/constants.mjs';

test('parses positional config and flags', () => {
  const args = parseArgs(['my.config.json', '--only', 'iphone', '--locale=zh-CN', '--dry-run']);
  assert.equal(args.config, 'my.config.json');
  assert.equal(args.only, 'iphone');
  assert.equal(args.locale, 'zh-CN');
  assert.equal(args.dryRun, true);
});

test('parses --verify with a path', () => {
  const args = parseArgs(['--verify', './out']);
  assert.equal(args.verify, './out');
  assert.equal(args.config, undefined);
});

test('supports short help and version flags', () => {
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('rejects unknown flags', () => {
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
});

test('rejects a flag without a value', () => {
  assert.throws(() => parseArgs(['--verify']), /needs a value/);
  assert.throws(() => parseArgs(['--out', '--quiet']), /needs a value/);
  assert.throws(() => parseArgs(['--only=']), /needs a value/);
});

test('rejects extra positional arguments', () => {
  assert.throws(() => parseArgs(['a.json', 'b.json']), /Unexpected argument/);
});

test('help text includes version and examples', () => {
  const help = helpText();
  assert.match(help, new RegExp(VERSION.replace(/\./g, '\\.')));
  assert.match(help, /--dry-run/);
  assert.match(help, /CHROME_PATH/);
});
