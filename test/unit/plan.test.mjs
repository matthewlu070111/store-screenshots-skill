import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { buildPlan } from '../../src/generate.mjs';
import { ROOT_DIR } from '../../src/constants.mjs';

const DEMO_DIR = join(ROOT_DIR, 'examples', 'demo');
const HOME = './assets/screens/01-home.png';

function baseConfig(overrides = {}) {
  return {
    app: 'Test',
    outDir: './out',
    locales: ['en-US', 'zh-CN'],
    sets: [{
      name: 'iphone-6.3',
      device: 'iphone-6.3',
      shots: [{
        image: HOME,
        title: { 'en-US': 'Hello', 'zh-CN': '你好' },
      }],
    }],
    ...overrides,
  };
}

function plan(cfg) {
  return buildPlan({
    cfg,
    baseDir: DEMO_DIR,
    outDir: join(DEMO_DIR, 'out-plan'),
    warn() {},
  });
}

test('buildPlan expands locales and writes into locale directories', () => {
  const result = plan(baseConfig());
  assert.equal(result.length, 2);
  assert.equal(result[0].files[0].output, join(DEMO_DIR, 'out-plan', 'en-US', 'iphone-6-3-01.png'));
  assert.equal(result[1].files[0].output, join(DEMO_DIR, 'out-plan', 'zh-CN', 'iphone-6-3-01.png'));
  assert.equal(result[1].files[0].title, '你好');
});

test('buildPlan honours --only and --locale filters', () => {
  const cfg = baseConfig();
  const filtered = buildPlan({
    cfg,
    baseDir: DEMO_DIR,
    outDir: join(DEMO_DIR, 'out-plan'),
    only: 'iphone',
    warn() {},
  });
  assert.equal(filtered.length, 2);
  // --only filters a copy; the caller's config must stay intact.
  assert.equal(cfg.sets.length, 1);

  const oneLocale = buildPlan({
    cfg: baseConfig(),
    baseDir: DEMO_DIR,
    outDir: join(DEMO_DIR, 'out-plan'),
    locale: 'zh-CN',
    warn() {},
  });
  assert.equal(oneLocale.length, 1);
  assert.equal(oneLocale[0].locale, 'zh-CN');

  assert.throws(
    () => buildPlan({
      cfg: baseConfig(),
      baseDir: DEMO_DIR,
      outDir: join(DEMO_DIR, 'out-plan'),
      only: 'ipad',
      warn() {},
    }),
    /matched no sets/,
  );
});

test('buildPlan rejects unsafe file names and multi-shot file sets', () => {
  assert.throws(
    () => plan(baseConfig({ sets: [{ device: 'iphone-6.3', file: '../evil.png', shots: [{ image: HOME }] }] })),
    /invalid file/,
  );
  assert.throws(
    () => plan(baseConfig({
      sets: [{
        device: 'iphone-6.3',
        file: 'one.png',
        shots: [{ image: HOME }, { image: HOME }],
      }],
    })),
    /file only with one shot/,
  );
});

test('buildPlan reports missing images and empty sets', () => {
  assert.throws(() => plan(baseConfig({ sets: [] })), /No sets found/);
  assert.throws(
    () => plan(baseConfig({ sets: [{ device: 'iphone-6.3', shots: [{ image: './assets/screens/nope.png' }] }] })),
    /screenshot not found/,
  );
});

test('buildPlan resolves the default layout from the canvas orientation', () => {
  const result = plan(baseConfig({
    locales: [],
    sets: [{ size: [1600, 2560], deviceType: 'tablet', shots: [{ image: HOME }] }],
  }));
  assert.equal(result[0].spec.id, '1600x2560');
  assert.equal(result[0].files[0].layout, 'hero');
  assert.equal(result[0].files[0].frame, 'bezel');
});
