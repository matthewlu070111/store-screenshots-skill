/**
 * The generation pipeline: config → render plan → HTML → headless Chrome →
 * opaque PNG + manifest + preview.
 */
import {
  existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync,
  rmSync, copyFileSync, statSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_MAX_MB, MANIFEST_SCHEMA_VERSION, TEMPLATE, VERSION,
} from './constants.mjs';
import {
  localize, mergeShot, normalizeSets, normalizeShots, resolveFont, resolveFrame,
  resolveLayout, resolveLocales, resolveOutDir, resolveSpec, resolveTheme,
} from './config.mjs';
import { imageData, imageInfo } from './images.mjs';
import { findBrowser, renderPng } from './browser.mjs';
import { buildPreview } from './preview.mjs';
import { relPath, safeLocale, sanitize, sha256File, shortPath } from './utils.mjs';

/**
 * Validate and expand a config into concrete render jobs.
 * Exported for tests and for the programmatic API.
 */
export function buildPlan({
  cfg,
  baseDir,
  outDir,
  cwd = process.cwd(),
  only,
  locale,
  quiet = false,
  warn = console.warn,
}) {
  const sets = [...normalizeSets(cfg)];
  if (!sets.length) {
    throw new Error('No sets found. Add a "sets" array (or a top-level "device" + "shots").');
  }

  if (only) {
    const needle = only.toLowerCase();
    const filtered = sets.filter((set) => {
      const label = `${set.name || ''} ${set.device || ''} ${set.preset || ''}`.toLowerCase();
      return label.includes(needle);
    });
    if (!filtered.length) throw new Error(`--only "${only}" matched no sets.`);
    sets.splice(0, sets.length, ...filtered);
  }

  const plan = [];
  for (let setIndex = 0; setIndex < sets.length; setIndex++) {
    const set = sets[setIndex];
    const spec = resolveSpec(set, cfg);
    const shots = normalizeShots(set);
    if (!shots.length) throw new Error(`Set "${set.name || set.device || setIndex + 1}" has no shots.`);
    if (set.file && (!/^[A-Za-z0-9._-]+\.png$/.test(set.file) || set.file.includes('/') || set.file.includes('\\'))) {
      throw new Error(`Set "${set.name || setIndex + 1}" has invalid file "${set.file}". Use a flat .png filename.`);
    }
    if (set.file && shots.length > 1) {
      throw new Error(`Set "${set.name || setIndex + 1}" uses "file" with multiple shots. Use file only with one shot per set.`);
    }

    const setName = sanitize(set.name || spec.id || `${spec.width}x${spec.height}`) || `set-${setIndex + 1}`;

    let locales = resolveLocales(set, cfg);
    if (locale) {
      const wanted = locale.toLowerCase();
      locales = locales.filter((item) => item && item.toLowerCase() === wanted);
      if (!locales.length) continue;
    }

    if (spec.isPreset) {
      if (shots.length < spec.minShots) {
        warn(`"${spec.id}" usually needs at least ${spec.minShots} screenshots (you have ${shots.length}).`);
      }
      if (shots.length > spec.maxShots) {
        warn(`"${spec.id}" accepts at most ${spec.maxShots} screenshots (you have ${shots.length}).`);
      }
    }

    for (const activeLocale of locales) {
      const localeDir = activeLocale ? join(outDir, safeLocale(activeLocale)) : outDir;
      const files = [];

      for (let index = 0; index < shots.length; index++) {
        const shot = shots[index];
        const merged = mergeShot(cfg, set, shot, activeLocale);

        if (merged.title.length > 90) {
          warn(`Title is ${merged.title.length} characters; consider shortening it for thumbnails.`);
        }

        const image = imageData(merged.image, baseDir, 'screenshot', { warn });
        if (merged.imageOrientation !== 'any') {
          const shotLandscape = image.width > image.height;
          const canvasLandscape = spec.width > spec.height;
          if (shotLandscape !== canvasLandscape && !quiet) {
            warn(
              `"${shortPath(merged.image, cwd)}" is ${shotLandscape ? 'landscape' : 'portrait'} ` +
              `but ${spec.width}×${spec.height} is ${canvasLandscape ? 'landscape' : 'portrait'}. ` +
              `Use "orientation": "${shotLandscape ? 'landscape' : 'portrait'}" if that is unintended.`,
            );
          }
        }

        const theme = resolveTheme(merged.theme, merged.colors);
        const layout = resolveLayout(merged.layout, spec);
        const frame = resolveFrame(merged.frame);
        const logo = merged.logo ? imageData(merged.logo, baseDir, 'logo', { warn }) : null;
        const background = merged.backgroundImage
          ? imageData(merged.backgroundImage, baseDir, 'background image', { warn })
          : null;

        files.push({
          index: index + 1,
          title: merged.title || '',
          subtitle: merged.subtitle || '',
          eyebrow: merged.eyebrow || '',
          badge: merged.badge || '',
          image,
          theme,
          layout,
          frame,
          logo,
          background,
          showBrand: merged.showBrand,
          deviceScale: merged.deviceScale,
          detailZoom: merged.detailZoom,
          detailFocus: merged.detailFocus,
          island: merged.island,
          crease: merged.crease,
          font: resolveFont(merged.font),
          appName: localize(cfg.app, activeLocale),
          locale: activeLocale,
          output: join(localeDir, set.file || `${setName}-${String(index + 1).padStart(2, '0')}.png`),
        });
      }

      plan.push({ set, spec, setName, locale: activeLocale, files });
    }
  }

  if (!plan.length) {
    throw new Error('No sets matched the current --only / --locale filter.');
  }

  // Keep generated names unique within one run, but overwrite files from
  // earlier runs so incremental regeneration stays stable.
  const used = new Set();
  for (const item of plan) {
    for (const file of item.files) {
      let candidate = file.output;
      let suffix = 2;
      while (used.has(candidate)) {
        candidate = file.output.replace(/(\.[^.]+)$/, `-${suffix}$1`);
        suffix++;
      }
      used.add(candidate);
      file.output = candidate;
    }
  }

  return plan;
}

export function printPlan(plan, outDir, { log = console.log, cwd = process.cwd() } = {}) {
  log(`\nOutput: ${outDir}`);
  let count = 0;
  for (const item of plan) {
    log(
      `\n${item.spec.id || `${item.spec.width}x${item.spec.height}`}  ` +
      `${item.spec.width}×${item.spec.height}  ${item.spec.store || 'custom'}` +
      (item.locale ? `  · ${item.locale}` : ''),
    );
    for (const file of item.files) {
      count++;
      log(
        `  ${String(file.index).padStart(2, '0')}  ${shortPath(file.image.path, cwd)} → ${relPath(outDir, file.output)}` +
        `  [${file.layout}/${file.frame}]` +
        (file.title ? `  “${file.title.replace(/\n/g, ' ')}”` : ''),
      );
    }
  }
  log(`\nDry run OK: ${count} screenshot${count === 1 ? '' : 's'}. No files written.`);
}

/**
 * Generate screenshots for one config file.
 * Returns a summary object so the library API can be used programmatically.
 */
export async function generate({
  configPath,
  args = {},
  cwd = process.cwd(),
  env = process.env,
  log = console.log,
  stdout = process.stdout,
} = {}) {
  if (!configPath) throw new Error('Missing config file. Pass a JSON config path.');

  const absoluteConfigPath = resolve(cwd, configPath);
  if (!existsSync(absoluteConfigPath)) {
    throw new Error(`Config not found: ${absoluteConfigPath}`);
  }

  let cfg;
  try {
    cfg = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse config ${absoluteConfigPath}: ${error.message}`);
  }

  const baseDir = dirname(absoluteConfigPath);
  const outDir = resolveOutDir(cfg, baseDir, { out: args.out, cwd });
  const warn = (message) => {
    if (!args.quiet) console.warn(`\nWarning: ${message}`);
  };
  const plan = buildPlan({
    cfg,
    baseDir,
    outDir,
    cwd,
    only: args.only,
    locale: args.locale,
    quiet: args.quiet,
    warn,
  });

  if (args.dryRun) {
    printPlan(plan, outDir, { log, cwd });
    return { outDir, plan, manifest: null, rendered: 0 };
  }

  const browser = findBrowser({ env });
  if (!browser) {
    throw new Error(
      'No Chrome/Chromium/Edge browser found.\n' +
      'Install Google Chrome, or set CHROME_PATH to a Chromium-based browser executable.',
    );
  }

  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, 'manifest.json');
  let previousManifest = null;
  if ((args.only || args.locale) && existsSync(manifestPath)) {
    try {
      previousManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      warn('Existing manifest.json could not be read; it will be replaced.');
    }
  }

  const tmpRoot = mkdtempSync(join(tmpdir(), 'store-screenshots-'));
  const debugDir = args.keepHtml ? join(outDir, '.debug-html') : null;
  if (debugDir) mkdirSync(debugDir, { recursive: true });

  const total = plan.reduce((sum, item) => sum + item.files.length, 0);
  let done = 0;
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    app: localize(cfg.app, null),
    generatedAt: new Date().toISOString(),
    generator: 'store-screenshots',
    generatorVersion: VERSION,
    sets: [],
  };

  try {
    for (const item of plan) {
      const { spec } = item;
      const setEntry = {
        name: item.setName,
        device: spec.id || `${spec.width}x${spec.height}`,
        label: spec.label || '',
        store: spec.store || '',
        kind: spec.kind || 'screenshot',
        locale: item.locale || null,
        width: spec.width,
        height: spec.height,
        minShots: spec.minShots || null,
        maxShots: spec.maxShots || null,
        maxMB: spec.maxMB || DEFAULT_MAX_MB,
        files: [],
      };

      for (const file of item.files) {
        done++;
        mkdirSync(dirname(file.output), { recursive: true });

        const localeTag = item.locale ? `-${safeLocale(item.locale)}` : '';
        const htmlName = `${item.setName}${localeTag}-${String(file.index).padStart(2, '0')}-${done}.html`;
        const htmlPath = join(tmpRoot, htmlName);
        const data = {
          width: spec.width,
          height: spec.height,
          layout: file.layout,
          frame: file.frame,
          deviceType: spec.deviceType,
          deviceScale: file.deviceScale,
          image: file.image.dataUrl,
          imageW: file.image.width,
          imageH: file.image.height,
          theme: file.theme,
          title: file.title,
          subtitle: file.subtitle || '',
          eyebrow: file.eyebrow || '',
          badge: file.badge || '',
          logo: file.logo ? file.logo.dataUrl : null,
          backgroundImage: file.background ? file.background.dataUrl : null,
          showBrand: file.showBrand,
          appName: file.appName,
          font: file.font,
          locale: file.locale || '',
          detailZoom: file.detailZoom,
          detailFocus: file.detailFocus,
          island: file.island,
          crease: file.crease,
        };
        const json = JSON.stringify(data).replace(/</g, '\\u003c');
        writeFileSync(htmlPath, TEMPLATE.replace('__SHOT_DATA__', () => json), 'utf8');
        if (debugDir) copyFileSync(htmlPath, join(debugDir, htmlName));

        stdout.write(
          `[${String(done).padStart(String(total).length)}/${total}] ` +
          `${spec.id || `${spec.width}x${spec.height}`} · shot ${file.index} → ${basename(file.output)} `,
        );

        renderPng(browser, htmlPath, file.output, spec.width, spec.height, {
          quiet: args.quiet,
          env,
        });

        const info = statSync(file.output);
        const rendered = imageInfo(readFileSync(file.output));
        if (!rendered || rendered.width !== spec.width || rendered.height !== spec.height) {
          throw new Error(
            `Render size mismatch for ${basename(file.output)}: expected ${spec.width}×${spec.height}, ` +
            `got ${rendered ? `${rendered.width}×${rendered.height}` : 'no file'}.`,
          );
        }

        const megabytes = info.size / 1024 / 1024;
        if (megabytes > setEntry.maxMB) {
          warn(
            `${basename(file.output)} is ${megabytes.toFixed(1)} MB ` +
            `(limit for ${spec.store || 'this store'}: ${setEntry.maxMB} MB).`,
          );
        }

        setEntry.files.push({
          file: relPath(outDir, file.output),
          title: file.title,
          width: rendered.width,
          height: rendered.height,
          bytes: info.size,
          sha256: sha256File(file.output),
          source: basename(file.image.path),
          sourceSha256: file.image.sha256,
        });
        log(`✓ ${rendered.width}×${rendered.height} · ${megabytes.toFixed(1)} MB`);
      }

      manifest.sets.push(setEntry);
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  if (previousManifest?.sets?.length) {
    const setKey = (set) => `${set.name || set.device}|${set.locale || ''}`;
    const fresh = new Set(manifest.sets.map(setKey));
    const kept = previousManifest.sets.filter((set) => !fresh.has(setKey(set)));
    if (kept.length) {
      manifest.sets = [...kept, ...manifest.sets];
      manifest.app = manifest.app || previousManifest.app || '';
      log(`Merged ${kept.length} existing set${kept.length === 1 ? '' : 's'} into manifest.json.`);
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(join(outDir, 'preview.html'), buildPreview(manifest), 'utf8');

  log(`\nDone. ${total} screenshot${total === 1 ? '' : 's'} in ${outDir}`);
  log(`Manifest: ${manifestPath}`);
  log(`Preview:  ${join(outDir, 'preview.html')}`);
  if (debugDir) log(`HTML:     ${debugDir}`);

  return { outDir, plan, manifest, rendered: total };
}