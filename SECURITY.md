# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | ✅ |
| < 1.0 | ❌ |

Store Screenshots is a local CLI with no runtime dependencies. Security fixes are
released as patch versions.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private vulnerability
reporting:

1. Go to <https://github.com/matthewlu070111/store-screenshots-skill/security/advisories/new>.
2. Describe the issue, the affected version, and the smallest reproduction you
   can share.
3. If private reporting is unavailable, contact the maintainer through GitHub
   ([@matthewlu070111](https://github.com/matthewlu070111)) and ask for a private
   channel before sharing details.

You can expect an initial response within a few days. This is a volunteer
project, so please allow reasonable time before public disclosure. Credit will
be given in the advisory and changelog unless you ask otherwise.

## Scope

In scope:

- the CLI (`scripts/generate.mjs`, `src/**`);
- config parsing and path handling;
- HTML generation and escaping of titles/subtitles/badges;
- the headless-browser invocation and its flags;
- the `manifest.json` / `preview.html` output;
- the JSON Schema and documentation examples.

Out of scope:

- vulnerabilities in Chrome/Chromium/Edge or the operating system;
- malicious screenshots or SVGs you intentionally feed to a trusted local tool;
- store-side review decisions or platform policy changes;
- generated images being rejected because store requirements changed.

## Threat model

Store Screenshots is designed to run **trusted configs and trusted local assets**
on a trusted machine.

- There is no network access in the generator. Images and logos are embedded as
  `data:` URLs; the template does not load remote resources.
- Copy fields are HTML-escaped before insertion. `preview.html` includes a
  restrictive Content Security Policy.
- `set.file` is restricted to a flat `.png` filename; locale tags are restricted
  to `[A-Za-z0-9_-]`; output paths are built from the configured `outDir`.
- A config can still read any local image path and write output wherever
  `outDir` points. Do not run configs from untrusted sources.
- `CHROME_NO_SANDBOX=1` disables the browser sandbox. Use it only inside a
  trusted container or CI runner that already isolates the process; never on a
  normal workstation with untrusted inputs.

## Handling secrets

Do not put credentials, signing keys, private screenshots or customer data in a
config, an example, an issue, or a PR. If you accidentally commit a secret,
rotate it first, then ask for history removal.

## Dependency policy

The project intentionally has zero runtime and development dependencies. A pull
request that adds a dependency must explain why the same result cannot be
achieved with Node's standard library, and will be reviewed carefully.
