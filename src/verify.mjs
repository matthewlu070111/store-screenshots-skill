/**
 * Post-generation verification: exact dimensions, alpha channel, file size and
 * manifest hash. This is the last line of defence before uploading to a store.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { imageInfo } from './images.mjs';
import { sha256File } from './utils.mjs';

export function verify(dirArg, { log = console.log } = {}) {
  const dir = resolve(dirArg);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`No manifest.json in ${dir}. Generate the screenshots first.`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let errors = 0;
  let checked = 0;

  log(`\nVerifying ${manifest.app || 'screenshots'} — ${dir}\n`);
  for (const set of manifest.sets || []) {
    const kindLabel = set.kind === 'app-preview-poster' ? ' · App Preview poster' : '';
    log(
      `${set.locale ? `[${set.locale}] ` : ''}${set.device}  ${set.width}×${set.height}${kindLabel}  ` +
      `${(set.files || []).length} file(s)`,
    );
    if (set.minShots && (set.files || []).length < set.minShots) {
      log(`  ✗ needs at least ${set.minShots} screenshots`);
      errors++;
    }
    if (set.maxShots && (set.files || []).length > set.maxShots) {
      log(`  ✗ accepts at most ${set.maxShots} screenshots`);
      errors++;
    }

    for (const file of set.files || []) {
      checked++;
      const path = join(dir, file.file);
      const problems = [];
      if (!existsSync(path)) {
        log(`  ✗ ${file.file} — missing`);
        errors++;
        continue;
      }

      const info = imageInfo(readFileSync(path));
      const megabytes = statSync(path).size / 1024 / 1024;
      if (!info) {
        problems.push('unreadable image');
      } else {
        if (info.width !== set.width || info.height !== set.height) {
          problems.push(`is ${info.width}×${info.height}, expected ${set.width}×${set.height}`);
        }
        if (info.alpha) problems.push('has an alpha channel');
      }
      if (megabytes > (set.maxMB || 8)) {
        problems.push(`${megabytes.toFixed(1)} MB > ${set.maxMB || 8} MB limit`);
      }
      if (file.sha256 && sha256File(path) !== file.sha256) {
        problems.push('file hash differs from manifest');
      }

      if (problems.length) {
        log(`  ✗ ${file.file} — ${problems.join('; ')}`);
        errors++;
      } else {
        log(`  ✓ ${file.file} — ${info.width}×${info.height}, ${megabytes.toFixed(1)} MB, no alpha`);
      }
    }
    log('');
  }

  if (errors) {
    log(`${errors} problem${errors === 1 ? '' : 's'} found.`);
  } else {
    log(`All ${checked} file${checked === 1 ? '' : 's'} passed.`);
  }
  return { errors, checked };
}
