import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
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

export function writeFakeNativeBinary(binaryPath: string, salt = ORIGINAL_SALT): string {
  mkdirSync(dirname(binaryPath), { recursive: true });
  const header = Buffer.from([0xcf, 0xfa, 0xed, 0xfe]);
  const body = Buffer.from(
    [
      "NATIVE",
      salt,
      "BUDDY",
      salt,
      "TARGET",
      salt,
    ].join("\x00"),
    "utf8",
  );
  writeFileSync(binaryPath, Buffer.concat([header, body]));
  return binaryPath;
}

export function writeFakeBrewLauncher(homeDir: string, salt = ORIGINAL_SALT): {
  launcherPath: string;
  resolvedPath: string;
} {
  const resolvedPath = join(
    homeDir,
    "opt",
    "homebrew",
    "lib",
    "node_modules",
    "@anthropic-ai",
    "claude-code",
    "cli.js",
  );
  const launcherPath = join(homeDir, "opt", "homebrew", "bin", "claude");
  writeFakeBinary(resolvedPath, salt);
  mkdirSync(dirname(launcherPath), { recursive: true });
  symlinkSync(resolvedPath, launcherPath);
  return { launcherPath, resolvedPath };
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
