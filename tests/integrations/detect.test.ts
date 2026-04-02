import { describe, expect, it } from "vitest";
import { realpathSync } from "node:fs";
import { join } from "node:path";

import { detectClaudeEnvironment } from "../../src/integrations/claude/detect.js";
import {
  createTempHome,
  writeClaudeConfigFile,
  writeFakeBinary,
  writeFakeBrewLauncher,
  writeFakeNativeBinary,
} from "../helpers.js";

describe("Claude environment detection", () => {
  it("classifies npm global node installs", () => {
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

    expect(environment.installMethod).toBe("npm-global-node");
    expect(environment.hashMode).toBe("fnv1a");
    expect(environment.effectiveIdentitySource).toBe("userID");
    expect(environment.availableBackends).toContain("config-userid");
    expect(environment.availableBackends).toContain("binary-salt-patch");
  });

  it("classifies brew node shim installs", () => {
    const homeDir = createTempHome();
    const { launcherPath, resolvedPath } = writeFakeBrewLauncher(homeDir);
    writeClaudeConfigFile(homeDir, {
      userID: "brew-user-id",
    });

    const environment = detectClaudeEnvironment({
      homeDir,
      env: { ...process.env, CLAUDE_BINARY: launcherPath },
    });

    expect(environment.installMethod).toBe("brew-node-shim");
    expect(environment.launcherPath).toBe(launcherPath);
    expect(environment.resolvedBinaryPath).toBe(realpathSync(resolvedPath));
    expect(environment.hashMode).toBe("fnv1a");
    expect(environment.availableBackends).toContain("config-userid");
    expect(environment.binaryState?.fileKind).toBe("node-js");
  });

  it("classifies claude install native installs", () => {
    const homeDir = createTempHome();
    const binaryPath = join(homeDir, ".claude", "local", "claude");
    writeFakeNativeBinary(binaryPath);
    writeClaudeConfigFile(homeDir, {
      oauthAccount: { accountUuid: "native-account-id" },
    });

    const environment = detectClaudeEnvironment({
      homeDir,
      env: { ...process.env, CLAUDE_BINARY: binaryPath },
    });

    expect(environment.installMethod).toBe("native-install");
    expect(environment.hashMode).toBe("bun");
    expect(environment.availableBackends).toEqual(["binary-salt-patch"]);
    expect(environment.binaryState?.fileKind).toBe("native-executable");
  });
});
