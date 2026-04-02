import { describe, expect, it } from "vitest";

import { detectEmbeddedLaunch } from "../../src/cli/guard.js";

describe("launch guard", () => {
  it("allows a normal standalone shell launch", () => {
    const result = detectEmbeddedLaunch({
      env: {},
      ancestorCommands: ["/bin/zsh", "login"],
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects a Claude Code process chain", () => {
    const result = detectEmbeddedLaunch({
      env: {},
      ancestorCommands: ["/opt/homebrew/bin/claude", "/bin/zsh"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join("\n")).toContain("Claude");
  });

  it("rejects an mc proxy process chain", () => {
    const result = detectEmbeddedLaunch({
      env: {},
      ancestorCommands: ["/usr/local/bin/mc --code", "/bin/zsh"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join("\n")).toContain("mc/CatPaw");
  });

  it("rejects Claude-like terminal metadata", () => {
    const result = detectEmbeddedLaunch({
      env: {
        TERM_PROGRAM: "Claude Code",
      },
      ancestorCommands: ["/bin/zsh"],
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join("\n")).toContain("TERM_PROGRAM");
  });

  it("allows embedded launch only when explicitly bypassed", () => {
    const result = detectEmbeddedLaunch({
      env: {
        BUDDY_STUDIO_ALLOW_EMBEDDED: "1",
        TERM_PROGRAM: "Claude Code",
      },
      ancestorCommands: ["/usr/local/bin/mc --code"],
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
