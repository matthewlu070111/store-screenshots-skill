#!/usr/bin/env node
/**
 * store-screenshots — CLI entry point.
 *
 * The implementation lives in ../src so it can be imported and tested without
 * executing the CLI. This file only wires process arguments to the dispatcher.
 */
import { runCli } from '../src/cli.mjs';

process.exitCode = await runCli(process.argv.slice(2));
