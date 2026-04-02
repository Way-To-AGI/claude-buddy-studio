import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_MAX_ATTEMPTS, DEFAULT_PROGRESS_INTERVAL, ORIGINAL_SALT, RARITY_WEIGHTS } from "../core/constants.js";
import type {
  SolveOptions,
  SolverMatch,
  SolverProgress,
  TargetBuddySpec,
} from "../core/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function workerPath(): string {
  const tsPath = resolve(__dirname, "./worker.ts");
  const jsPath = resolve(__dirname, "./worker.js");
  return existsSync(tsPath) ? tsPath : jsPath;
}

function tsxPath(): string {
  return resolve(__dirname, "../../node_modules/.bin/tsx");
}

export function estimateAttempts(target: TargetBuddySpec): number {
  let probability = 1 / 18;
  probability *= RARITY_WEIGHTS[target.rarity] / 100;
  probability *= 1 / 6;
  if (target.rarity !== "common" && target.hat) {
    probability *= 1 / 8;
  }
  if (target.shiny) {
    probability *= 0.01;
  }
  if (target.peak) {
    probability *= 1 / 5;
  }
  if (target.dump) {
    probability *= 1 / 4;
  }
  return Math.max(1, Math.round(1 / probability));
}

function runtimeCommand(hashMode: SolveOptions["hashMode"]) {
  const worker = workerPath();
  if (hashMode === "bun") {
    return { command: "bun", args: [worker] };
  }
  if (worker.endsWith(".ts")) {
    return { command: tsxPath(), args: [worker] };
  }
  return { command: process.execPath, args: [worker] };
}

export async function solveTarget(
  identityValue: string,
  target: TargetBuddySpec,
  options: SolveOptions,
): Promise<SolverMatch> {
  const { command, args } = runtimeCommand(options.hashMode);
  const expectedAttempts = estimateAttempts(target);
  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    signal: options.signal,
  });

  const payload = {
    hashMode: options.hashMode,
    kind: options.kind,
    candidateLength: options.candidateLength,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    progressInterval: DEFAULT_PROGRESS_INTERVAL,
    identityValue,
    baseSalt: ORIGINAL_SALT,
    target,
  };

  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as { attempts?: number; elapsedMs?: number; error?: string };
        if (parsed.error) {
          continue;
        }
        if (parsed.attempts && parsed.elapsedMs !== undefined) {
          const rate = parsed.attempts / Math.max(parsed.elapsedMs / 1000, 0.001);
          const remaining = Math.max(expectedAttempts - parsed.attempts, 0);
          const progress: SolverProgress = {
            attempts: parsed.attempts,
            elapsedMs: parsed.elapsedMs,
            rate,
            expectedAttempts,
            percent: Math.min((parsed.attempts / expectedAttempts) * 100, 100),
            etaSeconds: remaining / Math.max(rate, 1),
          };
          options.onProgress?.(progress);
        }
      } catch {
        continue;
      }
    }
  });

  return await new Promise<SolverMatch>((resolvePromise, rejectPromise) => {
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(JSON.parse(stdout) as SolverMatch);
        return;
      }
      rejectPromise(
        new Error(stderr.trim() || `solver worker exited with code ${code ?? "unknown"}`),
      );
    });
    child.on("error", rejectPromise);
  });
}
