# Claude Code Buddy Studio

Wizard-style CLI/TUI for generating and applying custom Claude Code buddy profiles.

## Features

- Auto-detects Claude install shape and picks the safest backend first
- Primary `config-userid` backend for npm/node installs
- Fallback `binary-salt-patch` backend for installs that need salt patching
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
pnpm dev
pnpm dev -- current
pnpm dev -- doctor --json
pnpm dev -- apply --species cat --rarity legendary --eye '◉' --hat beanie --shiny
```

## Safety model

- `config-userid` writes Claude local state with backup + restore metadata
- `binary-salt-patch` is treated as compatibility fallback and warns more aggressively
- `restore` reverts the last applied state using saved restore metadata

## Development

```bash
pnpm check
pnpm test
pnpm build
```
