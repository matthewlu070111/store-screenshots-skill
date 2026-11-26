# Architecture

This document explains how a config becomes a set of upload-ready PNGs, and
where to change things. It is aimed at contributors; users should start with
[the README](../README.md).

## Goals

1. **Exact output dimensions.** The store slot is the contract.
2. **No runtime dependencies.** Node's standard library plus an installed
   Chromium browser.
3. **Local and auditable.** No network, no uploads, no hidden services.
4. **Testable rules.** Config precedence and validation live in pure modules.

Non-goals: image editing, AI generation, App Preview video encoding, or
reproducing vendor device renders.

## Module map

| Module | Responsibility |
| --- | --- |
| `src/constants.mjs` | Loads `package.json`, `presets.json`, `themes.json` and the poster template once |
| `src/args.mjs` | `parseArgs`, help text |
| `src/config.mjs` | Normalization, precedence merging, locale/theme/layout/spec resolution |
| `src/images.mjs` | PNG/JPEG/WebP/SVG header parsing, data URLs, alpha detection |
| `src/browser.mjs` | Browser discovery, headless render, temp profile cleanup |
| `src/generate.mjs` | Plan building, manifest construction, output writing |
| `src/verify.mjs` | Re-checks a generated directory |
| `src/preview.mjs` | Builds `preview.html` |
| `src/doctor.mjs` | Environment checks and a 320×480 test render |
| `src/presets.mjs` | `--list-presets` output |
| `src/cli.mjs` | Dispatches flags to commands, returns an exit code |
| `src/index.mjs` | Public programmatic API |
| `scripts/generate.mjs` | Shebang entry point; no business logic |
| `templates/poster.html` | Layout, theme variables, device frames, fit-to-copy script |

## Data flow

```text
config.json
   │  parse
   ▼
normalizeSets / resolveLocales / resolveSpec
   │  per set × locale
   ▼
mergeShot (shot > set > top level)
   │  per shot
   ▼
imageData → data URL + dimensions + source SHA-256
   │
   ▼
plan[] { spec, setName, locale, files[] }
   │
   ├── --dry-run ──► printPlan, exit
   │
   ▼
poster.html + JSON payload (temporary file)
   │  headless Chrome, exact window-size, scale 1, sRGB
   ▼
PNG
   │  re-read header, assert exact size, stat size, hash
   ▼
manifest.json + preview.html
   │
   ▼
--verify: dimensions, alpha, max MB, manifest hash
```

The CLI (`src/cli.mjs`) and the library entry (`src/index.mjs`) call the same
functions. The CLI only handles argument dispatch and exit codes.

## Config precedence

For copy and styling fields, the merge order is:

```text
shot > set > top level
```

`mergeShot` implements this for title, subtitle, eyebrow, badge, layout, theme,
colors, logo, brand visibility, background image, device scale, font, detail
settings, island and crease.

Locale values are resolved after the merge: a string is shared; an object is
looked up by the active locale, then `default`, then the first value.

Relative paths (images, logo, background) resolve from the **config file
directory**. `--out` is the exception: it resolves from the current working
directory, like most CLIs.

## Rendering contract

`templates/poster.html` owns all layout decisions. It receives one JSON payload
through a `<script type="application/json">` block (with `<` escaped to
`\u003c`), plus:

- canvas width/height and orientation;
- layout, frame and device type;
- image data URL and intrinsic dimensions;
- theme variables;
- copy strings;
- brand and detail settings.

The template uses `vw`/`vh` units and a fit-to-copy loop that shrinks the title
and subtitle until they clear the device region. This is why copy is not allowed
to contain arbitrary CSS or coordinates.

The browser flags that matter:

| Flag | Reason |
| --- | --- |
| `--headless=new` | Modern headless mode |
| `--force-device-scale-factor=1` | 1 CSS px = 1 output px |
| `--force-color-profile=srgb` | Consistent color |
| `--window-size=W,H` | Exact viewport |
| `--virtual-time-budget=2500` | Lets fonts/layout settle |
| `--run-all-compositor-stages-before-draw` | Avoids partial paints |
| `--user-data-dir=<temp>` | Isolated profile, removed after render |

`--disable-gpu` and `--disable-dev-shm-usage` are set for headless/CI stability.

## Output validation

After every render the generator re-reads the PNG header and asserts:

- the file exists and is non-empty;
- width/height equal the spec;
- the output has no alpha channel (the renderer produces RGB PNGs).

It then records the file size, SHA-256 of the output, and the source filename
and SHA-256 in the manifest. `--verify` repeats the checks later and also
enforces `minShots`, `maxShots` and `maxMB`.

The image reader does not decode pixels; it parses headers. This keeps the tool
dependency-free and fast, at the cost of not detecting corrupt image data beyond
the header.

## Manifest merging

A full run replaces `manifest.json`. A partial run (`--only` or `--locale`)
loads the previous manifest, removes entries whose `name|locale` key is being
regenerated, and keeps the rest. `preview.html` is rebuilt from the merged
manifest. This makes iterative design cheap without lying about the output set.

## Testing strategy

| Layer | What is covered |
| --- | --- |
| Unit (`test/unit`) | Argument parsing, precedence, locale fallback, spec/orientation, image headers, verify errors, preview escaping, plan expansion |
| Integration (`test/integration`) | CLI version/presets/dry-run, real 320×480 render, manifest hash, `--verify` |
| Hygiene (`scripts/check.mjs`) | Required files, JSON validity, package metadata, executable bin, module syntax |

Integration tests skip when no Chromium browser is installed. CI installs/uses
the runner's Chrome, runs the full demo and verifies it.

## Extension points

- **New preset**: add to `presets.json`; no code change needed.
- **New theme**: add to `themes.json`; no code change needed.
- **New layout**: add CSS to `templates/poster.html`, add the name to `LAYOUTS`
  in `src/constants.mjs`, and update docs/tests.
- **New copy field**: add it to `mergeShot`, the template payload, the template,
  the schema, and the config reference.
- **New platform**: usually a preset plus documentation; add a `platform` and
  `store` value so the manifest is self-describing.
- **New output check**: add it to `verify.mjs` and cover it with a unit test.

## Security notes

- The generator never performs network I/O. Assets are embedded as data URLs.
- Copy is HTML-escaped before insertion; `preview.html` carries a CSP.
- `set.file` is a flat `.png` name; locale tags are sanitized.
- Configs are trusted input: they can read local files and choose `outDir`.
- `CHROME_NO_SANDBOX=1` weakens process isolation; see [SECURITY.md](../SECURITY.md).
