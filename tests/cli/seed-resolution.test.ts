import { describe, expect, it } from "vitest";

import { buildApplySeed, buildInteractiveWizardSeed } from "../../src/cli/commands.js";
import type { PersistedToolState } from "../../src/core/types.js";

describe("CLI seed resolution", () => {
  const persisted: PersistedToolState = {
    schemaVersion: 1,
    desiredProfile: {
      species: "cat",
      rarity: "legendary",
      eye: "✦",
      hat: "crown",
      shiny: true,
      peak: "WISDOM",
    },
  };

  it("interactive wizard only uses explicit flags", () => {
    const seed = buildInteractiveWizardSeed({
      species: undefined,
      rarity: undefined,
      eye: undefined,
      hat: undefined,
      shiny: undefined,
      peak: undefined,
      dump: undefined,
      name: undefined,
      personality: undefined,
      backend: undefined,
      yes: undefined,
      silent: undefined,
      json: undefined,
      noHook: undefined,
    });

    expect(seed).toEqual({});
  });

  it("apply seed reuses persisted desired profile and lets flags override", () => {
    const seed = buildApplySeed(
      {
        species: undefined,
        rarity: undefined,
        eye: "◉",
        hat: undefined,
        shiny: undefined,
        peak: undefined,
        dump: undefined,
        name: undefined,
        personality: undefined,
        backend: undefined,
        yes: undefined,
        silent: undefined,
        json: undefined,
        noHook: undefined,
      },
      persisted,
    );

    expect(seed).toMatchObject({
      species: "cat",
      rarity: "legendary",
      eye: "◉",
      hat: "crown",
      shiny: true,
      peak: "WISDOM",
    });
  });
});
