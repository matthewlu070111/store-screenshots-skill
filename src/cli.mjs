/**
 * CLI dispatcher. Returns an exit code instead of calling process.exit() so it
 * can be exercised from tests and embedded in other tools.
 */
import { helpText, parseArgs } from './args.mjs';
import { VERSION } from './constants.mjs';
import { doctor } from './doctor.mjs';
import { generate } from './generate.mjs';
import { listPresets } from './presets.mjs';
import { verify } from './verify.mjs';

export async function runCli(argv, { cwd = process.cwd(), env = process.env } = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }

  try {
    if (args.help) {
      console.log(helpText());
      return 0;
    }
    if (args.version) {
      console.log(VERSION);
      return 0;
    }
    if (args.doctor) return doctor({ env });
    if (args.listPresets) {
      listPresets();
      return 0;
    }
    if (args.verify !== undefined) {
      const { errors } = verify(args.verify);
      return errors ? 1 : 0;
    }
    if (!args.config) {
      console.log(helpText());
      throw new Error('Missing config file. Pass a JSON config path.');
    }

    await generate({ configPath: args.config, args, cwd, env });
    return 0;
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (env.DEBUG) console.error(error.stack);
    return 1;
  }
}
