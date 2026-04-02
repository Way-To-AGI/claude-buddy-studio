import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { execSync } from "node:child_process";

import { ORIGINAL_SALT } from "../../core/constants.js";

function findAllOccurrences(buffer: Buffer, target: string): number[] {
  const needle = Buffer.from(target, "utf8");
  const matches: number[] = [];
  let position = 0;
  while (position < buffer.length) {
    const index = buffer.indexOf(needle, position);
    if (index === -1) {
      break;
    }
    matches.push(index);
    position = index + 1;
  }
  return matches;
}

export function inspectBinarySalt(
  binaryPath: string,
  desiredSalt?: string,
): { originalSaltOccurrences: number; currentSalt?: string; patchable: boolean } {
  const buffer = readFileSync(binaryPath);
  const originalMatches = findAllOccurrences(buffer, ORIGINAL_SALT);
  if (originalMatches.length > 0) {
    return {
      originalSaltOccurrences: originalMatches.length,
      currentSalt: ORIGINAL_SALT,
      patchable: true,
    };
  }
  if (desiredSalt) {
    const desiredMatches = findAllOccurrences(buffer, desiredSalt);
    if (desiredMatches.length > 0) {
      return {
        originalSaltOccurrences: 0,
        currentSalt: desiredSalt,
        patchable: true,
      };
    }
  }
  return { originalSaltOccurrences: 0, patchable: false };
}

export function patchBinarySalt(
  binaryPath: string,
  oldSalt: string,
  newSalt: string,
): { backupPath: string; replacements: number } {
  if (oldSalt.length !== newSalt.length) {
    throw new Error("binary salt patch requires equal-length salts.");
  }
  const buffer = readFileSync(binaryPath);
  const matches = findAllOccurrences(buffer, oldSalt);
  if (matches.length === 0) {
    throw new Error(`Could not find salt ${oldSalt} in ${binaryPath}.`);
  }

  const backupPath = `${binaryPath}.buddystudio.bak`;
  if (!existsSync(backupPath)) {
    copyFileSync(binaryPath, backupPath);
  }

  const replacement = Buffer.from(newSalt, "utf8");
  for (const match of matches) {
    replacement.copy(buffer, match);
  }

  const tempPath = `${binaryPath}.tmp-${Date.now()}`;
  writeFileSync(tempPath, buffer);
  try {
    renameSync(tempPath, binaryPath);
  } catch {
    try {
      unlinkSync(binaryPath);
    } catch {
      // ignore
    }
    renameSync(tempPath, binaryPath);
  }

  if (process.platform === "darwin") {
    try {
      execSync(`codesign --force --sign - "${binaryPath}"`, { stdio: "ignore" });
    } catch {
      // ignore ad-hoc signing failures; surfaced later if launch breaks
    }
  }

  return { backupPath, replacements: matches.length };
}

export function restoreBinary(binaryPath: string, backupPath?: string): string {
  const source = backupPath ?? `${binaryPath}.buddystudio.bak`;
  if (!existsSync(source)) {
    throw new Error(`Binary backup not found: ${source}`);
  }
  copyFileSync(source, binaryPath);
  return source;
}

export function isClaudeRunning(binaryPath: string): boolean {
  try {
    const processName = basename(binaryPath);
    const output = execSync(`pgrep -f "${processName}" || true`, { encoding: "utf8" });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}
