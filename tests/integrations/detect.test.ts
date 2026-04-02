import { describe, expect, it } from "vitest";
import { join } from "node:path";

import { detectClaudeEnvironment } from "../../src/integrations/claude/detect.js";
import { createTempHome, writeClaudeConfigFile, writeFakeBinary } from "../helpers.js";

describe("Claude environment detection", () => {
  it("prefers config-userid on npm/node installs", () => {
    const homeDir = createTempHome();
    const binaryPath = join(
      homeDir,
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js",
    );
    writeClaudeConfigFile(homeDir, {
      userID: "abc123",
    });
    writeFakeBinary(binaryPath);

    const environment = detectClaudeEnvironment({
      homeDir,
      env: { ...process.env, CLAUDE_BINARY: binaryPath },
    });

    expect(environment.installShape).toBe("npm-node");
    expect(environment.hashMode).toBe("fnv1a");
    expect(environment.effectiveIdentitySource).toBe("userID");
    expect(environment.availableBackends).toContain("config-userid");
    expect(environment.availableBackends).toContain("binary-salt-patch");
  });
});
