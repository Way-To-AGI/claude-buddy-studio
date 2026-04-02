# Claude Code Buddy Studio

[English](README.md) | 简体中文

用于生成并应用自定义 Claude Code Buddy 形象的向导式 CLI/TUI。

## 功能

- 自动识别 Claude 安装形态，并优先选择最安全的后端
- 支持 macOS 下 `npm` 全局安装、Homebrew shim 安装、`claude install` 原生安装
- 在 `userID` 可信时，对基于 Node 的安装优先使用 `config-userid` 后端
- 仅在解析到的目标文件确实可打补丁时，才回退到 `binary-salt-patch` 后端
- 支持交互向导与非交互参数
- 命令：`current`、`preview`、`apply`、`restore`、`rehatch`、`doctor`、`backends`
- 期望配置持久化在 `~/.buddy-studio.json`

## 安装

```bash
pnpm install
pnpm build
```

## 使用

```bash
buddy-studio
pnpm run studio
buddy-studio current
buddy-studio doctor --json
buddy-studio apply --species cat --rarity legendary --eye '◉' --hat beanie --shiny
```

## macOS 支持矩阵

| 安装方式 | 识别方式 | 默认 hash 模式 | 优先 backend |
| --- | --- | --- | --- |
| npm 全局安装 | launcher/resolved 指向 `node_modules/@anthropic-ai/claude-code/cli.js` | `fnv1a` | `config-userid` |
| brew 安装 | `/opt/homebrew/bin/claude` 或 `/usr/local/bin/claude` 的 symlink/shim 最终指向 node CLI | `fnv1a` | `config-userid` |
| `claude install` 原生安装 | `~/.claude/local/claude` 或同路径族下的原生可执行文件 | `bun` | `binary-salt-patch` 或 `config-userid`（若身份源允许） |

`doctor` 会展示 launcher 路径、实际目标文件、安装类型、hash 模式，以及各后端可用或不可用的原因。

## 启动边界

- 交互式 TUI 请在普通 shell 终端中启动。
- 请勿在 Claude Code 或 `mc --code` 代理终端内启动。
- 若 Buddy Studio 检测到 Claude/代理启动链，将拒绝启动交互向导，并提示你在独立 shell 中运行 `buddy-studio` 或 `pnpm run studio`。

## 安全模型

- `config-userid` 会写入 Claude 本地状态，并附带备份与可恢复元数据
- `binary-salt-patch` 作为兼容回退，会给出更醒目的警告
- `restore` 根据已保存的恢复元数据撤销上一次应用结果

## 开发

```bash
pnpm check
pnpm test
pnpm build
pnpm run studio
```
