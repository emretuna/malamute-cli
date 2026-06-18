# 🐺 Malamute

> Repository Intelligence for AI-Native Teams

Malamute is an AI orchestration layer that keeps code, documentation, architecture records, and repository knowledge synchronized through Git-native agents.

Unlike traditional Git hook tools that run scripts, Malamute runs specialized AI agents during repository events such as commits, pushes, pull requests, and releases.

## Install

Pick the install mode that matches your team's setup. Either way, the bundled git hook resolves the binary on its own — you do not need to manage `PATH` for `git commit` to work.

> If `git commit` doesn't run the pipeline, run `npx malamute doctor`. It prints a checklist covering `core.hooksPath`, hook file presence and permissions, and whether the `malamute` binary resolves from the hook's vantage point.

### Global install

```bash
npm i -g malamute-cli
```

Drops `malamute` on your `PATH`. Use this when you want the short command available in every shell session. Verify with `malamute --version`.

### Project-local install

```bash
npm i -D malamute-cli
```

The binary lands in `./node_modules/.bin/malamute`. From inside the project directory, use `npx malamute ...` (or `./node_modules/.bin/malamute ...`) for one-off commands:

```bash
npx malamute init
npx malamute run pre-commit
npx malamute config show
```

The git hook that `malamute init` installs walks upward to find the binary, so `git commit` works without `npx` and without any extra setup — even from sub-directories of monorepos. To get the short `malamute` command in your shell for that project, run `npm link` once inside it.

## Uninstall

To remove the hook (and the `core.hooksPath` config) from a repository:

```bash
npx malamute uninstall
```

This deletes `.malamute/hooks/`, removes the `.malamute/` directory, and unsets `core.hooksPath`. If the package itself is no longer installed, the manual fallback is the same three steps:

```bash
git config --unset core.hooksPath
rm -rf .malamute
```

> If `git commit` is failing with `malamute: CLI not found.` and exit code 1, the hook is still wired in this repo but the binary is gone. Run `npx malamute uninstall` to clean it up.

## Why Malamute?

Modern engineering teams increasingly use coding agents such as Claude Code, Codex, Gemini CLI, OpenCode, and local models.

However, repositories quickly drift:

- Code changes but documentation is not updated.
- APIs change but examples remain stale.
- Architectural decisions are never recorded.
- Changelogs are manually maintained.
- AI-generated code lacks governance.

Malamute acts as the coordination layer between developers, AI agents, and Git.

## Features

### AI-Powered Git Hooks

Run AI agents during:

- pre-commit
- post-commit
- pre-push
- post-merge
- pull request creation
- release workflows

### Documentation Synchronization

Automatically update:

- Docusaurus documentation
- README files
- OpenAPI documentation
- Architecture Decision Records (ADRs)
- Mermaid diagrams
- Changelogs

### Multi-Agent Workflows

Run multiple specialized agents in parallel:

- Code Review Agent
- Documentation Agent
- Security Agent
- Test Coverage Agent
- Architecture Agent
- Changelog Agent

### Policy Engine

Control repository quality through rules:

- Block commits
- Warn developers
- Auto-fix issues
- Open pull requests
- Generate patches

### Provider Agnostic

Supports:

- Claude Code
- OpenAI Codex
- OpenCode
- Gemini CLI
- Future ACP-compatible agents

## Quick Start

Pick the path that matches your install. Both end at the same place: a working pre-commit hook.

**Global install:**

```bash
cd your-repo
malamute init          # drops the pre-commit hook into .malamute/hooks/

# Stage a change and watch the pipeline run:
echo "console.log('hi')" > x.js
git add x.js
malamute run pre-commit
# Equivalent: just `git commit -m "..."` — the hook invokes the same pipeline.
```

**Project-local install** (no `PATH` setup needed for `git commit`):

```bash
cd your-repo
npx malamute init
echo "console.log('hi')" > x.js
git add x.js
git commit -m "first commit"   # the hook runs the pipeline automatically
```

### Build from source

git clone https://github.com/emretuna/malamute-cli
cd malamute-cli
npm install
npm run build
node dist/cli/index.js --version

````

## Sample Usage

> All examples below use the short `malamute` command. If you installed project-locally, prefix with `npx` — the CLI surface is identical.

### 1. Configure Malamute for your repo

Copy [`malamute.example.yaml`](./malamute.example.yaml) to `.malamute.yaml` in your repository root and customize:

```yaml
version: 1
logLevel: info

providers:
  claude-code:
    command: claude
    timeoutMs: 60000

events:
  pre-commit:
    enabled: true
    agentPrompt: |
      Review the staged changes for bugs, security issues, and hardcoded secrets.
      Return JSON: { "summary": "...", "findings": [...] }
      Staged files: {{stagedFiles}}
      Diff: {{diff}}
````

The `{{stagedFiles}}` and `{{diff}}` placeholders are substituted with the actual staged content at runtime.

### 2. Run the pipeline manually

The CLI exposes the same pipeline that the hook runs:

```bash
# Inside any git repository, with a staged change:
echo "console.log('hi')" > x.js
git add x.js
malamute run pre-commit
```

Exit codes:

- `0` — pipeline passed (allow) or produced only warnings
- `1` — pipeline blocked the commit (high-severity finding)
- `2` — configuration error
- `3` — agent provider error (for example, `claude` CLI not installed)
- `4` — not inside a git repository
- `5` — hook installation error

To confirm the agent actually responded (not just that the hook exited 0), look for the one-line summary the pipeline writes to stdout at `info` level (the default):

```json
{
  "ts": "2026-06-18T...",
  "level": "info",
  "msg": "pre-commit pipeline: warn in 1823ms (provider=claude-code, findings=1)"
}
```

Fields:

- `warn` / `allow` / `block` — the policy decision
- `1823ms` — total pipeline duration (agent call + aggregation + policy). Stub providers return in 0–5ms; real `claude` is typically 1–15s.
- `provider=claude-code` — which provider answered (any value other than `claude-code` means a different provider is configured)
- `findings=N` — number of findings the agent returned

If the line never appears, the hook never ran. Run `malamute doctor` to diagnose.

### 3. Disable a hook for one commit

```bash
malamute run pre-commit  # exit 0 → commit proceeds
# Equivalent git-side bypass: SKIP=pre-commit git commit -m "..."
```

Set `events.pre-commit.enabled: false` in `.malamute.yaml` to skip the pipeline entirely.

### 4. Inspect and debug

```bash
malamute --version
malamute config validate
malamute config path         # prints the project config path (or <none>)
malamute config show         # prints the merged config as YAML

# Set the log level for a single run:
MalamUTE_LOG_LEVEL=debug malamute run pre-commit
```

### 5. How a finding flows through the pipeline

1. **Context Builder** — collects staged files, the staged diff, and the repo tree.
2. **Router** — picks the configured agent provider (defaults to `claude-code`).
3. **Agent** — invokes `claude -p <prompt> --output-format json` with the rendered prompt.
4. **Aggregator** — parses the JSON response into `{ summary, findings }`. Provider failures surface as a `medium`-severity finding rather than being silently dropped.
5. **Policy** — maps severity to a decision: any `high` blocks, any `medium` warns, otherwise allows.
6. **Action** — prints the summary and findings to stderr, and returns the exit code the CLI uses to block the commit.

### 6. Programmatic shape

```ts
import { loadConfig } from 'malamute/config';
import { createDefaultRegistry } from 'malamute/orchestrator';

const config = await loadConfig(process.cwd());
const orchestrator = createDefaultRegistry(config);

const result = await orchestrator.runPipeline({
  event: 'pre-commit',
  cwd: process.cwd(),
  repoRoot: process.cwd(),
  env: process.env,
  args: [],
});
// result.decision: "allow" | "warn" | "block"
// result.findings: Finding[]
// result.summary: string
```

## Contributing

Maintainers: see [CONTRIBUTING.md](./CONTRIBUTING.md) for the release flow, including the `NPM_TOKEN` setup, `npm version` workflow, and how to recover from a failed publish.

## Supported Events (Foundation)

The foundation ships with the `pre-commit` pipeline wired end-to-end. The CLI accepts all four event names, but `post-commit`, `pre-push`, and `post-merge` are safe no-ops until their dedicated hook scripts and pipelines are added in a follow-up plan. The `init` step installs only the hook files that exist in the bundled `dist/hooks/` directory, so adding `src/hooks/post-commit` (or any sibling) and re-running `npm run build` is enough to make it installable — no further wiring required.

## Requirements

- Node.js >= 20
- A git repository to operate on
- An installed agent CLI (default: `claude` from Claude Code). The foundation refuses to start the pipeline if the provider is not on `PATH` and surfaces a `ProviderError` with a clear message.
