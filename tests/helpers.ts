import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { ORIGINAL_SALT } from "../src/core/constants.js";

export function createTempHome(prefix = "buddy-studio-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function writeClaudeConfigFile(homeDir: string, config: Record<string, unknown>): string {
  const target = join(homeDir, ".claude.json");
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return target;
}

export function writeFakeBinary(binaryPath: string, salt = ORIGINAL_SALT): string {
  mkdirSync(dirname(binaryPath), { recursive: true });
  const contents = [
    "#!/usr/bin/env node",
    `const saltA = "${salt}";`,
    `const saltB = "${salt}";`,
    `const saltC = "${salt}";`,
  ].join("\n");
  writeFileSync(binaryPath, contents, "utf8");
  return binaryPath;
}

export async function withTempProcessEnv<T>(
  env: Record<string, string | undefined>,
  callback: () => Promise<T> | T,
): Promise<T> {
  const snapshot = { ...process.env };
  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    return await callback();
  } finally {
    process.env = snapshot;
  }
}
