import { describe, expect, it } from "vitest";

import { rollBuddyWithHash } from "../../src/core/generator.js";

describe("generator parity", () => {
  it("matches the known npm/node buddy mapping", () => {
    const roll = rollBuddyWithHash(
      "295680426dd1b5da78cc3bdb09c50e231f8b6f837e46a9946b6cd8b87cca5cbe",
      "friend-2026-401",
      "fnv1a",
    );
    expect(roll.bones.rarity).toBe("common");
    expect(roll.bones.species).toBe("cat");
    expect(roll.bones.eye).toBe("°");
    expect(roll.bones.hat).toBe("none");
    expect(roll.bones.shiny).toBe(false);
    expect(roll.bones.stats).toEqual({
      DEBUGGING: 44,
      PATIENCE: 39,
      CHAOS: 36,
      WISDOM: 2,
      SNARK: 60,
    });
  });
});
