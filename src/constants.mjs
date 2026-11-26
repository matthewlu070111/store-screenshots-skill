/**
 * Project-wide constants and data files shared by the CLI and the library.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PACKAGE = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'));
export const VERSION = PACKAGE.version;

export const PRESETS_FILE = join(ROOT_DIR, 'presets.json');
export const THEMES_FILE = join(ROOT_DIR, 'themes.json');
export const TEMPLATE_FILE = join(ROOT_DIR, 'templates', 'poster.html');

const presetsDocument = JSON.parse(readFileSync(PRESETS_FILE, 'utf8'));
export const PRESETS = presetsDocument.presets;
export const PRESETS_UPDATED = presetsDocument.updated || '';

export const THEMES = JSON.parse(readFileSync(THEMES_FILE, 'utf8'));
export const TEMPLATE = readFileSync(TEMPLATE_FILE, 'utf8');

export const LAYOUTS = new Set(['hero', 'split', 'minimal', 'detail']);
export const FRAMES = new Set(['bezel', 'flat', 'none']);
export const DEFAULT_MAX_MB = 8;
export const MANIFEST_SCHEMA_VERSION = 1;
