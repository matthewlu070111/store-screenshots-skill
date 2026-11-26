# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-26

### Added

- Zero-dependency CLI that renders App Store, Google Play and AppGallery
  screenshots from real app captures with headless Chrome/Chromium/Edge.
- 20 platform presets, including iPhone 6.3"/6.9", iPhone Duo outer/inner,
  App Preview poster sizes, iPad 13", Play phone/tablet and AppGallery
  phone/tablet, plus arbitrary custom sizes.
- Four layouts (`hero`, `split`, `minimal`, `detail`) and eight themes with
  per-field color overrides.
- Locale maps with `default` fallback, per-locale output directories and
  automatic RTL layout for Arabic, Hebrew, Persian and Urdu.
- Logo, app-name, eyebrow, subtitle, badge, background-image and device-frame
  controls.
- Exact-size RGB PNG output, file-size warnings, `manifest.json` with SHA-256
  and source hashes, and a local `preview.html` gallery.
- `--dry-run`, `--doctor`, `--verify`, `--only`, `--locale`, `--out`,
  `--keep-html`, `--quiet`, `--version` and `--help`.
- Incremental manifest merging for partial reruns.
- JSON Schema for editor autocomplete and a self-contained synthetic demo with
  reproducible source assets.
- Unit and integration test suites using `node:test`, repository hygiene checks,
  and a GitHub Actions CI workflow.
- Bilingual documentation (English and Simplified Chinese), contribution guide,
  security policy, code of conduct and issue/PR templates.

### Changed

- The original single-file generator was split into testable modules under
  `src/`, with `scripts/generate.mjs` as a thin CLI entry point.
- `--list-presets` now reports the preset data revision date.
- `--verify` returns a non-zero exit code instead of mutating a global flag.

### Fixed

- WebP lossless images no longer report a false alpha channel.
- The invalid-layout error now lists `detail` as an option.
- The config reference's multi-line JSON example is valid JSON.

[1.0.0]: https://github.com/matthewlu070111/store-screenshots-skill/releases/tag/v1.0.0
