import type { BackendKind, Eye, Hat, Rarity, Species, StatName } from "../core/types.js";

export interface ParsedArgs {
  command?: string;
  flags: {
    species?: Species;
    rarity?: Rarity;
    eye?: Eye;
    hat?: Hat;
    shiny?: boolean;
    peak?: StatName;
    dump?: StatName;
    name?: string;
    personality?: string;
    backend?: BackendKind;
    yes?: boolean;
    silent?: boolean;
    json?: boolean;
    noHook?: boolean;
  };
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: ParsedArgs["flags"] = {};
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }
    switch (arg) {
      case "--species":
      case "-s":
        flags.species = args[++index] as Species;
        break;
      case "--rarity":
      case "-r":
        flags.rarity = args[++index] as Rarity;
        break;
      case "--eye":
      case "-e":
        flags.eye = args[++index] as Eye;
        break;
      case "--hat":
      case "-t":
        flags.hat = args[++index] as Hat;
        break;
      case "--shiny":
        flags.shiny = true;
        break;
      case "--peak":
        flags.peak = args[++index] as StatName;
        break;
      case "--dump":
        flags.dump = args[++index] as StatName;
        break;
      case "--name":
      case "-n":
        flags.name = args[++index];
        break;
      case "--personality":
      case "-p":
        flags.personality = args[++index];
        break;
      case "--backend":
        flags.backend = args[++index] as BackendKind;
        break;
      case "--yes":
      case "-y":
        flags.yes = true;
        break;
      case "--silent":
        flags.silent = true;
        break;
      case "--json":
        flags.json = true;
        break;
      case "--no-hook":
        flags.noHook = true;
        break;
      default:
        if (arg.startsWith("-")) {
          continue;
        }
        positional.push(arg);
        break;
    }
  }
  return {
    command: positional[0],
    flags,
  };
}
