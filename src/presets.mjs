/**
 * Human-readable preset listing for `--list-presets`.
 */
import { PRESETS, PRESETS_UPDATED } from './constants.mjs';

export function listPresets(log = console.log) {
  log(`\nAvailable presets (${Object.keys(PRESETS).length}); source: presets.json${PRESETS_UPDATED ? ` (updated ${PRESETS_UPDATED})` : ''}\n`);

  const rows = Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    size: `${preset.width}×${preset.height}`,
    device: preset.deviceType,
    store: preset.store,
    label: preset.label,
  }));

  const widths = {
    id: Math.max(8, ...rows.map((row) => row.id.length)),
    size: Math.max(9, ...rows.map((row) => row.size.length)),
    device: 7,
    store: Math.max(5, ...rows.map((row) => row.store.length)),
  };

  for (const row of rows) {
    log(
      `${row.id.padEnd(widths.id)}  ${row.size.padEnd(widths.size)}  ` +
      `${row.device.padEnd(widths.device)}  ${row.store.padEnd(widths.store)}  ${row.label}`,
    );
  }

  log('\nTip: add "orientation": "landscape" to a set to swap width/height.');
  log('Tip: any custom "[width, height]" size is supported when no preset fits.\n');
}
