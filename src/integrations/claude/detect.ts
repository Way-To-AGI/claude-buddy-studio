import { existsSync } from "node:fs";

import { ORIGINAL_SALT } from "../../core/constants.js";
import type { DetectedEnvironment } from "../../core/types.js";
import { inspectBinarySalt } from "./binary.js";
import { detectEffectiveIdentity, readClaudeConfig, readToolState } from "./config.js";
import {
  claudeSettingsPath,
  findClaudeBinaryPath,
  findClaudeConfigPath,
  isLikelyNodeInstall,
  toolStatePath,
  type ClaudePathOptions,
} from "./paths.js";

export function detectClaudeEnvironment(options: ClaudePathOptions = {}): DetectedEnvironment {
  const warnings: string[] = [];
  const configPath = findClaudeConfigPath(options);
  const config = readClaudeConfig(options);
  const toolState = readToolState(options);
  const identity = detectEffectiveIdentity(config);
  const binaryPath = findClaudeBinaryPath(options);

  const installShape = isLikelyNodeInstall(binaryPath)
    ? "npm-node"
    : binaryPath
      ? "native-bun"
      : "unknown";
  const hashMode = installShape === "npm-node" ? "fnv1a" : "bun";

  const availableBackends: DetectedEnvironment["availableBackends"] = [];
  if (identity.source !== "oauthAccount.accountUuid") {
    availableBackends.push("config-userid");
  } else {
    warnings.push("Config backend disabled because oauthAccount.accountUuid takes precedence over userID.");
  }

  let binaryState: DetectedEnvironment["binaryState"] | undefined;
  if (binaryPath && existsSync(binaryPath)) {
    const inspected = inspectBinarySalt(binaryPath, toolState.applied?.candidate);
    binaryState = {
      path: binaryPath,
      currentSalt: inspected.currentSalt,
      originalSaltOccurrences: inspected.originalSaltOccurrences,
      patchable: inspected.patchable,
    };
    if (inspected.patchable) {
      availableBackends.push("binary-salt-patch");
    } else {
      warnings.push(`Binary backend unavailable because ${binaryPath} does not expose a known patchable salt.`);
    }
  } else {
    warnings.push("Claude binary path was not detected.");
  }

  return {
    installShape,
    hashMode,
    configPath,
    settingsPath: claudeSettingsPath(options),
    toolStatePath: toolStatePath(options),
    binaryPath,
    effectiveIdentitySource: identity.source,
    effectiveIdentityValue: identity.value,
    availableBackends,
    binaryState,
    warnings,
  };
}
