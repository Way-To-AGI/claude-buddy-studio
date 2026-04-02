import { execFileSync } from "node:child_process";

import type { HashMode } from "./types.js";

const bunHashCache = new Map<string, number>();

export function hashFNV1a(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashBunSync(value: string): number {
  const cached = bunHashCache.get(value);
  if (cached !== undefined) {
    return cached;
  }
  if (typeof Bun !== "undefined") {
    const direct = Number(BigInt(Bun.hash(value)) & 0xffffffffn);
    bunHashCache.set(value, direct);
    return direct;
  }
  const result = execFileSync(
    "bun",
    [
      "-e",
      "const input = await Bun.stdin.text(); process.stdout.write(String(Number(BigInt(Bun.hash(input)) & 0xffffffffn)));",
    ],
    {
      input: value,
      encoding: "utf8",
      timeout: 5000,
    },
  );
  const parsed = Number.parseInt(result.trim(), 10);
  bunHashCache.set(value, parsed);
  return parsed;
}

export function hashByMode(value: string, mode: HashMode): number {
  return mode === "bun" ? hashBunSync(value) : hashFNV1a(value);
}
