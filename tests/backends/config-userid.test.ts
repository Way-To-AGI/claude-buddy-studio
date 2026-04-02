import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { configUserIdBackend } from "../../src/backends/config-userid.js";
import { detectClaudeEnvironment } from "../../src/integrations/claude/detect.js";
import { createTempHome, withTempProcessEnv, writeClaudeConfigFile, writeFakeBinary } from "../helpers.js";

describe("config-userid backend", () => {
  it("applies and restores via Claude config", async () => {
    const homeDir = createTempHome();
    const binaryPath = join(
      homeDir,
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js",
    );
    writeClaudeConfigFile(homeDir, {
      userID: "295680426dd1b5da78cc3bdb09c50e231f8b6f837e46a9946b6cd8b87cca5cbe",
      companion: { name: "Gravy", personality: "A common cat of few words." },
    });
    writeFakeBinary(binaryPath);

    await withTempProcessEnv(
      {
        HOME: homeDir,
        CLAUDE_BINARY: binaryPath,
      },
      async () => {
        const environment = detectClaudeEnvironment();
        const result = await configUserIdBackend.apply({
          environment,
          target: {
            species: "duck",
            rarity: "common",
            eye: "·",
            shiny: false,
          },
        });

        const applied = JSON.parse(readFileSync(join(homeDir, ".claude.json"), "utf8")) as {
          userID: string;
          companion?: unknown;
        };
        expect(applied.userID).toBe(result.match.candidate);
        expect(applied.companion).toBeUndefined();

        await configUserIdBackend.restore(environment, result.restoreToken);
        const restored = JSON.parse(readFileSync(join(homeDir, ".claude.json"), "utf8")) as {
          userID: string;
        };
        expect(restored.userID).toBe("295680426dd1b5da78cc3bdb09c50e231f8b6f837e46a9946b6cd8b87cca5cbe");
      },
    );
  });
});
