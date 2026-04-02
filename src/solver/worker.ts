import process from "node:process";

import { DEFAULT_MAX_ATTEMPTS, DEFAULT_PROGRESS_INTERVAL } from "../core/constants.js";
import { matchesTargetSpec, rollBuddyWithHash } from "../core/generator.js";
import type {
  CandidateKind,
  HashMode,
  SolverMatch,
  TargetBuddySpec,
} from "../core/types.js";

interface WorkerPayload {
  hashMode: HashMode;
  kind: CandidateKind;
  candidateLength: number;
  maxAttempts: number;
  progressInterval: number;
  identityValue: string;
  baseSalt: string;
  target: TargetBuddySpec;
}

function randomHex(length: number): string {
  let output = "";
  while (output.length < length) {
    output += Math.floor(Math.random() * 16).toString(16);
  }
  return output.slice(0, length);
}

const SALT_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomSalt(length: number): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += SALT_CHARS[Math.floor(Math.random() * SALT_CHARS.length)];
  }
  return output;
}

function candidateValue(kind: CandidateKind, length: number): string {
  return kind === "userId" ? randomHex(length) : randomSalt(length);
}

function hashModeIsBun(payload: WorkerPayload): boolean {
  return payload.hashMode === "bun";
}

async function readPayload(): Promise<WorkerPayload> {
  const raw = await new Response(process.stdin as unknown as ReadableStream).text();
  return JSON.parse(raw) as WorkerPayload;
}

function emitProgress(attempts: number, startedAt: number): void {
  process.stderr.write(
    `${JSON.stringify({
      attempts,
      elapsedMs: Date.now() - startedAt,
    })}\n`,
  );
}

async function main() {
  const payload = await readPayload();
  if (hashModeIsBun(payload) && typeof Bun === "undefined") {
    throw new Error("bun hash mode requires running the worker under Bun.");
  }
  const startedAt = Date.now();
  for (let attempts = 1; attempts <= payload.maxAttempts; attempts += 1) {
    const candidate = candidateValue(payload.kind, payload.candidateLength);
    const identity = payload.kind === "userId" ? candidate : payload.identityValue;
    const salt = payload.kind === "salt" ? candidate : payload.baseSalt;
    const roll = rollBuddyWithHash(identity, salt, payload.hashMode);
    if (matchesTargetSpec(roll, payload.target)) {
      const result: SolverMatch = {
        candidate,
        kind: payload.kind,
        hashMode: payload.hashMode,
        roll,
        attempts,
        elapsedMs: Date.now() - startedAt,
      };
      process.stdout.write(JSON.stringify(result));
      return;
    }
    if (attempts % payload.progressInterval === 0) {
      emitProgress(attempts, startedAt);
    }
  }
  throw new Error(
    `No match found in ${payload.maxAttempts.toLocaleString()} attempts for ${payload.kind}.`,
  );
}

main().catch((error: Error) => {
  process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
  process.exit(1);
});
