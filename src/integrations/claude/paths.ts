import { existsSync, lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export interface ClaudePathOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
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

export function findClaudeBinaryPath(options: ClaudePathOptions = {}): string | undefined {
  const env = options.env ?? process.env;
  if (env.CLAUDE_BINARY && existsSync(env.CLAUDE_BINARY)) {
    return resolveExecutable(env.CLAUDE_BINARY);
  }
  try {
    const candidate = execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
    if (candidate && existsSync(candidate)) {
      return resolveExecutable(candidate);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function isLikelyNodeInstall(binaryPath: string | undefined): boolean {
  if (!binaryPath) return false;
  return (
    binaryPath.endsWith("/cli.js") ||
    binaryPath.includes("/node_modules/@anthropic-ai/claude-code/")
  );
}

export function isSymlink(filePath: string): boolean {
  try {
    return lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}
