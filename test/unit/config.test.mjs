import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localize,
  mergeShot,
  normalizeSets,
  resolveFont,
  resolveFrame,
  resolveLayout,
  resolveLocales,
  resolveSpec,
  resolveTheme,
} from '../../src/config.mjs';
import { sanitize } from '../../src/utils.mjs';
import { PRESETS } from '../../src/constants.mjs';

test('localize picks the exact locale, then default, then the first value', () => {
  const text = { 'zh-CN': '你好', 'en-US': 'Hello' };
  assert.equal(localize(text, 'en-US'), 'Hello');
  assert.equal(localize(text, 'ja-JP'), '你好');
  assert.equal(localize({ default: 'Base', 'zh-CN': '中文' }, 'ja-JP'), 'Base');
  assert.equal(localize(undefined, 'en-US'), '');
  assert.equal(localize(42, 'en-US'), '42');
});

test('resolveLocales validates, deduplicates and falls back to a single output', () => {
  assert.deepEqual(resolveLocales({}, {}), [null]);
  assert.deepEqual(resolveLocales({}, { locales: ['en-US', 'EN-us', 'zh-CN'] }), ['en-US', 'zh-CN']);
  assert.deepEqual(resolveLocales({ locales: [] }, { locales: ['en-US'] }), [null]);
  assert.throws(() => resolveLocales({}, { locales: ['not a locale!'] }), /Invalid locale/);
});

test('resolveSpec handles presets and landscape swap', () => {
  const portrait = resolveSpec({ device: 'iphone-6.3' }, {});
  assert.equal(portrait.width, 1206);
  assert.equal(portrait.height, 2622);
  assert.equal(portrait.isPreset, true);

  const landscape = resolveSpec({ device: 'iphone-6.3', orientation: 'landscape' }, {});
  assert.equal(landscape.width, 2622);
  assert.equal(landscape.height, 1206);

  assert.throws(() => resolveSpec({ device: 'nope' }, {}), /Unknown device preset/);
});

test('resolveSpec handles custom sizes and validates bounds', () => {
  const phone = resolveSpec({ size: [1080, 1920] }, {});
  assert.equal(phone.id, '1080x1920');
  assert.equal(phone.deviceType, 'phone');

  const tablet = resolveSpec({ size: [1600, 2560] }, {});
  assert.equal(tablet.deviceType, 'tablet');

  // Custom sizes are exact targets; orientation must not swap them.
  const custom = resolveSpec({ size: [1080, 1920], orientation: 'landscape' }, {});
  assert.equal(custom.width, 1080);
  assert.equal(custom.height, 1920);

  assert.throws(() => resolveSpec({ size: [10, 2000] }, {}), /Invalid size/);
  assert.throws(() => resolveSpec({}, {}), /needs a "device" preset/);
});

test('mergeShot applies shot > set > config precedence', () => {
  const cfg = { layout: 'hero', theme: 'aurora', deviceScale: 2 };
  const set = { layout: 'split', theme: 'ocean', badge: 'Set badge' };
  const shot = { image: './a.png', layout: 'minimal', title: { default: 'Hi', 'en-US': 'Hello' } };
  const merged = mergeShot(cfg, set, shot, 'en-US');
  assert.equal(merged.layout, 'minimal');
  assert.equal(merged.theme, 'ocean');
  assert.equal(merged.badge, 'Set badge');
  assert.equal(merged.title, 'Hello');
  assert.equal(merged.deviceScale, 2);
});

test('mergeShot respects logo:false and showBrand defaults', () => {
  const withoutLogo = mergeShot({}, {}, { image: './a.png', logo: false }, 'en-US');
  assert.equal(withoutLogo.logo, null);
  assert.equal(withoutLogo.showBrand, false);

  const withLogo = mergeShot({}, { logo: './logo.svg' }, { image: './a.png' }, 'en-US');
  assert.equal(withLogo.logo, './logo.svg');
  assert.equal(withLogo.showBrand, true);

  const explicit = mergeShot({}, { logo: './logo.svg', showBrand: false }, { image: './a.png' }, 'en-US');
  assert.equal(explicit.showBrand, false);
});

test('resolveTheme merges theme objects and color overrides', () => {
  const aurora = resolveTheme('aurora');
  assert.equal(aurora.bg1, '#070B1F');

  const custom = resolveTheme('paper', { accent: '#000000' });
  assert.equal(custom.accent, '#000000');

  const objectTheme = resolveTheme({ bg1: '#111111' });
  assert.equal(objectTheme.bg1, '#111111');
  assert.equal(objectTheme.accent, '#A78BFA');

  assert.throws(() => resolveTheme('missing'), /Unknown theme/);
});

test('resolveLayout defaults by orientation and accepts detail', () => {
  assert.equal(resolveLayout(undefined, { width: 1200, height: 2400 }), 'hero');
  assert.equal(resolveLayout(undefined, { width: 2400, height: 1200 }), 'split');
  assert.equal(resolveLayout('detail', { width: 1200, height: 2400 }), 'detail');
  assert.throws(() => resolveLayout('weird', { width: 1, height: 1 }), /Choose hero, split, minimal or detail/);
});

test('resolveFrame maps booleans and validates values', () => {
  assert.equal(resolveFrame(true), 'bezel');
  assert.equal(resolveFrame(false), 'none');
  assert.equal(resolveFrame('flat'), 'flat');
  assert.throws(() => resolveFrame('rounded'), /Choose bezel, flat or none/);
});

test('resolveFont maps aliases and passes CSS stacks through', () => {
  assert.equal(resolveFont('system'), null);
  assert.match(resolveFont('serif'), /Songti SC/);
  assert.match(resolveFont('rounded'), /SF Pro Rounded/);
  assert.equal(resolveFont('Avenir Next, sans-serif'), 'Avenir Next, sans-serif');
});

test('normalizeSets supports arrays, a single object, and the single-set shorthand', () => {
  assert.deepEqual(normalizeSets({ sets: [{ device: 'a' }] }), [{ device: 'a' }]);
  assert.deepEqual(normalizeSets({ sets: { device: 'a' } }), [{ device: 'a' }]);
  assert.deepEqual(
    normalizeSets({ app: 'A', device: 'iphone-6.3', shots: [{ image: 'a.png' }] }),
    [{ device: 'iphone-6.3', shots: [{ image: 'a.png' }] }],
  );
  assert.deepEqual(normalizeSets({}), []);
});

test('sanitize creates safe lowercase prefixes', () => {
  assert.equal(sanitize('iPhone 6.9" / Hero'), 'iphone-6-9-hero');
  assert.equal(sanitize('中文'), '');
  assert.equal(sanitize('Crème brûlée'), 'creme-brulee');
});

test('presets.json exposes the documented required iPhone size', () => {
  assert.equal(PRESETS['iphone-6.3'].width, 1206);
  assert.equal(PRESETS['iphone-6.3'].height, 2622);
  assert.equal(PRESETS['iphone-duo-preview'].kind, 'app-preview-poster');
});
