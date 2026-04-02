import { existsSync } from "node:fs";

import type { DetectedEnvironment } from "../../core/types.js";
import { inspectBinarySalt } from "./binary.js";
import { detectEffectiveIdentity, readClaudeConfig, readToolState } from "./config.js";
import {
  claudeSettingsPath,
  findClaudeInstallCandidates,
  findClaudeConfigPath,
  toolStatePath,
  type ClaudePathOptions,
} from "./paths.js";

export function detectClaudeEnvironment(options: ClaudePathOptions = {}): DetectedEnvironment {
  const warnings: string[] = [];
  const configPath = findClaudeConfigPath(options);
  const config = readClaudeConfig(options);
  const toolState = readToolState(options);
  const identity = detectEffectiveIdentity(config);
  const candidates = findClaudeInstallCandidates(options);
  const selected = candidates[0];
  const launcherPath = selected?.launcherPath;
  const resolvedBinaryPath = selected?.resolvedPath;
  const installMethod = selected?.installMethod ?? "unknown";
  const hashMode = selected?.hashMode ?? "bun";
  const installShape =
    installMethod === "native-install"
      ? "native-bun"
      : installMethod === "unknown"
        ? "unknown"
        : "npm-node";
  const pathEvidence = candidates.flatMap((candidate, index) => [
    `${index === 0 ? "selected" : "candidate"}:${candidate.source}:${candidate.installMethod}`,
    ...candidate.evidence,
  ]);

  if (candidates.length > 1) {
    warnings.push(`检测到多个 Claude 安装候选，当前优先使用 ${launcherPath}。`);
  }

  const availableBackends: DetectedEnvironment["availableBackends"] = [];
  if (identity.source !== "oauthAccount.accountUuid") {
    availableBackends.push("config-userid");
  } else {
    warnings.push("Config backend disabled because oauthAccount.accountUuid takes precedence over userID.");
  }

  let binaryState: DetectedEnvironment["binaryState"] | undefined;
  if (resolvedBinaryPath && existsSync(resolvedBinaryPath)) {
    const inspected = inspectBinarySalt(resolvedBinaryPath, toolState.applied?.candidate);
    binaryState = {
      path: resolvedBinaryPath,
      fileKind: inspected.fileKind,
      currentSalt: inspected.currentSalt,
      originalSaltOccurrences: inspected.originalSaltOccurrences,
      patchable: inspected.patchable,
      patchableReason: inspected.patchableReason,
    };
    if (inspected.patchable) {
      availableBackends.push("binary-salt-patch");
    } else {
      warnings.push(`Binary backend unavailable: ${inspected.patchableReason}`);
    }
  } else {
    warnings.push("Claude binary path was not detected.");
  }

  return {
    installShape,
    installMethod,
    hashMode,
    configPath,
    settingsPath: claudeSettingsPath(options),
    toolStatePath: toolStatePath(options),
    launcherPath,
    resolvedBinaryPath,
    binaryPath: resolvedBinaryPath,
    pathEvidence,
    effectiveIdentitySource: identity.source,
    effectiveIdentityValue: identity.value,
    availableBackends,
    binaryState,
    warnings,
  };
}
