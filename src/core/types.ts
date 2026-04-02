export const BACKEND_KINDS = ["config-userid", "binary-salt-patch"] as const;
export type BackendKind = (typeof BACKEND_KINDS)[number];

export const HASH_MODES = ["fnv1a", "bun"] as const;
export type HashMode = (typeof HASH_MODES)[number];

export const CANDIDATE_KINDS = ["userId", "salt"] as const;
export type CandidateKind = (typeof CANDIDATE_KINDS)[number];

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type Species =
  | "duck"
  | "goose"
  | "blob"
  | "cat"
  | "dragon"
  | "octopus"
  | "owl"
  | "penguin"
  | "turtle"
  | "snail"
  | "ghost"
  | "axolotl"
  | "capybara"
  | "cactus"
  | "robot"
  | "rabbit"
  | "mushroom"
  | "chonk";
export type Eye = "·" | "✦" | "×" | "◉" | "@" | "°";
export type Hat =
  | "none"
  | "crown"
  | "tophat"
  | "propeller"
  | "halo"
  | "wizard"
  | "beanie"
  | "tinyduck";
export type StatName =
  | "DEBUGGING"
  | "PATIENCE"
  | "CHAOS"
  | "WISDOM"
  | "SNARK";

export type BuddyStats = Record<StatName, number>;

export interface BuddyBones {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: BuddyStats;
}

export interface BuddyRoll {
  bones: BuddyBones;
  inspirationSeed: number;
}

export interface TargetBuddySpec {
  species: Species;
  rarity: Rarity;
  eye: Eye;
  hat?: Hat;
  shiny: boolean;
  peak?: StatName;
  dump?: StatName;
  name?: string;
  personality?: string;
}

export interface SolverProgress {
  attempts: number;
  elapsedMs: number;
  rate: number;
  expectedAttempts: number;
  percent: number;
  etaSeconds: number;
}

export interface SolverMatch {
  candidate: string;
  kind: CandidateKind;
  hashMode: HashMode;
  roll: BuddyRoll;
  attempts: number;
  elapsedMs: number;
}

export interface SolveOptions {
  hashMode: HashMode;
  kind: CandidateKind;
  candidateLength: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  onProgress?: (progress: SolverProgress) => void;
}

export interface BinaryState {
  path: string;
  currentSalt?: string;
  originalSaltOccurrences: number;
  patchable: boolean;
}

export interface DetectedEnvironment {
  installShape: "npm-node" | "native-bun" | "unknown";
  hashMode: HashMode;
  configPath?: string;
  settingsPath: string;
  toolStatePath: string;
  binaryPath?: string;
  effectiveIdentitySource: "oauthAccount.accountUuid" | "userID" | "anon";
  effectiveIdentityValue: string;
  availableBackends: BackendKind[];
  binaryState?: BinaryState;
  warnings: string[];
}

export interface RestoreToken {
  kind: BackendKind;
  configBackupPath?: string;
  previousUserId?: string;
  binaryBackupPath?: string;
  previousSalt?: string;
  settingsBackupPath?: string;
}

export interface BackendResult {
  backend: BackendKind;
  appliedProfile: TargetBuddySpec;
  restoreToken: RestoreToken;
  filesTouched: string[];
  restartRequired: boolean;
  match: SolverMatch;
}

export interface PersistedToolState {
  schemaVersion: number;
  desiredProfile?: TargetBuddySpec;
  applied?: {
    backend: BackendKind;
    appliedAt: string;
    candidate: string;
    hashMode: HashMode;
    restoreToken: RestoreToken;
  };
}
