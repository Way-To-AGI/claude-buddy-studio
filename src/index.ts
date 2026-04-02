#!/usr/bin/env node

import chalk from "chalk";

import { parseArgs } from "./cli/args.js";
import {
  runApply,
  runBackends,
  runCurrent,
  runDoctor,
  runInteractiveApply,
  runPreview,
  runRehatch,
  runRestore,
} from "./cli/commands.js";

function printHelp(): void {
  console.log(`
buddy-studio

Usage:
  buddy-studio
  buddy-studio apply [flags]
  buddy-studio preview [flags]
  buddy-studio current
  buddy-studio restore
  buddy-studio rehatch
  buddy-studio doctor [--json]
  buddy-studio backends

Flags:
  -s, --species <name>
  -r, --rarity <name>
  -e, --eye <char>
  -t, --hat <name>
  --shiny
  --peak <stat>
  --dump <stat>
  -n, --name <name>
  -p, --personality <text>
  --backend <config-userid|binary-salt-patch>
  -y, --yes
  --silent
  --json
  --no-hook

说明:
  默认进入中文交互式向导
  --hat 可省略；省略时表示不限制帽子
`);
}

async function main() {
  const parsed = parseArgs(process.argv);
  switch (parsed.command) {
    case undefined:
      await runInteractiveApply(parsed);
      break;
    case "apply":
      await runApply(parsed);
      break;
    case "preview":
      await runPreview(parsed);
      break;
    case "current":
      await runCurrent();
      break;
    case "restore":
      await runRestore();
      break;
    case "rehatch":
      await runRehatch();
      break;
    case "doctor":
      await runDoctor(parsed);
      break;
    case "backends":
      await runBackends();
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      throw new Error(`未知命令: ${parsed.command}`);
  }
}

main().catch((error: Error) => {
  console.error(chalk.red(`错误: ${error.message}`));
  process.exit(1);
});
