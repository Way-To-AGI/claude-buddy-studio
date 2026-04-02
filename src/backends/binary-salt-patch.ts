import { ORIGINAL_SALT } from "../core/constants.js";
import { solveTarget } from "../solver/search.js";
import {
  applyCompanionMetadata,
  deleteCompanion,
  readClaudeConfig,
  writeClaudeConfig,
} from "../integrations/claude/config.js";
import {
  inspectBinarySalt,
  patchBinarySalt,
  restoreBinary,
} from "../integrations/claude/binary.js";
import type { BackendResult } from "../core/types.js";
import type { ApplyBackend, ApplyBackendOptions } from "./types.js";
import { installApplyHook } from "../integrations/claude/hooks.js";
import { createBackup, fileExists, readJsonFile, writeJsonFile } from "../integrations/claude/fs.js";

export const binarySaltPatchBackend: ApplyBackend = {
  kind: "binary-salt-patch",
  async apply(options: ApplyBackendOptions): Promise<BackendResult> {
    const { environment, target } = options;
    if (!environment.binaryPath) {
      throw new Error("Claude binary path not found.");
    }
    const binaryState = inspectBinarySalt(
      environment.binaryPath,
      environment.binaryState?.currentSalt,
    );
    if (!binaryState.patchable || !binaryState.currentSalt) {
      throw new Error("Claude binary is not patchable with a known salt.");
    }

    const match = await solveTarget(environment.effectiveIdentityValue, target, {
      hashMode: environment.hashMode,
      kind: "salt",
      candidateLength: ORIGINAL_SALT.length,
      onProgress: options.onProgress,
    });

    const patched = patchBinarySalt(
      environment.binaryPath,
      binaryState.currentSalt,
      match.candidate,
    );
    const filesTouched = [environment.binaryPath];
    let configBackupPath: string | undefined;

    if (environment.configPath && (target.name || target.personality)) {
      configBackupPath = createBackup(environment.configPath, "buddystudio-config-backup");
      const config = readClaudeConfig() ?? {};
      applyCompanionMetadata(config, {
        name: target.name,
        personality: target.personality,
      });
      config.companion = {
        ...config.companion,
        hatchedAt: Date.now(),
      };
      writeClaudeConfig(config);
      filesTouched.push(environment.configPath);
    }

    if (options.installHook) {
      const hook = installApplyHook();
      filesTouched.push(hook.settingsPath);
    }

    return {
      backend: this.kind,
      appliedProfile: target,
      restoreToken: {
        kind: this.kind,
        binaryBackupPath: patched.backupPath,
        previousSalt: binaryState.currentSalt,
        configBackupPath,
      },
      filesTouched,
      restartRequired: true,
      match,
    };
  },

  async restore(environment, restoreToken) {
    if (!environment.binaryPath) {
      throw new Error("Claude binary path not found.");
    }
    const restored = restoreBinary(environment.binaryPath, restoreToken?.binaryBackupPath);
    const filesTouched = [environment.binaryPath, restored];
    if (environment.configPath && restoreToken?.configBackupPath && fileExists(restoreToken.configBackupPath)) {
      const configBackup = readJsonFile(restoreToken.configBackupPath);
      writeJsonFile(environment.configPath, configBackup);
      filesTouched.push(environment.configPath);
    }
    return filesTouched;
  },

  async rehatch(environment) {
    if (!environment.configPath) {
      return [];
    }
    const config = readClaudeConfig() ?? {};
    deleteCompanion(config);
    writeClaudeConfig(config);
    return [environment.configPath];
  },
};
