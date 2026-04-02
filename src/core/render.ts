import chalk from "chalk";

import { RARITY_STARS, STAT_NAMES } from "./constants.js";
import type { BuddyBones, SolverProgress, TargetBuddySpec } from "./types.js";
import { renderSprite } from "./sprites.js";

export function formatBuddySummary(bones: BuddyBones): string[] {
  const stats = STAT_NAMES.map((stat) => `${stat}:${bones.stats[stat]}`).join(" ");
  return [
    `${bones.rarity.toUpperCase()} ${RARITY_STARS[bones.rarity]} ${bones.species}`,
    `eye=${bones.eye} hat=${bones.hat} shiny=${bones.shiny ? "yes" : "no"}`,
    stats,
  ];
}

export function printBuddyCard(label: string, bones: BuddyBones): void {
  console.log(chalk.bold(`\n${label}`));
  for (const line of formatBuddySummary(bones)) {
    console.log(`  ${line}`);
  }
  for (const line of renderSprite(bones)) {
    console.log(`  ${line}`);
  }
}

export function printTargetSpec(target: TargetBuddySpec): void {
  console.log(chalk.bold("\n目标配置"));
  console.log(
    `  ${target.rarity} ${target.species} eye=${target.eye} hat=${target.hat ?? "任意"} shiny=${target.shiny ? "是" : "否"}`,
  );
  if (target.peak) {
    console.log(`  peak=${target.peak}`);
  }
  if (target.dump) {
    console.log(`  dump=${target.dump}`);
  }
  if (target.name) {
    console.log(`  name=${target.name}`);
  }
  if (target.personality) {
    console.log(`  personality=${target.personality}`);
  }
}

export function printProgress(progress: SolverProgress): void {
  const rate = `${progress.rate.toFixed(0)}/s`;
  const eta = Number.isFinite(progress.etaSeconds) ? `${progress.etaSeconds.toFixed(1)}s` : "unknown";
  process.stdout.write(
    `\r  尝试=${progress.attempts.toLocaleString()} 速度=${rate} 预计剩余=${eta} 进度=${progress.percent.toFixed(1)}%`,
  );
}
