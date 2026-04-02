import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { createTempHome, writeClaudeConfigFile, writeFakeBinary } from "../helpers.js";

describe("CLI doctor", () => {
  it("prints detected environment information", () => {
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

    const output = execFileSync(
      "pnpm",
      ["exec", "tsx", "src/index.ts", "doctor", "--json"],
      {
        cwd: "/Users/rax/Desktop/buddy-studio",
        env: {
          ...process.env,
          HOME: homeDir,
          CLAUDE_BINARY: binaryPath,
        },
        encoding: "utf8",
      },
    );

    expect(output).toContain("环境信息");
    expect(output).toContain("\"installMethod\": \"npm-global-node\"");
    expect(output).toContain("\"availableBackends\"");
    expect(output).toContain("\"resolvedBinaryPath\"");
  });
});
