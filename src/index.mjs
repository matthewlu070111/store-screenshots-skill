/**
 * Programmatic API.
 *
 * Example:
 *   import { generate, verify } from 'store-screenshots';
 *   await generate({ configPath: './store-shots.config.json' });
 *   verify('./store-shots');
 */
export { generate, buildPlan, printPlan } from './generate.mjs';
export { verify } from './verify.mjs';
export { buildPreview } from './preview.mjs';
export { findBrowser, renderPng } from './browser.mjs';
export { imageData, imageInfo, fileInfo } from './images.mjs';
export {
  resolveOutDir, normalizeSets, normalizeShots, resolveSpec, mergeShot, localize,
  resolveLocales, resolveTheme, resolveLayout, resolveFrame, resolveFont,
} from './config.mjs';
export { PRESETS, PRESETS_UPDATED, THEMES, VERSION } from './constants.mjs';
