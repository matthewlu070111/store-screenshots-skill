/**
 * CLI argument parsing. Kept separate from the command implementations so it
 * can be unit-tested without launching a browser or touching the file system.
 */
import { VERSION } from './constants.mjs';


export function parseArgs(argv) {
  const out = { positional: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '-v') {
      out.version = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      out.positional.push(arg);
      continue;
    }

    const equals = arg.indexOf('=');
    const key = equals === -1 ? arg.slice(2) : arg.slice(2, equals);
    const inline = equals === -1 ? undefined : arg.slice(equals + 1);

    const take = () => {
      if (inline !== undefined) {
        if (inline === '') throw new Error(`Option --${key} needs a value.`);
        return inline;
      }
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Option --${key} needs a value.`);
      }
      i++;
      return next;
    };

    switch (key) {
      case 'help':
      case 'h':
        out.help = true;
        break;
      case 'version':
      case 'v':
        out.version = true;
        break;
      case 'doctor':
        out.doctor = true;
        break;
      case 'list-presets':
        out.listPresets = true;
        break;
      case 'verify':
        out.verify = take();
        break;
      case 'out':
        out.out = take();
        break;
      case 'only':
        out.only = take();
        break;
      case 'locale':
        out.locale = take();
        break;
      case 'dry-run':
        out.dryRun = true;
        break;
      case 'keep-html':
        out.keepHtml = true;
        break;
      case 'quiet':
        out.quiet = true;
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }

  if (out.positional.length > 1) {
    throw new Error(`Unexpected argument: ${out.positional[1]}`);
  }
  out.config = out.positional[0];
  return out;
}

export function helpText() {
  return `
store-screenshots ${VERSION} — app store screenshot generator

Usage:
  store-screenshots <config.json> [options]
  store-screenshots --list-presets
  store-screenshots --doctor
  store-screenshots --verify <output-dir>
  store-screenshots --version

Options:
  --out <dir>      Override outDir from the config (relative to CWD)
  --only <text>    Generate only sets whose name/device/preset matches
  --locale <tag>   Generate only this locale (when locales are configured)
  --dry-run        Validate config and images, print the plan, render nothing
  --keep-html      Keep rendered HTML in <out>/.debug-html for inspection
  --quiet          Suppress warnings
  --doctor         Check Node, browser, presets and a test render
  --list-presets   Show all platform size presets
  --verify <dir>   Re-check dimensions, alpha and file sizes of a generated set
  --version        Print the version
  --help           Print this help

Examples:
  store-screenshots examples/demo/demo.config.json --dry-run
  store-screenshots my.config.json --only iphone --locale zh-CN
  store-screenshots --verify ./store-shots

Browser:
  Auto-detects Chrome / Chromium / Edge / Brave. Override with CHROME_PATH.
  Set CHROME_NO_SANDBOX=1 only in trusted containers running as root.
  Set DEBUG=1 to print stack traces.

Docs:
  https://github.com/matthewlu070111/store-screenshots#readme
`;
}
