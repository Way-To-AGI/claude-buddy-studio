import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function timestampTag(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function createBackup(filePath: string, suffix: string): string {
  const backupPath = `${filePath}.${suffix}.${timestampTag()}`;
  copyFileSync(filePath, backupPath);
  return backupPath;
}

export function atomicWrite(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  writeFileSync(tempPath, contents, "utf8");
  renameSync(tempPath, filePath);
}

export function fileExists(filePath: string | undefined): filePath is string {
  return Boolean(filePath && existsSync(filePath));
}
