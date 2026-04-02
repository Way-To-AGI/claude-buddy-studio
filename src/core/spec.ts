import { z } from "zod";

import { EYES, HATS, RARITIES, SPECIES, STAT_NAMES } from "./constants.js";
import type { TargetBuddySpec } from "./types.js";

export const targetBuddySpecSchema = z
  .object({
    species: z.enum(SPECIES),
    rarity: z.enum(RARITIES),
    eye: z.enum(EYES),
    hat: z.enum(HATS).optional(),
    shiny: z.boolean().default(false),
    peak: z.enum(STAT_NAMES).optional(),
    dump: z.enum(STAT_NAMES).optional(),
    name: z.string().trim().min(1).max(32).optional(),
    personality: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.rarity === "common" && value.hat && value.hat !== "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "普通品质伙伴只能使用 none 帽子。",
        path: ["hat"],
      });
    }
    if (value.peak && value.dump && value.peak === value.dump) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "最高属性和最低属性不能相同。",
        path: ["dump"],
      });
    }
  });

export function normalizeTargetBuddySpec(input: TargetBuddySpec): TargetBuddySpec {
  const normalized = targetBuddySpecSchema.parse(input);
  if (normalized.rarity === "common") {
    return { ...normalized, hat: "none" };
  }
  return normalized;
}
