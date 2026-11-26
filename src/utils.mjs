/**
 * Small, dependency-free helpers shared across modules.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

/** Turn an arbitrary group name into a safe, lowercase file-name prefix. */
export function sanitize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Locale tags are used as directory names, so restrict them to a safe subset. */
export function safeLocale(locale) {
  return String(locale).replace(/[^A-Za-z0-9_-]+/g, '-');
}

export function relPath(from, to) {
  return relative(from, to).split('\\').join('/');
}

export function shortPath(path, cwd = process.cwd()) {
  return path.startsWith(cwd) ? path.slice(cwd.length + 1) : path;
}

export function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
