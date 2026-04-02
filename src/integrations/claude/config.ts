import { existsSync, readFileSync } from "node:fs";

import type { PersistedToolState } from "../../core/types.js";
import { TOOL_STATE_SCHEMA_VERSION } from "../../core/constants.js";
import { readJsonFile, writeJsonFile } from "./fs.js";
import { claudeSettingsPath, findClaudeConfigPath, toolStatePath, type ClaudePathOptions } from "./paths.js";

export interface ClaudeCompanionState {
  name?: string;
  personality?: string;
  hatchedAt?: number;
}

export interface ClaudeConfigShape {
  oauthAccount?: {
    accountUuid?: string;
    organizationUuid?: string;
  };
  userID?: string;
  companion?: ClaudeCompanionState;
  [key: string]: unknown;
}

export function readClaudeConfig(options: ClaudePathOptions = {}): ClaudeConfigShape | undefined {
  const configPath = findClaudeConfigPath(options);
  if (!configPath || !existsSync(configPath)) {
    return undefined;
  }
  return readJsonFile<ClaudeConfigShape>(configPath);
}

export function writeClaudeConfig(config: ClaudeConfigShape, options: ClaudePathOptions = {}): string {
  const configPath =
    findClaudeConfigPath(options) ??
    `${options.homeDir ?? process.env.HOME ?? ""}/.claude.json`;
  writeJsonFile(configPath, config);
  return configPath;
}

export function readClaudeSettings(options: ClaudePathOptions = {}): Record<string, unknown> {
  const settingsPath = claudeSettingsPath(options);
  if (!existsSync(settingsPath)) {
    return {};
  }
  return readJsonFile<Record<string, unknown>>(settingsPath);
}

export function writeClaudeSettings(settings: Record<string, unknown>, options: ClaudePathOptions = {}): string {
  const settingsPath = claudeSettingsPath(options);
  writeJsonFile(settingsPath, settings);
  return settingsPath;
}

export function readToolState(options: ClaudePathOptions = {}): PersistedToolState {
  const statePath = toolStatePath(options);
  if (!existsSync(statePath)) {
    return { schemaVersion: TOOL_STATE_SCHEMA_VERSION };
  }
  const parsed = readJsonFile<PersistedToolState>(statePath);
  return {
    ...parsed,
    schemaVersion: TOOL_STATE_SCHEMA_VERSION,
  };
}

export function writeToolState(state: PersistedToolState, options: ClaudePathOptions = {}): string {
  const nextState: PersistedToolState = {
    ...state,
    schemaVersion: TOOL_STATE_SCHEMA_VERSION,
  };
  const statePath = toolStatePath(options);
  writeJsonFile(statePath, nextState);
  return statePath;
}

export function detectEffectiveIdentity(config: ClaudeConfigShape | undefined): {
  source: "oauthAccount.accountUuid" | "userID" | "anon";
  value: string;
} {
  const accountUuid = config?.oauthAccount?.accountUuid;
  if (accountUuid) {
    return { source: "oauthAccount.accountUuid", value: accountUuid };
  }
  const userId = config?.userID;
  if (userId) {
    return { source: "userID", value: userId };
  }
  return { source: "anon", value: "anon" };
}

export function companionSnapshot(config: ClaudeConfigShape | undefined): ClaudeCompanionState | undefined {
  return config?.companion ? { ...config.companion } : undefined;
}

export function deleteCompanion(config: ClaudeConfigShape): void {
  delete config.companion;
}

export function applyCompanionMetadata(
  config: ClaudeConfigShape,
  input: { name?: string; personality?: string },
): void {
  if (!config.companion) {
    config.companion = {};
  }
  if (input.name) {
    config.companion.name = input.name;
  }
  if (input.personality) {
    config.companion.personality = input.personality;
  }
}
