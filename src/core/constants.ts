import type { Eye, Hat, Rarity, Species, StatName } from "./types.js";

export const ORIGINAL_SALT = "friend-2026-401";
export const TOOL_STATE_SCHEMA_VERSION = 1;

export const RARITIES: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

export const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

export const RARITY_STARS: Record<Rarity, string> = {
  common: "★",
  uncommon: "★★",
  rare: "★★★",
  epic: "★★★★",
  legendary: "★★★★★",
};

export const SPECIES: readonly Species[] = [
  "duck",
  "goose",
  "blob",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "snail",
  "ghost",
  "axolotl",
  "capybara",
  "cactus",
  "robot",
  "rabbit",
  "mushroom",
  "chonk",
];

export const EYES: readonly Eye[] = ["·", "✦", "×", "◉", "@", "°"];

export const HATS: readonly Hat[] = [
  "none",
  "crown",
  "tophat",
  "propeller",
  "halo",
  "wizard",
  "beanie",
  "tinyduck",
];

export const STAT_NAMES: readonly StatName[] = [
  "DEBUGGING",
  "PATIENCE",
  "CHAOS",
  "WISDOM",
  "SNARK",
];

export const DEFAULT_MAX_ATTEMPTS = 50_000_000;
export const DEFAULT_PROGRESS_INTERVAL = 20_000;
