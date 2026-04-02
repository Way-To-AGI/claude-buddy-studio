import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { execSync } from "node:child_process";

import { ORIGINAL_SALT } from "../../core/constants.js";
import type { ClaudeBinaryKind } from "../../core/types.js";

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

function isMachO(buffer: Buffer): boolean {
  const magic = buffer.subarray(0, 4);
  const known = [
    [0xfe, 0xed, 0xfa, 0xce],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xca, 0xfe, 0xba, 0xbe],
    [0xca, 0xfe, 0xba, 0xbf],
  ];
  return known.some((candidate) => candidate.every((byte, index) => magic[index] === byte));
}

function isElf(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  );
}

export function detectBinaryFileKind(binaryPath: string, buffer = readFileSync(binaryPath)): ClaudeBinaryKind {
  if (/\.(?:[cm]?js)$/i.test(binaryPath)) {
    return "node-js";
  }
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return "shell-script";
  }
  if (isMachO(buffer) || isElf(buffer)) {
    return "native-executable";
  }
  return "unknown";
}

export function inspectBinarySalt(
  binaryPath: string,
  desiredSalt?: string,
): {
  originalSaltOccurrences: number;
  currentSalt?: string;
  patchable: boolean;
  patchableReason: string;
  fileKind: ClaudeBinaryKind;
} {
  const buffer = readFileSync(binaryPath);
  const fileKind = detectBinaryFileKind(binaryPath, buffer);
  if (fileKind === "shell-script") {
    return {
      originalSaltOccurrences: 0,
      patchable: false,
      patchableReason: "launcher/shell script 不是可直接 patch 的目标文件",
      fileKind,
    };
  }
  const originalMatches = findAllOccurrences(buffer, ORIGINAL_SALT);
  if (originalMatches.length > 0) {
    return {
      originalSaltOccurrences: originalMatches.length,
      currentSalt: ORIGINAL_SALT,
      patchable: true,
      patchableReason: `检测到 ${fileKind} 目标文件，且包含 ${originalMatches.length} 处原始 salt`,
      fileKind,
    };
  }
  if (desiredSalt) {
    const desiredMatches = findAllOccurrences(buffer, desiredSalt);
    if (desiredMatches.length > 0) {
      return {
        originalSaltOccurrences: 0,
        currentSalt: desiredSalt,
        patchable: true,
        patchableReason: `检测到 ${fileKind} 目标文件，且已经包含已应用的 salt`,
        fileKind,
      };
    }
  }
  return {
    originalSaltOccurrences: 0,
    patchable: false,
    patchableReason: `${fileKind} 目标文件中未检测到可 patch 的 salt`,
    fileKind,
  };
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
