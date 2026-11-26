# Contributing

Thanks for taking the time to improve Store Screenshots. This project is a small, dependency-free CLI; the review bar is mostly about **correct output** and **honest documentation**.

## Code of Conduct

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Please be direct, kind and specific.

## Development setup

Requirements:

- Node.js **18.17+** (the test suite uses `node:test`)
- Chrome, Chromium, Edge, Brave or Arc (or set `CHROME_PATH`)
- Git

There is **no `npm install` step** — the project has no dependencies. Clone the repo and run:

```bash
npm run doctor
npm test
npm run check
```

If you work inside a container that runs as root, you may need `CHROME_NO_SANDBOX=1` for local renders. Do not put that in committed code or CI defaults.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm test` | Unit + integration tests |
| `npm run test:unit` | Fast tests; no browser |
| `npm run test:integration` | One real 320×480 render + verify |
| `npm run check` | JSON, required files, package metadata, syntax |
| `npm run demo` | Generate the bundled 12-image demo |
| `npm run verify -- examples/demo/out` | Verify the demo output |
| `npm run build:demo-assets` | Rebuild synthetic demo source screens |

Integration tests are skipped automatically when no Chromium-based browser is available. They are not optional in CI.

## Where things live

| Path | Purpose |
| --- | --- |
| `src/args.mjs` | CLI parsing and help text |
| `src/config.mjs` | Config normalization, precedence, locale/theme/spec resolution |
| `src/generate.mjs` | Plan building and the generation pipeline |
| `src/images.mjs` | Header-only image sniffing and data URLs |
| `src/browser.mjs` | Browser discovery and headless rendering |
| `src/verify.mjs` | Post-generation validation |
| `src/preview.mjs` | `preview.html` builder |
| `scripts/generate.mjs` | Thin CLI entry point |
| `templates/poster.html` | HTML/CSS layout, theme variables and device frames |
| `presets.json` | Platform sizes and per-store limits |
| `themes.json` | Color themes |
| `references/` | Platform specs, config reference, design guide |
| `test/` | `node:test` unit and integration tests |

## Changing presets

1. Edit `presets.json`. Keep `label`, `platform`, `store`, `width`, `height`, `deviceType`, `minShots`, `maxShots`, `maxMB` and `notes`.
2. Add or update the row in both READMEs' preset table when it is a headline size.
3. Update `references/platform-specs.md` if the requirement changed.
4. Add a unit assertion in `test/unit/config.test.mjs` for critical sizes.
5. Run `npm run check` (it asserts the preset count and the required iPhone size).

Preset IDs are public API. Prefer adding a new ID over silently changing the meaning of an existing one.

## Changing themes

1. Add the theme to `themes.json` with all 13 keys (`mode`, `bg1`, `bg2`, `orb1-3`, `ink`, `muted`, `accent`, `accent2`, `frame`, `glow`, `scrim`).
2. Add it to the theme table in `references/config-reference.md`.
3. Mention it in both README feature lists only if the count changes.
4. Check contrast on a light and a dark screenshot; the template does not auto-correct color.

## Changing layouts

Layouts are CSS classes in `templates/poster.html` plus a name in `LAYOUTS` in `src/constants.mjs`.

- Keep the copy/device safe area in mind for both portrait and landscape.
- `detail` must continue to honor `detailZoom` (source magnification) and `detailFocus` (0–1).
- Add a test for the config-level validation; visual changes should be checked by generating the demo and inspecting all four layouts.
- Update `references/config-reference.md`, `references/design-guide.md` and both READMEs.

## Changing the config schema

`config.schema.json` is the editor-facing contract. When you add a field:

1. Add it to `$defs/shot` and `$defs/set` (and the top level if it is a default).
2. Support it in `mergeShot` or the relevant resolver.
3. Document it in `references/config-reference.md`.
4. Add a unit test for precedence or validation.

Run `npm run check`; it parses every JSON file but does not validate against the schema (there is no schema library dependency).

## Demo assets

`examples/demo` is a **synthetic** demo, not a real product:

- Source HTML/CSS lives in `examples/demo/source/`.
- Rendered source screens live in `examples/demo/assets/screens/`.
- `scripts/build-demo-assets.mjs` reproduces the source screens.
- `examples/demo/demo.config.json` generates the output; output is gitignored.

Do not add screenshots of a real user's app, personal data, customer names, or anything you do not have the right to publish. If you need a different demo, keep it clearly labelled as synthetic.

## Tests

- Add a unit test for pure logic (config, image headers, verification, preview).
- Add an integration test when behavior crosses the CLI/browser boundary.
- Tests must not depend on the generated `examples/demo/out` directory; create temp dirs.
- Do not weaken tests to make a flaky browser pass. If a browser is unavailable, use the existing skip pattern.

## Commit and PR style

- Use short, imperative commit subjects, e.g. `fix: clamp detailFocus to 0–1` or `docs: add AppGallery tablet note`.
- Keep PRs focused. One preset change plus unrelated refactors is hard to review.
- Fill in the PR template and include the exact commands you ran.
- Note any visual change with a before/after image in the PR description.
- Do not commit generated output, `.debug-html`, `.DS_Store`, or credentials.

## Documentation

- `README.md` is English; `README.zh-CN.md` must stay in sync for user-facing changes.
- The GitHub social preview is `docs/images/social-preview.png` (1280×640). Update it when the tagline or hero screenshots change.
- `SKILL.md` is the agent-facing workflow; keep its commands and file tree accurate.
- Platform claims must be checkable. Link the official source in `references/platform-specs.md` rather than asserting from memory.
- Never invent a rating, download count, award or platform endorsement in examples or docs.

## Security

Please do not open a public issue for a vulnerability. See [`SECURITY.md`](SECURITY.md).

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
