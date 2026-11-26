# Examples

## Runnable demo

`demo/demo.config.json` is a complete, self-contained example. The source
screens are synthetic artwork created for this repository (not screenshots of
a real product), and the logo is a placeholder. Run it from the repository
root:

```bash
npm run demo
npm run verify -- examples/demo/out
```

Open `examples/demo/out/preview.html` to inspect the result. Generated output
is ignored by git.

The demo intentionally uses:

- two locales (`en-US`, `zh-CN`);
- iPhone 6.3" (the 2026 required App Store size);
- iPad 13";
- Google Play phone;
- all four layouts (`hero`, `split`, `minimal`, `detail`).

## Start your own config

Copy `template.config.json` next to your own screenshots, then change:

1. `app`, `outDir`, `locales`, and `theme`;
2. every `image` path;
3. the copy for each language.

```bash
cp examples/template.config.json ./store-shots.config.json
# edit paths so they point at your real captures
node /path/to/store-screenshots-skill/scripts/generate.mjs ./store-shots.config.json --dry-run
```

Relative paths in a config resolve from **the config file's directory**, not
from your shell's current directory. That makes configs portable between
machines and CI.

See [`../references/config-reference.md`](../references/config-reference.md) for
every field, or point your editor at
[`../schema/config.schema.json`](../schema/config.schema.json) for autocomplete.
