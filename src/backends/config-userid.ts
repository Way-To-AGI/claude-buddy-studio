import { ORIGINAL_SALT } from "../core/constants.js";
import { solveTarget } from "../solver/search.js";
import type { BackendResult } from "../core/types.js";
import { applyCompanionMetadata, deleteCompanion, readClaudeConfig, writeClaudeConfig } from "../integrations/claude/config.js";
import { createBackup, fileExists, readJsonFile, writeJsonFile } from "../integrations/claude/fs.js";
import type { ApplyBackend, ApplyBackendOptions } from "./types.js";

export const configUserIdBackend: ApplyBackend = {
  kind: "config-userid",
  async apply(options: ApplyBackendOptions): Promise<BackendResult> {
    const { environment, target } = options;
    if (!environment.configPath) {
      throw new Error("Claude config path not found.");
    }
    const currentConfig = readClaudeConfig() ?? {};
    const configBackupPath = createBackup(environment.configPath, "buddystudio-config-backup");
    const match = await solveTarget(environment.effectiveIdentityValue, target, {
      hashMode: "fnv1a",
      kind: "userId",
      candidateLength: 64,
      onProgress: options.onProgress,
    });

    const nextConfig = { ...currentConfig, userID: match.candidate };
    if (target.name || target.personality) {
      applyCompanionMetadata(nextConfig, {
        name: target.name,
        personality: target.personality,
      });
      nextConfig.companion = {
        ...nextConfig.companion,
        hatchedAt: Date.now(),
      };
    } else {
      deleteCompanion(nextConfig);
    }

    writeClaudeConfig(nextConfig);

    return {
      backend: this.kind,
      appliedProfile: target,
      restoreToken: {
        kind: this.kind,
        configBackupPath,
        previousUserId: currentConfig.userID,
      },
      filesTouched: [environment.configPath],
      restartRequired: true,
      match,
    };
  },

  async restore(environment, restoreToken) {
    if (!environment.configPath) {
      throw new Error("Claude config path not found.");
    }
    if (!restoreToken?.configBackupPath || !fileExists(restoreToken.configBackupPath)) {
      throw new Error("Config restore backup not found.");
    }
    const backup = readJsonFile(restoreToken.configBackupPath);
    writeJsonFile(environment.configPath, backup);
    return [environment.configPath];
  },

  async rehatch(environment) {
    if (!environment.configPath) {
      throw new Error("Claude config path not found.");
    }
    const config = readClaudeConfig() ?? {};
    deleteCompanion(config);
    writeClaudeConfig(config);
    return [environment.configPath];
  },
};
