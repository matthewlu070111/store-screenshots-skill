/**
 * Config normalization and resolution.
 *
 * This module is intentionally free of CLI side effects: every function takes
 * explicit inputs and returns a value, which keeps the rules testable and
 * makes the precedence order (shot > set > top level) easy to audit.
 */
import { resolve } from 'node:path';
import { PRESETS, THEMES, LAYOUTS, FRAMES, DEFAULT_MAX_MB } from './constants.mjs';

const pick = (...values) => values.find((value) => value !== undefined && value !== null);

export function resolveOutDir(cfg, baseDir, { out, cwd = process.cwd() } = {}) {
  if (out) return resolve(cwd, out);
  return resolve(baseDir, cfg.outDir || 'store-screenshots');
}

export function normalizeSets(cfg) {
  if (Array.isArray(cfg.sets)) return cfg.sets;
  if (cfg.sets && typeof cfg.sets === 'object') return [cfg.sets];
  if (cfg.device || cfg.preset || cfg.size || cfg.shots) {
    const {
      app, outDir, theme, layout, frame, colors, logo, showBrand, font,
      filePrefix, $schema, ...rest
    } = cfg;
    return [rest];
  }
  return [];
}

export function normalizeShots(set) {
  const raw = set.shots ?? (set.image ? [set] : []);
  return raw.map((shot) => (typeof shot === 'string' ? { image: shot } : shot));
}

export function resolveSpec(set, cfg = {}, { presets = PRESETS } = {}) {
  const key = set.preset || set.device;
  let spec;

  if (key) {
    if (!presets[key]) {
      throw new Error(`Unknown device preset "${key}". Run --list-presets to see available IDs.`);
    }
    spec = { ...presets[key], id: key, isPreset: true };
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
      kind: 'screenshot',
      minShots: 1,
      maxShots: 10,
      maxMB: DEFAULT_MAX_MB,
    };
  }

  const orientation = set.orientation || cfg.orientation;
  if (orientation && !['portrait', 'landscape'].includes(orientation)) {
    throw new Error(`Invalid orientation "${orientation}". Use portrait or landscape.`);
  }
  // Presets describe a physical device, so orientation swaps the canvas.
  // Custom sizes are already the exact target size and are never swapped.
  if (spec.isPreset) {
    if (orientation === 'landscape' && spec.width < spec.height) {
      [spec.width, spec.height] = [spec.height, spec.width];
    } else if (orientation === 'portrait' && spec.width > spec.height) {
      [spec.width, spec.height] = [spec.height, spec.width];
    }
  }
  spec.width = Math.round(spec.width);
  spec.height = Math.round(spec.height);
  return spec;
}

/** Merge copy, styling and asset paths for one shot using shot > set > config. */
export function mergeShot(cfg, set, shot, locale) {
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

/** Resolve a string or a locale map to the value for the current locale. */
export function localize(value, locale) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (locale && value[locale] !== undefined) return String(value[locale]);
    if (value.default !== undefined) return String(value.default);
    const first = Object.values(value)[0];
    return first === undefined ? '' : String(first);
  }
  return value === undefined || value === null ? '' : String(value);
}

export function resolveLocales(set, cfg) {
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

export function resolveTheme(name = 'aurora', colors = {}) {
  let base;
  if (typeof name === 'object' && name) {
    base = { ...THEMES.aurora, ...name };
  } else if (THEMES[name]) {
    base = { ...THEMES[name] };
  } else {
    throw new Error(
      `Unknown theme "${name}". Available: ${Object.keys(THEMES).join(', ')}. ` +
      'You can also pass a theme object or use "colors" overrides.',
    );
  }
  return { ...base, ...colors };
}

export function resolveLayout(layout, spec) {
  if (!layout) return spec.width > spec.height ? 'split' : 'hero';
  if (!LAYOUTS.has(layout)) {
    throw new Error(`Unknown layout "${layout}". Choose hero, split, minimal or detail.`);
  }
  return layout;
}

export function resolveFrame(frame) {
  if (frame === true) return 'bezel';
  if (frame === false) return 'none';
  if (!FRAMES.has(frame)) {
    throw new Error(`Unknown frame "${frame}". Choose bezel, flat or none.`);
  }
  return frame;
}

export function resolveFont(font) {
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
