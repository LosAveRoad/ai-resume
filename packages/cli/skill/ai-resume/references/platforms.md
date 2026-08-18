# Harness discovery and invocation

The same `SKILL.md` is installed unchanged on all supported harnesses. The CLI chooses the native project directory:

| Harness | Project directory | Explicit invocation |
| --- | --- | --- |
| Codex | `.agents/skills/ai-resume` | `$ai-resume` |
| Claude Code | `.claude/skills/ai-resume` | `/ai-resume` |
| DeepSeek Harness | `.dsh/skills/ai-resume` | `/ai-resume` |

Install all project adapters from the repository root:

```bash
ai-resume install-skill --agent all --scope project
```

Install one adapter:

```bash
ai-resume install-skill --agent codex --scope project
ai-resume install-skill --agent claude-code --scope project
ai-resume install-skill --agent deepseek-harness --scope project
```

Use `--scope user` only when the user explicitly wants the skill available across projects. This writes to `~/.agents/skills`, `~/.claude/skills`, or `~/.dsh/skills`, respectively. Existing installations are preserved unless the user passes `--force`.

DeepSeek Harness also scans `.agents/skills`, but the CLI uses `.dsh/skills` so ownership and precedence remain explicit when Codex and DeepSeek Harness share one repository.
