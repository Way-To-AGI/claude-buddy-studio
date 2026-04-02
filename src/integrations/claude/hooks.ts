import { createBackup } from "./fs.js";
import { readClaudeSettings, writeClaudeSettings } from "./config.js";
import type { ClaudePathOptions } from "./paths.js";

const HOOK_COMMAND = "buddy-studio apply --silent";

interface HookEntry {
  matcher: string;
  hooks: Array<{ type: "command"; command: string }>;
}

function sessionStartHooks(settings: Record<string, unknown>): HookEntry[] {
  const hooks = settings.hooks as { SessionStart?: HookEntry[] } | undefined;
  return Array.isArray(hooks?.SessionStart) ? hooks.SessionStart : [];
}

export function isApplyHookInstalled(options: ClaudePathOptions = {}): boolean {
  const settings = readClaudeSettings(options);
  return sessionStartHooks(settings).some((entry) =>
    entry.hooks.some((hook) => hook.command === HOOK_COMMAND),
  );
}

export function installApplyHook(options: ClaudePathOptions = {}): { settingsPath: string; backupPath?: string } {
  const settings = readClaudeSettings(options);
  const currentHooks = sessionStartHooks(settings);
  if (!currentHooks.some((entry) => entry.hooks.some((hook) => hook.command === HOOK_COMMAND))) {
    currentHooks.push({
      matcher: "",
      hooks: [{ type: "command", command: HOOK_COMMAND }],
    });
  }
  const nextSettings = {
    ...settings,
    hooks: {
      ...(settings.hooks as Record<string, unknown> | undefined),
      SessionStart: currentHooks,
    },
  };
  const settingsPath = writeClaudeSettings(nextSettings, options);
  return { settingsPath };
}

export function removeApplyHook(options: ClaudePathOptions = {}): string {
  const settings = readClaudeSettings(options);
  const filtered = sessionStartHooks(settings).filter(
    (entry) => !entry.hooks.some((hook) => hook.command === HOOK_COMMAND),
  );
  const nextHooks = { ...(settings.hooks as Record<string, unknown> | undefined) };
  if (filtered.length > 0) {
    nextHooks.SessionStart = filtered;
  } else {
    delete nextHooks.SessionStart;
  }
  const nextSettings = Object.keys(nextHooks).length > 0 ? { ...settings, hooks: nextHooks } : { ...settings };
  if (Object.keys(nextHooks).length === 0) {
    delete (nextSettings as { hooks?: unknown }).hooks;
  }
  return writeClaudeSettings(nextSettings, options);
}
