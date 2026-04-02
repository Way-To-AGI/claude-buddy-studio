import {
  EYES,
  HATS,
  RARITIES,
  RARITY_FLOOR,
  RARITY_WEIGHTS,
  SPECIES,
  STAT_NAMES,
} from "./constants.js";
import type {
  BuddyBones,
  BuddyRoll,
  BuddyStats,
  HashMode,
  StatName,
  TargetBuddySpec,
} from "./types.js";
import { hashByMode } from "./hash.js";

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function rollRarity(rng: () => number) {
  let roll = rng() * 100;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) {
      return rarity;
    }
  }
  return "common";
}

function rollStats(rng: () => number, rarity: BuddyBones["rarity"]): BuddyStats {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) {
    dump = pick(rng, STAT_NAMES);
  }

  const stats = {} as BuddyStats;
  for (const statName of STAT_NAMES) {
    if (statName === peak) {
      stats[statName] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (statName === dump) {
      stats[statName] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[statName] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

export function rollBuddyWithHash(
  identityValue: string,
  salt: string,
  hashMode: HashMode,
): BuddyRoll {
  const rng = mulberry32(hashByMode(identityValue + salt, hashMode));
  const rarity = rollRarity(rng);
  return {
    bones: {
      rarity,
      species: pick(rng, SPECIES),
      eye: pick(rng, EYES),
      hat: rarity === "common" ? "none" : pick(rng, HATS),
      shiny: rng() < 0.01,
      stats: rollStats(rng, rarity),
    },
    inspirationSeed: Math.floor(rng() * 1e9),
  };
}

function bestStat(stats: BuddyStats): StatName {
  return [...STAT_NAMES].sort((left, right) => stats[right] - stats[left])[0] ?? "DEBUGGING";
}

function worstStat(stats: BuddyStats): StatName {
  return [...STAT_NAMES].sort((left, right) => stats[left] - stats[right])[0] ?? "DEBUGGING";
}

export function matchesTargetSpec(roll: BuddyRoll, target: TargetBuddySpec): boolean {
  const { bones } = roll;
  if (bones.species !== target.species) return false;
  if (bones.rarity !== target.rarity) return false;
  if (bones.eye !== target.eye) return false;
  if (target.hat && bones.hat !== target.hat) return false;
  if (bones.shiny !== target.shiny) return false;
  if (target.peak && bestStat(bones.stats) !== target.peak) return false;
  if (target.dump && worstStat(bones.stats) !== target.dump) return false;
  return true;
}
