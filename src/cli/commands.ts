import chalk from "chalk";

import { getBackend, resolvePreferredBackend } from "../backends/index.js";
import { ORIGINAL_SALT } from "../core/constants.js";
import { rollBuddyWithHash } from "../core/generator.js";
import { printBuddyCard, printProgress, printTargetSpec } from "../core/render.js";
import { normalizeTargetBuddySpec } from "../core/spec.js";
import type { ParsedArgs } from "./args.js";
import { collectTargetSpec } from "./wizard.js";
import { detectClaudeEnvironment } from "../integrations/claude/detect.js";
import { readClaudeConfig, readToolState, writeToolState } from "../integrations/claude/config.js";
import { removeApplyHook } from "../integrations/claude/hooks.js";
import type { PersistedToolState, TargetBuddySpec } from "../core/types.js";

function currentSaltForEnvironment(): string {
  const environment = detectClaudeEnvironment();
  return environment.binaryState?.currentSalt ?? ORIGINAL_SALT;
}

function buildCurrentBuddy() {
  const environment = detectClaudeEnvironment();
  return {
    environment,
    roll: rollBuddyWithHash(
      environment.effectiveIdentityValue,
      environment.binaryState?.currentSalt ?? ORIGINAL_SALT,
      environment.hashMode,
    ),
  };
}

function buildTargetFromFlags(flags: ParsedArgs["flags"]): Partial<TargetBuddySpec> {
  const seed: Partial<TargetBuddySpec> = {
    species: flags.species,
    rarity: flags.rarity,
    eye: flags.eye,
    hat: flags.hat,
    shiny: flags.shiny,
    peak: flags.peak,
    dump: flags.dump,
    name: flags.name,
    personality: flags.personality,
  };
  return Object.fromEntries(
    Object.entries(seed).filter(([, value]) => value !== undefined),
  ) as Partial<TargetBuddySpec>;
}

export function buildInteractiveWizardSeed(
  flags: ParsedArgs["flags"],
): Partial<TargetBuddySpec> {
  return buildTargetFromFlags(flags);
}

export function buildApplySeed(
  flags: ParsedArgs["flags"],
  persisted: PersistedToolState,
): Partial<TargetBuddySpec> {
  return {
    ...(persisted.desiredProfile ?? {}),
    ...buildTargetFromFlags(flags),
  };
}

function hasCompleteTarget(input: Partial<TargetBuddySpec>): input is TargetBuddySpec {
  return Boolean(input.species && input.rarity && input.eye && input.shiny !== undefined);
}

function printEnvironmentSummary() {
  const environment = detectClaudeEnvironment();
  console.log(chalk.bold("\n环境信息"));
  console.log(`  安装形态=${environment.installShape}`);
  console.log(`  哈希模式=${environment.hashMode}`);
  console.log(`  身份源=${environment.effectiveIdentitySource}:${environment.effectiveIdentityValue}`);
  console.log(`  配置文件=${environment.configPath ?? "未找到"}`);
  console.log(`  二进制=${environment.binaryPath ?? "未找到"}`);
  console.log(`  可用后端=${environment.availableBackends.join(", ") || "无"}`);
  for (const warning of environment.warnings) {
    console.log(chalk.yellow(`  警告=${warning}`));
  }
}

export async function runCurrent() {
  const { environment, roll } = buildCurrentBuddy();
  printEnvironmentSummary();
  printBuddyCard("当前 Buddy", roll.bones);
  const state = readToolState();
  if (state.desiredProfile) {
    printTargetSpec(state.desiredProfile);
  }
}

export async function runPreview(parsed: ParsedArgs) {
  const environment = detectClaudeEnvironment();
  const seed = buildTargetFromFlags(parsed.flags);
  const target = hasCompleteTarget(seed) ? normalizeTargetBuddySpec(seed) : await collectTargetSpec(environment, seed);
  const previewRoll = rollBuddyWithHash(
    environment.effectiveIdentityValue,
    environment.binaryState?.currentSalt ?? ORIGINAL_SALT,
    environment.hashMode,
  );
  printBuddyCard("当前 Buddy", previewRoll.bones);
  printTargetSpec(target);
  const syntheticRoll = {
    ...rollBuddyWithHash(
      environment.effectiveIdentityValue,
      ORIGINAL_SALT,
      environment.hashMode,
    ),
    bones: {
      ...previewRoll.bones,
      ...target,
      hat: target.hat ?? (target.rarity === "common" ? "none" : previewRoll.bones.hat),
      stats: previewRoll.bones.stats,
    },
  };
  printBuddyCard("目标预览", syntheticRoll.bones);
}

export async function runBackends() {
  printEnvironmentSummary();
}

export async function runDoctor(parsed: ParsedArgs) {
  printEnvironmentSummary();
  const state = readToolState();
  console.log(chalk.bold("\n工具状态"));
  console.log(`  desired=${state.desiredProfile ? "已保存" : "无"}`);
  console.log(`  applied=${state.applied ? `${state.applied.backend} @ ${state.applied.appliedAt}` : "无"}`);
  if (parsed.flags.json) {
    console.log(JSON.stringify({ environment: detectClaudeEnvironment(), state }, null, 2));
  }
}

export async function runApply(parsed: ParsedArgs) {
  return runApplyInternal(parsed, { forceWizard: false });
}

export async function runInteractiveApply(parsed: ParsedArgs) {
  return runApplyInternal(parsed, { forceWizard: true });
}

async function runApplyInternal(
  parsed: ParsedArgs,
  options: { forceWizard: boolean },
) {
  const environment = detectClaudeEnvironment();
  const persisted = readToolState();
  const directSeed = buildInteractiveWizardSeed(parsed.flags);
  const applySeed = buildApplySeed(parsed.flags, persisted);
  const target =
    options.forceWizard
      ? await collectTargetSpec(environment, directSeed)
      : hasCompleteTarget(directSeed)
      ? normalizeTargetBuddySpec(directSeed)
      : persisted.desiredProfile
        ? normalizeTargetBuddySpec(applySeed as TargetBuddySpec)
        : await collectTargetSpec(environment, directSeed);
  const backend = resolvePreferredBackend(environment, parsed.flags.backend);

  printEnvironmentSummary();
  printTargetSpec(target);
  const result = await backend.apply({
    target,
    environment,
    installHook: backend.kind === "binary-salt-patch" && !parsed.flags.noHook,
    onProgress: (progress) => {
      if (!parsed.flags.silent) {
        printProgress(progress);
      }
    },
  });

  const nextState: PersistedToolState = {
    ...persisted,
    desiredProfile: target,
    applied: {
      backend: result.backend,
      appliedAt: new Date().toISOString(),
      candidate: result.match.candidate,
      hashMode: result.match.hashMode,
      restoreToken: result.restoreToken,
    },
  };
  writeToolState(nextState);

  if (!parsed.flags.silent) {
    process.stdout.write("\n");
    console.log(chalk.green(`已通过 ${result.backend} 应用。`));
    console.log(`  变更文件=${result.filesTouched.join(", ")}`);
    console.log(`  需要重启=${result.restartRequired ? "是" : "否"}`);
    printBuddyCard("匹配结果", result.match.roll.bones);
  }
}

export async function runRestore() {
  const environment = detectClaudeEnvironment();
  const state = readToolState();
  if (!state.applied) {
    throw new Error("No applied profile found to restore.");
  }
  const backend = getBackend(state.applied.backend);
  const filesTouched = await backend.restore(environment, state.applied.restoreToken);
  if (state.applied.backend === "binary-salt-patch") {
    try {
      removeApplyHook();
    } catch {
      // ignore
    }
  }
  writeToolState({
    ...state,
    applied: undefined,
  });
  console.log(chalk.green("恢复完成。"));
  console.log(`  变更文件=${filesTouched.join(", ")}`);
}

export async function runRehatch() {
  const environment = detectClaudeEnvironment();
  const backend = environment.availableBackends.includes("config-userid")
    ? getBackend("config-userid")
    : getBackend("binary-salt-patch");
  const filesTouched = await backend.rehatch(environment);
  console.log(chalk.green("已删除 companion，下次 /buddy 会重新孵化。"));
  if (filesTouched.length > 0) {
    console.log(`  变更文件=${filesTouched.join(", ")}`);
  }
}
