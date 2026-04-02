# Claude Code Buddy Studio

English | [简体中文](README.zh-CN.md)

Wizard-style CLI/TUI for generating and applying custom Claude Code buddy profiles.

## Features

- Auto-detects Claude install shape and picks the safest backend first
- Supports macOS `npm` global install, Homebrew shim install, and `claude install` native install
- Primary `config-userid` backend for node-based installs when `userID` is authoritative
- Fallback `binary-salt-patch` backend only when the resolved target file is actually patchable
- Interactive wizard plus non-interactive flags
- Commands: `current`, `preview`, `apply`, `restore`, `rehatch`, `doctor`, `backends`
- Persisted desired profile in `~/.buddy-studio.json`

## Install

```bash
pnpm install
pnpm build
```

## Usage

```bash
buddy-studio
pnpm run studio
buddy-studio current
buddy-studio doctor --json
buddy-studio apply --species cat --rarity legendary --eye '◉' --hat beanie --shiny
```

## macOS support matrix

| Install method | How it is detected | Default hash mode | Preferred backend |
| --- | --- | --- | --- |
| npm global | Launcher/resolved path points at `node_modules/@anthropic-ai/claude-code/cli.js` | `fnv1a` | `config-userid` |
| Homebrew | `/opt/homebrew/bin/claude` or `/usr/local/bin/claude` symlink/shim resolves to the node CLI | `fnv1a` | `config-userid` |
| `claude install` native | `~/.claude/local/claude` or native binary in that path family | `bun` | `binary-salt-patch` or `config-userid` (when the identity source allows) |

`doctor` prints the launcher path, resolved target, install kind, hash mode, and why each backend is available or not.

## Launch boundary

- Run the interactive TUI only from a normal shell terminal.
- Do not start it inside Claude Code or `mc --code` proxy terminals.
- If Buddy Studio detects a Claude/proxy launch chain, it refuses to start the interactive wizard and tells you to run `buddy-studio` or `pnpm run studio` in a standalone shell.

## Safety model

- `config-userid` writes Claude local state with backup + restore metadata
- `binary-salt-patch` is a compatibility fallback and warns more aggressively
- `restore` reverts the last applied state using saved restore metadata

## Development

```bash
pnpm check
pnpm test
pnpm build
pnpm run studio
```
