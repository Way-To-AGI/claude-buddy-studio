import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { binarySaltPatchBackend } from "../../src/backends/binary-salt-patch.js";
import { detectClaudeEnvironment } from "../../src/integrations/claude/detect.js";
import { ORIGINAL_SALT } from "../../src/core/constants.js";
import { createTempHome, withTempProcessEnv, writeClaudeConfigFile, writeFakeBinary } from "../helpers.js";

describe("binary-salt-patch backend", () => {
  it("patches and restores the Claude binary fallback path", async () => {
    const homeDir = createTempHome();
    const binaryPath = join(homeDir, "ClaudeNative", "claude");
    writeClaudeConfigFile(homeDir, {
      oauthAccount: { accountUuid: "native-bun-account-id" },
      companion: { name: "Ghost", personality: "Already hatched." },
    });
    writeFakeBinary(binaryPath);

    await withTempProcessEnv(
      {
        HOME: homeDir,
        CLAUDE_BINARY: binaryPath,
      },
      async () => {
        const environment = detectClaudeEnvironment();
        expect(environment.availableBackends).toEqual(["binary-salt-patch"]);

        const result = await binarySaltPatchBackend.apply({
          environment,
          target: {
            species: "duck",
            rarity: "common",
            eye: "·",
            hat: "none",
            shiny: false,
          },
        });

        const patchedBinary = readFileSync(binaryPath, "utf8");
        expect(patchedBinary.includes(result.match.candidate)).toBe(true);
        expect(patchedBinary.includes(ORIGINAL_SALT)).toBe(false);

        await binarySaltPatchBackend.restore(environment, result.restoreToken);
        const restoredBinary = readFileSync(binaryPath, "utf8");
        expect(restoredBinary.includes(ORIGINAL_SALT)).toBe(true);
      },
    );
  });
});
