import { existsSync, lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";

import type { ClaudeInstallMethod, HashMode } from "../../core/types.js";

export interface ClaudePathOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ClaudeInstallCandidate {
  source:
    | "env"
    | "which"
    | "native-default"
    | "brew-homebrew"
    | "brew-usr-local"
    | "local-bin";
  launcherPath: string;
  resolvedPath: string;
  installMethod: ClaudeInstallMethod;
  hashMode: HashMode;
  evidence: string[];
}

export function resolveHomeDir(options: ClaudePathOptions = {}): string {
  return options.homeDir ?? homedir();
}

export function claudeConfigCandidates(options: ClaudePathOptions = {}): string[] {
  const homeDir = resolveHomeDir(options);
  return [join(homeDir, ".claude.json"), join(homeDir, ".claude", ".config.json")];
}

export function findClaudeConfigPath(options: ClaudePathOptions = {}): string | undefined {
  return claudeConfigCandidates(options).find((candidate) => existsSync(candidate));
}

export function claudeSettingsPath(options: ClaudePathOptions = {}): string {
  return join(resolveHomeDir(options), ".claude", "settings.json");
}

export function toolStatePath(options: ClaudePathOptions = {}): string {
  return join(resolveHomeDir(options), ".buddy-studio.json");
}

function resolveExecutable(pathValue: string): string {
  try {
    return realpathSync(pathValue);
  } catch {
    return pathValue;
  }
}

function envOverrideCandidate(options: ClaudePathOptions = {}): string | undefined {
  const env = options.env ?? process.env;
  if (env.CLAUDE_BINARY && existsSync(env.CLAUDE_BINARY)) {
    return env.CLAUDE_BINARY;
  }
  return undefined;
}

function whichClaudeCandidate(): string | undefined {
  try {
    const candidate = execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function macOSCandidatePaths(options: ClaudePathOptions = {}): Array<{
  source: ClaudeInstallCandidate["source"];
  path: string;
}> {
  const homeDir = resolveHomeDir(options);
  return [
    { source: "native-default", path: join(homeDir, ".claude", "local", "claude") },
    { source: "brew-homebrew", path: "/opt/homebrew/bin/claude" },
    { source: "brew-usr-local", path: "/usr/local/bin/claude" },
    { source: "local-bin", path: join(homeDir, ".local", "bin", "claude") },
  ];
}

function uniqueExistingPaths(paths: Array<{ source: ClaudeInstallCandidate["source"]; path?: string }>) {
  const seen = new Set<string>();
  const results: Array<{ source: ClaudeInstallCandidate["source"]; path: string }> = [];
  for (const item of paths) {
    if (!item.path || !existsSync(item.path)) {
      continue;
    }
    if (seen.has(item.path)) {
      continue;
    }
    seen.add(item.path);
    results.push({ source: item.source, path: item.path });
  }
  return results;
}

function isNodeResolvedPath(resolvedPath: string): boolean {
  return (
    /\.(?:[cm]?js)$/i.test(resolvedPath) ||
    resolvedPath.endsWith("/cli.js") ||
    resolvedPath.includes("/node_modules/@anthropic-ai/claude-code/")
  );
}

function isNativeLauncherPath(launcherPath: string, resolvedPath: string): boolean {
  return (
    launcherPath.includes("/.claude/local/claude") ||
    resolvedPath.includes("/.claude/local/claude") ||
    resolvedPath.includes("/.claude/local/")
  );
}

function isBrewShimPath(launcherPath: string): boolean {
  return /(^|\/)(opt\/homebrew|usr\/local)\/bin\/claude$/.test(launcherPath);
}

export function classifyClaudeInstall(
  launcherPath: string,
  resolvedPath: string,
): Pick<ClaudeInstallCandidate, "installMethod" | "hashMode" | "evidence"> {
  const evidence = [`launcher=${launcherPath}`, `resolved=${resolvedPath}`];
  if (isNativeLauncherPath(launcherPath, resolvedPath)) {
    evidence.push("matched native install path");
    return { installMethod: "native-install", hashMode: "bun", evidence };
  }
  if (isNodeResolvedPath(resolvedPath) && isBrewShimPath(launcherPath) && launcherPath !== resolvedPath) {
    evidence.push("launcher path matches brew shim and resolved target is node CLI");
    return { installMethod: "brew-node-shim", hashMode: "fnv1a", evidence };
  }
  if (isNodeResolvedPath(resolvedPath)) {
    evidence.push("resolved target matches node-based Claude CLI");
    return { installMethod: "npm-global-node", hashMode: "fnv1a", evidence };
  }
  if (basename(resolvedPath) === "claude") {
    evidence.push("resolved target looks like native Claude executable");
    return { installMethod: "native-install", hashMode: "bun", evidence };
  }
  evidence.push("no known macOS install signature matched");
  return { installMethod: "unknown", hashMode: "bun", evidence };
}

export function resolveClaudeExecutableTarget(pathValue: string): string {
  return resolveExecutable(pathValue);
}

export function findClaudeInstallCandidates(options: ClaudePathOptions = {}): ClaudeInstallCandidate[] {
  const rawCandidates = uniqueExistingPaths([
    { source: "env", path: envOverrideCandidate(options) },
    { source: "which", path: whichClaudeCandidate() },
    ...macOSCandidatePaths(options),
  ]);

  return rawCandidates.map(({ source, path }) => {
    const resolvedPath = resolveClaudeExecutableTarget(path);
    const classified = classifyClaudeInstall(path, resolvedPath);
    return {
      source,
      launcherPath: path,
      resolvedPath,
      installMethod: classified.installMethod,
      hashMode: classified.hashMode,
      evidence: [`source=${source}`, ...classified.evidence],
    };
  });
}

export function findClaudeBinaryPath(options: ClaudePathOptions = {}): string | undefined {
  return findClaudeInstallCandidates(options)[0]?.resolvedPath;
}

export function isLikelyNodeInstall(binaryPath: string | undefined): boolean {
  return Boolean(binaryPath && isNodeResolvedPath(binaryPath));
}

export function isSymlink(filePath: string): boolean {
  try {
    return lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}
