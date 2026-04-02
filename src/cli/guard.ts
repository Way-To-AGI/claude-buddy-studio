import { execFileSync } from "node:child_process";

export interface LaunchContext {
  env: NodeJS.ProcessEnv;
  ancestorCommands: string[];
}

export interface LaunchGuardResult {
  allowed: boolean;
  reasons: string[];
}

function looksLikeClaudeCommand(command: string): boolean {
  const normalized = command.toLowerCase();
  return (
    normalized.includes("claude code") ||
    normalized.includes("/claude") ||
    normalized.includes("@anthropic-ai/claude-code")
  );
}

function looksLikeMcProxy(command: string): boolean {
  const normalized = command.toLowerCase();
  return (
    /\bmc\b/.test(normalized) ||
    normalized.includes("catpaw") ||
    normalized.includes("mcopilot")
  );
}

export function detectEmbeddedLaunch(context: LaunchContext): LaunchGuardResult {
  const reasons: string[] = [];

  for (const command of context.ancestorCommands) {
    if (looksLikeClaudeCommand(command)) {
      reasons.push(`检测到 Claude 会话链路: ${command}`);
      continue;
    }
    if (looksLikeMcProxy(command)) {
      reasons.push(`检测到 mc/CatPaw 代理链路: ${command}`);
    }
  }

  const termProgram = context.env.TERM_PROGRAM ?? "";
  const terminalTitle =
    context.env.TERM_TITLE ??
    context.env.WINDOW_TITLE ??
    context.env.TAB_TITLE ??
    "";

  if (/claude/i.test(termProgram) || /catpaw/i.test(termProgram)) {
    reasons.push(`检测到终端程序标识: TERM_PROGRAM=${termProgram}`);
  }

  if (/claude|catpaw/i.test(terminalTitle)) {
    reasons.push(`检测到终端标题标识: ${terminalTitle}`);
  }

  if (context.env.BUDDY_STUDIO_ALLOW_EMBEDDED === "1") {
    return { allowed: true, reasons: [] };
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

function readProcessInfo(pid: number): { ppid: number; command: string } | undefined {
  try {
    const ppidOutput = execFileSync("ps", ["-o", "ppid=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
    const commandOutput = execFileSync("ps", ["-o", "command=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
    const ppid = Number.parseInt(ppidOutput, 10);
    if (!Number.isFinite(ppid)) {
      return undefined;
    }
    return {
      ppid,
      command: commandOutput,
    };
  } catch {
    return undefined;
  }
}

export function collectAncestorCommands(maxDepth = 6): string[] {
  if (process.platform === "win32") {
    return [];
  }
  const commands: string[] = [];
  let pid = process.ppid;
  for (let depth = 0; depth < maxDepth && pid > 1; depth += 1) {
    const info = readProcessInfo(pid);
    if (!info) {
      break;
    }
    commands.push(info.command);
    pid = info.ppid;
  }
  return commands;
}

export function assertStandaloneLaunch(): void {
  const result = detectEmbeddedLaunch({
    env: process.env,
    ancestorCommands: collectAncestorCommands(),
  });

  if (result.allowed) {
    return;
  }

  throw new Error(
    [
      "当前看起来是 Claude/代理终端，Buddy Studio 已拒绝启动交互界面。",
      ...result.reasons.map((reason) => `- ${reason}`),
      "请在普通 shell 终端中运行 `buddy-studio` 或 `pnpm run studio`。",
    ].join("\n"),
  );
}
