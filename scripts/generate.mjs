#!/usr/bin/env node
/**
 * store-screenshots — generate app-store-ready screenshots from raw captures.
 *
 * Zero npm dependencies. Uses an installed Chrome/Chromium/Edge in headless
 * mode to render a local HTML poster at an exact pixel size.
 */
import {
  existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync,
  rmSync, copyFileSync, statSync
} from 'node:fs';
import { dirname, resolve, join, extname, isAbsolute, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRESETS_FILE = join(SKILL_DIR, 'presets.json');
const THEMES_FILE = join(SKILL_DIR, 'themes.json');
const TEMPLATE_FILE = join(SKILL_DIR, 'templates', 'poster.html');

const { presets: PRESETS } = JSON.parse(readFileSync(PRESETS_FILE, 'utf8'));
const THEMES = JSON.parse(readFileSync(THEMES_FILE, 'utf8'));
const TEMPLATE = readFileSync(TEMPLATE_FILE, 'utf8');

const LAYOUTS = new Set(['hero', 'split', 'minimal', 'detail']);
const FRAMES = new Set(['bezel', 'flat', 'none']);

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});

async function main() {
  if (args.help) return printHelp();
  if (args.doctor) return doctor();
  if (args.listPresets) return listPresets();
  if (args.verify) return verify(args.verify);
  if (!args.config) {
    printHelp();
    throw new Error('Missing config file. Pass a JSON config path.');
  }

  const configPath = resolve(args.config);
  if (!existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  const baseDir = dirname(configPath);
  const outDir = resolveOutDir(cfg, baseDir);
  const sets = normalizeSets(cfg);

  if (!sets.length) throw new Error('No sets found. Add a "sets" array (or a top-level "device" + "shots").');
  if (args.only) {
    const needle = args.only.toLowerCase();
    const filtered = sets.filter((s) => {
      const label = `${s.name || ''} ${s.device || ''} ${s.preset || ''}`.toLowerCase();
      return label.includes(needle);
    });
    if (!filtered.length) throw new Error(`--only "${args.only}" matched no sets.`);
    sets.splice(0, sets.length, ...filtered);
  }

  const browser = findBrowser();
  const plan = [];
  for (let si = 0; si < sets.length; si++) {
    const set = sets[si];
    const spec = resolveSpec(set, cfg);
    const shots = normalizeShots(set);
    if (!shots.length) throw new Error(`Set "${set.name || set.device || si + 1}" has no shots.`);
    if (set.file && (!/^[A-Za-z0-9._-]+\.png$/.test(set.file) || set.file.includes('/') || set.file.includes('\\'))) {
      throw new Error(`Set "${set.name || si + 1}" has invalid file "${set.file}". Use a flat .png filename.`);
    }
    if (set.file && shots.length > 1) {
      throw new Error(`Set "${set.name || si + 1}" uses "file" with multiple shots. Use file only with one shot per set.`);
    }
    const setName = sanitize(set.name || spec.id || `${spec.width}x${spec.height}`) || `set-${si + 1}`;

    let locales = resolveLocales(set, cfg);
    if (args.locale) {
      const wanted = args.locale.toLowerCase();
      locales = locales.filter((l) => l && l.toLowerCase() === wanted);
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

    for (const locale of locales) {
      const localeDir = locale ? join(outDir, safeLocale(locale)) : outDir;
      const files = [];
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const merged = mergeShot(cfg, set, shot, baseDir, locale);
        if (merged.title.length > 90) {
          warn(`Title is ${merged.title.length} characters; consider shortening it for thumbnails.`);
        }
        const image = imageData(merged.image, baseDir, 'screenshot');
        if (merged.imageOrientation !== 'any') {
          const shotLandscape = image.width > image.height;
          const canvasLandscape = spec.width > spec.height;
          if (shotLandscape !== canvasLandscape && !args.quiet) {
            warn(
              `"${shortPath(merged.image)}" is ${shotLandscape ? 'landscape' : 'portrait'} ` +
              `but ${spec.width}×${spec.height} is ${canvasLandscape ? 'landscape' : 'portrait'}. ` +
              `Use "orientation": "${shotLandscape ? 'landscape' : 'portrait'}" if that is unintended.`
            );
          }
        }
        const theme = resolveTheme(cfg, set, shot, merged, baseDir);
        const layout = resolveLayout(merged.layout, spec);
        const frame = resolveFrame(merged.frame);
        const logo = merged.logo ? imageData(merged.logo, baseDir, 'logo') : null;
        const background = merged.backgroundImage
          ? imageData(merged.backgroundImage, baseDir, 'background image')
          : null;

        files.push({
          index: i + 1,
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
          appName: localize(cfg.app, locale),
          locale,
          output: join(localeDir, set.file || `${setName}-${String(i + 1).padStart(2, '0')}.png`),
        });
      }
      plan.push({ set, spec, setName, locale, files });
    }
  }

  // Keep names unique inside one run, but overwrite files from earlier runs.
  const used = new Set();
  for (const p of plan) {
    for (const f of p.files) {
      let candidate = f.output;
      let n = 2;
      while (used.has(candidate)) {
        candidate = f.output.replace(/(\.[^.]+)$/, `-${n}$1`);
        n++;
      }
      used.add(candidate);
      f.output = candidate;
    }
  }

  if (!plan.length) {
    throw new Error('No sets matched the current --only / --locale filter.');
  }

  if (args.dryRun) {
    printPlan(plan, outDir);
    return;
  }
  if (!browser) {
    throw new Error(
      'No Chrome/Chromium/Edge browser found.\n' +
      'Install Google Chrome, or set CHROME_PATH to a Chromium-based browser executable.'
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
  const tmpRoot = mkdtempSync(join(os.tmpdir(), 'store-screenshots-'));
  const debugDir = args.keepHtml ? join(outDir, '.debug-html') : null;
  if (debugDir) mkdirSync(debugDir, { recursive: true });

  let done = 0;
  const total = plan.reduce((n, p) => n + p.files.length, 0);
  const manifest = {
    app: localize(cfg.app, null),
    generatedAt: new Date().toISOString(),
    generator: 'store-screenshots',
    sets: [],
  };

  try {
    for (const p of plan) {
      const { spec } = p;
      const setEntry = {
        name: p.setName,
        device: spec.id || `${spec.width}x${spec.height}`,
        label: spec.label || '',
        store: spec.store || '',
        kind: spec.kind || 'screenshot',
        locale: p.locale || null,
        width: spec.width,
        height: spec.height,
        minShots: spec.minShots || null,
        maxShots: spec.maxShots || null,
        maxMB: spec.maxMB || 8,
        files: [],
      };

      for (const f of p.files) {
        done++;
        mkdirSync(dirname(f.output), { recursive: true });
        const localeTag = p.locale ? `-${safeLocale(p.locale)}` : '';
        const htmlName = `${p.setName}${localeTag}-${String(f.index).padStart(2, '0')}.html`;
        const htmlPath = join(tmpRoot, htmlName);
        const data = {
          width: spec.width,
          height: spec.height,
          layout: f.layout,
          frame: f.frame,
          deviceType: spec.deviceType,
          deviceScale: f.deviceScale,
          image: f.image.dataUrl,
          imageW: f.image.width,
          imageH: f.image.height,
          theme: f.theme,
          title: f.title,
          subtitle: f.subtitle || '',
          eyebrow: f.eyebrow || '',
          badge: f.badge || '',
          logo: f.logo ? f.logo.dataUrl : null,
          backgroundImage: f.background ? f.background.dataUrl : null,
          showBrand: f.showBrand,
          appName: f.appName,
          font: f.font,
          locale: f.locale || '',
          detailZoom: f.detailZoom,
          detailFocus: f.detailFocus,
          island: f.island,
          crease: f.crease,
        };
        const json = JSON.stringify(data).replace(/</g, '\\u003c');
        writeFileSync(htmlPath, TEMPLATE.replace('__SHOT_DATA__', () => json), 'utf8');
        if (debugDir) copyFileSync(htmlPath, join(debugDir, htmlName));

        process.stdout.write(
          `[${String(done).padStart(String(total).length)}/${total}] ` +
          `${spec.id || `${spec.width}x${spec.height}`} · shot ${f.index} → ${basename(f.output)} `
        );

        renderPng(browser, htmlPath, f.output, spec.width, spec.height);
        const info = fileInfo(f.output);
        if (!info || info.width !== spec.width || info.height !== spec.height) {
          throw new Error(
            `Render size mismatch for ${basename(f.output)}: expected ${spec.width}×${spec.height}, ` +
            `got ${info ? `${info.width}×${info.height}` : 'no file'}.`
          );
        }
        const mb = statSync(f.output).size / 1024 / 1024;
        if (mb > setEntry.maxMB) {
          warn(`${basename(f.output)} is ${mb.toFixed(1)} MB (limit for ${spec.store || 'this store'}: ${setEntry.maxMB} MB).`);
        }
        setEntry.files.push({
          file: relPath(outDir, f.output),
          title: f.title,
          width: info.width,
          height: info.height,
          bytes: statSync(f.output).size,
          sha256: sha256File(f.output),
          source: basename(f.image.path),
          sourceSha256: f.image.sha256,
        });
        console.log(`✓ ${info.width}×${info.height} · ${mb.toFixed(1)} MB`);
      }
      manifest.sets.push(setEntry);
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  if (previousManifest?.sets?.length) {
    const setKey = (s) => `${s.name || s.device}|${s.locale || ''}`;
    const fresh = new Set(manifest.sets.map(setKey));
    const kept = previousManifest.sets.filter((s) => !fresh.has(setKey(s)));
    if (kept.length) {
      manifest.sets = [...kept, ...manifest.sets];
      manifest.app = manifest.app || previousManifest.app || '';
      console.log(`Merged ${kept.length} existing set${kept.length === 1 ? '' : 's'} into manifest.json.`);
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  writeFileSync(join(outDir, 'preview.html'), buildPreview(manifest), 'utf8');

  console.log(`\nDone. ${total} screenshot${total === 1 ? '' : 's'} in ${outDir}`);
  console.log(`Manifest: ${join(outDir, 'manifest.json')}`);
  console.log(`Preview:  ${join(outDir, 'preview.html')}`);
  if (debugDir) console.log(`HTML:     ${debugDir}`);
}

/* ------------------------------------------------------------------ */
/* arguments                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out.positional.push(a); continue; }
    const [key, inline] = a.slice(2).split('=', 2);
    const take = () => (inline !== undefined ? inline : argv[++i]);
    switch (key) {
      case 'help': case 'h': out.help = true; break;
      case 'doctor': out.doctor = true; break;
      case 'list-presets': out.listPresets = true; break;
      case 'verify': out.verify = take(); break;
      case 'out': out.out = take(); break;
      case 'only': out.only = take(); break;
      case 'locale': out.locale = take(); break;
      case 'dry-run': out.dryRun = true; break;
      case 'keep-html': out.keepHtml = true; break;
      case 'quiet': out.quiet = true; break;
      default: throw new Error(`Unknown option: --${key}`);
    }
  }
  out.config = out.positional[0];
  return out;
}

function printHelp() {
  console.log(`
store-screenshots — app store screenshot generator

Usage:
  node scripts/generate.mjs <config.json> [options]
  node scripts/generate.mjs --list-presets
  node scripts/generate.mjs --doctor
  node scripts/generate.mjs --verify <output-dir>

Options:
  --out <dir>      Override outDir from the config (relative to CWD)
  --only <text>    Generate only sets whose name/device/preset matches
  --locale <tag>   Generate only this locale (when locales are configured)
  --dry-run        Validate config and images, print the plan, render nothing
  --keep-html      Keep rendered HTML in <out>/.debug-html for inspection
  --quiet          Suppress warnings
  --doctor         Check Node, browser, presets and a test render
  --list-presets   Show all platform size presets
  --verify <dir>   Re-check dimensions, alpha and file sizes of a generated set

Browser:
  Auto-detects Chrome / Chromium / Edge / Brave. Override with CHROME_PATH.
`);
}

/* ------------------------------------------------------------------ */
/* config / plan                                                       */
/* ------------------------------------------------------------------ */

function resolveOutDir(cfg, baseDir) {
  if (args.out) return resolve(process.cwd(), args.out);
  return resolve(baseDir, cfg.outDir || 'store-screenshots');
}

function normalizeSets(cfg) {
  if (Array.isArray(cfg.sets)) return cfg.sets;
  if (cfg.sets && typeof cfg.sets === 'object') return [cfg.sets];
  if (cfg.device || cfg.preset || cfg.size || cfg.shots) {
    const { app, outDir, theme, layout, frame, colors, logo, showBrand, font, filePrefix, ...rest } = cfg;
    return [rest];
  }
  return [];
}

function normalizeShots(set) {
  const raw = set.shots ?? (set.image ? [set] : []);
  return raw.map((s) => (typeof s === 'string' ? { image: s } : s));
}

function resolveSpec(set, cfg) {
  const key = set.preset || set.device;
  let spec;
  if (key) {
    if (!PRESETS[key]) {
      throw new Error(`Unknown device preset "${key}". Run --list-presets to see available IDs.`);
    }
    spec = { ...PRESETS[key], id: key, isPreset: true };
  } else {
    const size = set.size || (set.width && set.height ? [set.width, set.height] : null);
    if (!Array.isArray(size) || size.length !== 2) {
      throw new Error(`Set "${set.name || ''}" needs a "device" preset or "size": [width, height].`);
    }
    const [w, h] = size.map(Number);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 100 || h < 100 || w > 8192 || h > 8192) {
      throw new Error(`Invalid size ${JSON.stringify(size)}. Use integers between 100 and 8192.`);
    }
    spec = {
      id: `${Math.round(w)}x${Math.round(h)}`,
      label: 'Custom size',
      store: '',
      width: Math.round(w),
      height: Math.round(h),
      deviceType: set.deviceType || (w / h > 0.6 ? 'tablet' : 'phone'),
      minShots: 1,
      maxShots: 10,
      maxMB: 8,
    };
  }

  const orientation = set.orientation || cfg.orientation;
  if (orientation && !['portrait', 'landscape'].includes(orientation)) {
    throw new Error(`Invalid orientation "${orientation}". Use portrait or landscape.`);
  }
  if (orientation === 'landscape' && spec.width < spec.height) {
    [spec.width, spec.height] = [spec.height, spec.width];
  } else if (orientation === 'portrait' && spec.width > spec.height) {
    [spec.width, spec.height] = [spec.height, spec.width];
  }
  spec.width = Math.round(spec.width);
  spec.height = Math.round(spec.height);
  return spec;
}

function mergeShot(cfg, set, shot, baseDir, locale) {
  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);
  const logoPath = pick(shot.logo, set.logo, cfg.logo);
  const logo = logoPath === false ? null : logoPath;
  const showBrand = pick(shot.showBrand, set.showBrand, cfg.showBrand);
  const rawImage = typeof shot === 'string' ? shot : shot.image;
  return {
    image: localize(rawImage, locale),
    title: localize(pick(shot.title, shot.headline, ''), locale),
    subtitle: localize(pick(shot.subtitle, shot.subheadline, ''), locale),
    eyebrow: localize(pick(shot.eyebrow, set.eyebrow, cfg.eyebrow, ''), locale),
    badge: localize(pick(shot.badge, set.badge, cfg.badge, ''), locale),
    layout: pick(shot.layout, set.layout, cfg.layout),
    frame: pick(shot.frame, set.frame, cfg.frame, 'bezel'),
    theme: pick(shot.theme, set.theme, cfg.theme, 'aurora'),
    colors: { ...(cfg.colors || {}), ...(set.colors || {}), ...(shot.colors || {}) },
    logo,
    backgroundImage: pick(shot.backgroundImage, set.backgroundImage, cfg.backgroundImage),
    showBrand: showBrand === undefined ? Boolean(logo) : Boolean(showBrand),
    deviceScale: Number(pick(shot.deviceScale, set.deviceScale, cfg.deviceScale, 1)) || 1,
    font: pick(shot.font, set.font, cfg.font),
    imageOrientation: pick(shot.imageOrientation, set.imageOrientation, cfg.imageOrientation, 'any'),
    detailZoom: Number(pick(shot.detailZoom, set.detailZoom, cfg.detailZoom, 1.8)) || 1.8,
    detailFocus: pick(shot.detailFocus, set.detailFocus, cfg.detailFocus, [0.5, 0.65]),
    island: Boolean(pick(shot.island, set.island, cfg.island, false)),
    crease: pick(shot.crease, set.crease, cfg.crease, true) !== false,
  };
}

function localize(value, locale) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (locale && value[locale] !== undefined) return String(value[locale]);
    if (value.default !== undefined) return String(value.default);
    const first = Object.values(value)[0];
    return first === undefined ? '' : String(first);
  }
  return value === undefined || value === null ? '' : String(value);
}

function resolveLocales(set, cfg) {
  const raw = set.locales !== undefined ? set.locales : cfg.locales;
  if (raw === undefined || raw === null || raw === false) return [null];
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item) continue;
    const locale = String(item).trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/.test(locale)) {
      throw new Error(`Invalid locale "${locale}". Use BCP 47-like tags such as zh-CN, en-US, ja-JP.`);
    }
    const key = locale.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(locale);
  }
  return out.length ? out : [null];
}

function safeLocale(locale) {
  return String(locale).replace(/[^A-Za-z0-9_-]+/g, '-');
}

function relPath(from, to) {
  return relative(from, to).split('\\').join('/');
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function resolveTheme(cfg, set, shot, merged) {
  const name = merged.theme;
  let base;
  if (typeof name === 'object' && name) {
    base = { ...THEMES.aurora, ...name };
  } else if (THEMES[name]) {
    base = { ...THEMES[name] };
  } else {
    throw new Error(
      `Unknown theme "${name}". Available: ${Object.keys(THEMES).join(', ')}. ` +
      `You can also pass a theme object or use "colors" overrides.`
    );
  }
  return { ...base, ...merged.colors };
}

function resolveLayout(layout, spec) {
  if (!layout) return spec.width > spec.height ? 'split' : 'hero';
  if (!LAYOUTS.has(layout)) {
    throw new Error(`Unknown layout "${layout}". Choose hero, split or minimal.`);
  }
  return layout;
}

function resolveFrame(frame) {
  if (frame === true) return 'bezel';
  if (frame === false) return 'none';
  if (!FRAMES.has(frame)) {
    throw new Error(`Unknown frame "${frame}". Choose bezel, flat or none.`);
  }
  return frame;
}

function resolveFont(font) {
  if (!font) return null;
  if (font === 'system') return null;
  if (font === 'serif') {
    return '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", Georgia, serif';
  }
  if (font === 'rounded') {
    return '"SF Pro Rounded", "PingFang SC", "Noto Sans SC", "HarmonyOS Sans SC", sans-serif';
  }
  return String(font);
}

function printPlan(plan, outDir) {
  console.log(`\nOutput: ${outDir}`);
  let n = 0;
  for (const p of plan) {
    console.log(
      `\n${p.spec.id || `${p.spec.width}x${p.spec.height}`}  ` +
      `${p.spec.width}×${p.spec.height}  ${p.spec.store || 'custom'}` +
      (p.locale ? `  · ${p.locale}` : '')
    );
    for (const f of p.files) {
      n++;
      console.log(
        `  ${String(f.index).padStart(2, '0')}  ${shortPath(f.image.path)} → ${basename(f.output)}` +
        `  [${f.layout}/${f.frame}]` +
        (f.title ? `  “${f.title.replace(/\n/g, ' ')}”` : '')
      );
    }
  }
  console.log(`\nDry run OK: ${n} screenshot${n === 1 ? '' : 's'}. No files written.`);
}

/* ------------------------------------------------------------------ */
/* files / images                                                      */
/* ------------------------------------------------------------------ */

function imageData(file, baseDir, role) {
  if (!file) throw new Error(`Missing ${role} path.`);
  const abs = isAbsolute(file) ? file : resolve(baseDir, file);
  if (!existsSync(abs)) throw new Error(`${role} not found: ${abs}`);
  const buf = readFileSync(abs);
  const ext = extname(abs).toLowerCase();
  const mime = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
  }[ext];
  if (!mime) {
    throw new Error(`Unsupported ${role} format "${ext || 'unknown'}" (${abs}). Use PNG, JPEG, WebP or SVG.`);
  }
  const info = imageInfo(buf);
  if (!info) throw new Error(`Could not read ${role} dimensions: ${abs}`);
  if (role === 'screenshot' && (info.width < 320 || info.height < 320)) {
    warn(`${shortPath(abs)} is only ${info.width}×${info.height}; the result may look soft.`);
  }
  if (role === 'screenshot' && info.alpha) {
    warn(`${shortPath(abs)} has an alpha channel; flatten transparent edges before publishing.`);
  }
  return {
    path: abs,
    width: info.width,
    height: info.height,
    alpha: info.alpha,
    sha256: createHash('sha256').update(buf).digest('hex'),
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
  };
}

function imageInfo(buf) {
  // SVG (logos, vector artwork)
  if (buf.length > 32) {
    const head = buf.toString('utf8', 0, Math.min(buf.length, 4096));
    if (/<svg[\s>]/i.test(head)) {
      const tag = head.match(/<svg[\s\S]*?>/i)?.[0] || '';
      const num = (name) => {
        const m = tag.match(new RegExp(name + "\\s*=\\s*[\"']([0-9.]+)", 'i'));
        return m ? Number(m[1]) : null;
      };
      let w = num('width');
      let h = num('height');
      if ((!w || !h)) {
        const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
        if (vb) { w = w || Number(vb[1]); h = h || Number(vb[2]); }
      }
      if (w && h) return { width: Math.round(w), height: Math.round(h), alpha: true, format: 'svg' };
    }
  }
  // PNG
  if (buf.length > 26 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const colorType = buf[25];
    let alpha = colorType === 4 || colorType === 6;
    for (let off = 8; off + 8 <= buf.length;) {
      const len = buf.readUInt32BE(off);
      const type = buf.toString('ascii', off + 4, off + 8);
      if (type === 'tRNS') { alpha = true; break; }
      if (type === 'IDAT' || type === 'IEND') break;
      off += 12 + len;
    }
    return { width, height, alpha, format: 'png' };
  }
  // JPEG
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
      const len = buf.readUInt16BE(off + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        return { width: buf.readUInt16BE(off + 7), height: buf.readUInt16BE(off + 5), alpha: false, format: 'jpeg' };
      }
      off += 2 + len;
    }
  }
  // WebP
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
        alpha: Boolean(buf[20] & 0x10),
        format: 'webp',
      };
    }
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false, format: 'webp' };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, alpha: true, format: 'webp' };
    }
  }
  return null;
}

function fileInfo(file) {
  if (!existsSync(file)) return null;
  return imageInfo(readFileSync(file));
}

function sanitize(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortPath(p) {
  const cwd = process.cwd();
  return p.startsWith(cwd) ? p.slice(cwd.length + 1) : p;
}

function warn(msg) {
  if (args && args.quiet) return;
  console.warn(`\nWarning: ${msg}`);
}

/* ------------------------------------------------------------------ */
/* browser                                                             */
/* ------------------------------------------------------------------ */

function findBrowser() {
  const explicit = process.env.CHROME_PATH;
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Arc.app/Contents/MacOS/Arc'
    );
  } else if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        join(root, 'Chromium', 'Application', 'chrome.exe')
      );
    }
  } else {
    for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']) {
      const found = spawnSync('which', [cmd], { encoding: 'utf8' });
      if (found.status === 0) candidates.push(found.stdout.trim());
    }
  }
  for (const c of candidates) {
    if (c && existsSync(c)) return { path: c, name: basename(c) };
  }
  return null;
}

function renderPng(browser, htmlPath, outputPath, width, height) {
  const profile = mkdtempSync(join(os.tmpdir(), 'store-shots-profile-'));
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
  if (process.env.CHROME_NO_SANDBOX === '1') browserArgs.splice(1, 0, '--no-sandbox');
  const res = spawnSync(browser.path, browserArgs, {
    encoding: 'utf8',
    timeout: 240000,
    maxBuffer: 32 * 1024 * 1024,
  });
  rmSync(profile, { recursive: true, force: true });

  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    const detail = (res.stderr || res.stdout || res.error?.message || '').trim().split('\n').slice(-8).join('\n');
    throw new Error(`Headless render failed with ${browser.name}.${detail ? `\n${detail}` : ''}`);
  }
  if (res.error && res.error.code !== 'ETIMEDOUT') {
    throw new Error(`Headless render failed: ${res.error.message}`);
  }
  if (res.status !== 0 && !args.quiet) {
    const first = (res.stderr || '').trim().split('\n')[0];
    if (first) console.warn(`  (browser note: ${first})`);
  }
}

/* ------------------------------------------------------------------ */
/* verification / preview                                              */
/* ------------------------------------------------------------------ */

function verify(dirArg) {
  const dir = resolve(dirArg);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`No manifest.json in ${dir}. Generate the screenshots first.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let errors = 0;
  let checked = 0;
  console.log(`\nVerifying ${manifest.app || 'screenshots'} — ${dir}\n`);
  for (const set of manifest.sets || []) {
    const kindLabel = set.kind === 'app-preview-poster' ? ' · App Preview poster' : '';
    console.log(`${set.locale ? `[${set.locale}] ` : ''}${set.device}  ${set.width}×${set.height}${kindLabel}  ${set.files.length} file(s)`);
    if (set.minShots && set.files.length < set.minShots) {
      console.log(`  ✗ needs at least ${set.minShots} screenshots`); errors++;
    }
    if (set.maxShots && set.files.length > set.maxShots) {
      console.log(`  ✗ accepts at most ${set.maxShots} screenshots`); errors++;
    }
    for (const f of set.files || []) {
      checked++;
      const p = join(dir, f.file);
      const problems = [];
      if (!existsSync(p)) {
        console.log(`  ✗ ${f.file} — missing`); errors++;
        continue;
      }
      const info = imageInfo(readFileSync(p));
      const mb = statSync(p).size / 1024 / 1024;
      if (!info) problems.push('unreadable image');
      else {
        if (info.width !== set.width || info.height !== set.height) {
          problems.push(`is ${info.width}×${info.height}, expected ${set.width}×${set.height}`);
        }
        if (info.alpha) problems.push('has an alpha channel');
      }
      if (mb > (set.maxMB || 8)) problems.push(`${mb.toFixed(1)} MB > ${set.maxMB || 8} MB limit`);
      if (f.sha256 && sha256File(p) !== f.sha256) problems.push('file hash differs from manifest');
      if (problems.length) {
        console.log(`  ✗ ${f.file} — ${problems.join('; ')}`); errors++;
      } else {
        console.log(`  ✓ ${f.file} — ${info.width}×${info.height}, ${mb.toFixed(1)} MB, no alpha`);
      }
    }
    console.log('');
  }
  if (errors) {
    console.log(`${errors} problem${errors === 1 ? '' : 's'} found.`);
    process.exitCode = 1;
  } else {
    console.log(`All ${checked} file${checked === 1 ? '' : 's'} passed.`);
  }
}

function buildPreview(manifest) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sections = manifest.sets.map((set) => {
    const cards = set.files.map((f) => `
      <a class="card" href="${encodeURI(f.file)}" target="_blank">
        <img src="${encodeURI(f.file)}" alt="${esc(f.title || f.file)}" loading="lazy">
        <div class="meta"><strong>${esc(f.title || f.file)}</strong><span>${f.width}×${f.height}</span></div>
      </a>`).join('');
    return `
      <section>
        <header><h2>${esc(set.kind === 'app-preview-poster' ? 'App Preview poster' : (set.store || 'Custom'))} · ${esc(set.device)}${set.locale ? ' · ' + esc(set.locale) : ''}</h2>
        <span>${set.width}×${set.height} · ${set.files.length} shot(s)</span></header>
        <div class="grid">${cards}</div>
      </section>`;
  }).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(manifest.app || 'Store screenshots')} · preview</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0b0d12;color:#e8eaf0;font:15px/1.5 -apple-system,"PingFang SC",sans-serif}
  main{max-width:1500px;margin:0 auto;padding:40px 28px 80px}
  h1{font-size:28px;margin:0 0 6px;letter-spacing:-.02em}
  .sub{color:#8b93a7;margin-bottom:36px}
  section{margin:0 0 44px}
  header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-bottom:1px solid #222733;padding-bottom:10px;margin-bottom:18px}
  h2{font-size:16px;margin:0}
  header span{color:#7d8599;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}
  .card{background:#131722;border:1px solid #242a38;border-radius:14px;padding:10px;text-decoration:none;color:inherit;transition:.15s}
  .card:hover{border-color:#3d4660;transform:translateY(-2px)}
  img{width:100%;height:360px;object-fit:contain;border-radius:8px;background:#080a0f;display:block}
  .meta{display:flex;justify-content:space-between;gap:10px;padding:10px 3px 2px;font-size:12px;color:#7d8599}
  .meta strong{color:#d9ddea;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style></head><body><main>
<h1>${esc(manifest.app || 'Store screenshots')}</h1>
<div class="sub">Generated ${esc(manifest.generatedAt || '')} · click any file to open full size</div>
${sections}
</main></body></html>`;
}

/* ------------------------------------------------------------------ */
/* utilities                                                           */
/* ------------------------------------------------------------------ */

function listPresets() {
  console.log(`\nAvailable presets (${Object.keys(PRESETS).length}); source: presets.json\n`);
  const rows = Object.entries(PRESETS).map(([id, p]) => ({
    id, size: `${p.width}×${p.height}`, device: p.deviceType, store: p.store, label: p.label,
  }));
  const widths = {
    id: Math.max(8, ...rows.map((r) => r.id.length)),
    size: Math.max(9, ...rows.map((r) => r.size.length)),
    device: 7,
    store: Math.max(5, ...rows.map((r) => r.store.length)),
  };
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(widths.id)}  ${r.size.padEnd(widths.size)}  ` +
      `${r.device.padEnd(widths.device)}  ${r.store.padEnd(widths.store)}  ${r.label}`
    );
  }
  console.log(`\nTip: add "orientation": "landscape" to a set to swap width/height.`);
  console.log(`Tip: any custom "[width, height]" size is supported when no preset fits.\n`);
}

function doctor() {
  console.log('\nstore-screenshots doctor\n');
  console.log(`Node:      ${process.version}`);
  console.log(`Platform:  ${process.platform} ${process.arch}`);
  console.log(`Skill:     ${SKILL_DIR}`);
  console.log(`Presets:   ${Object.keys(PRESETS).length}`);
  console.log(`Themes:    ${Object.keys(THEMES).join(', ')}`);

  const browser = findBrowser();
  if (!browser) {
    console.log('\nBrowser:   NOT FOUND');
    console.log('Install Chrome/Chromium/Edge, or set CHROME_PATH.');
    process.exitCode = 1;
    return;
  }
  console.log(`Browser:   ${browser.path}`);

  const tmp = mkdtempSync(join(os.tmpdir(), 'store-shots-doctor-'));
  const html = join(tmp, 'test.html');
  const png = join(tmp, 'test.png');
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:linear-gradient(135deg,#6a11cb,#2575fc)"></body></html>`);
  try {
    renderPng(browser, html, png, 320, 480);
    const info = fileInfo(png);
    if (!info || info.width !== 320 || info.height !== 480) {
      console.log(`\nTest render: FAILED (${info ? `${info.width}×${info.height}` : 'no output'})`);
      process.exitCode = 1;
    } else {
      console.log(`Test render: OK (320×480, ${info.alpha ? 'alpha present' : 'no alpha'})`);
    }
  } catch (e) {
    console.log(`\nTest render: FAILED\n${e.message}`);
    process.exitCode = 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log('\nFor Chinese text, macOS PingFang SC / HarmonyOS Sans / Noto Sans SC are recommended.');
  console.log('All generated files are opaque PNGs; App Store rejects alpha channels.');
  console.log('');
}
