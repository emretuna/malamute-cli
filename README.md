# 🐺 Malamute

> Repository Intelligence for AI-Native Teams

Malamute is an AI orchestration layer that keeps code, documentation, architecture records, and repository knowledge synchronized through Git-native agents.

Unlike traditional Git hook tools that run scripts, Malamute runs specialized AI agents during repository events such as commits, pushes, pull requests, and releases.

## Install

```bash
npm i -g malamute-cli
```

This drops the `malamute` binary on your `PATH`. Verify with:

```bash
malamute --version
```

For a project-local install (recommended when the team shares a single lockfile):

```bash
npm i -D malamute-cli
```

The bundled git hook will fall back to `./node_modules/.bin/malamute` when no global `malamute` is on `PATH`, so either install method works with `malamute init` out of the box.

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

After [`malamute-cli` is installed](#install):

```bash
# Inside the git repository you want to wire up:
cd your-repo
malamute init          # drops the pre-commit hook into .malamute/hooks/

# Stage a change and watch the pipeline run:
echo "console.log('hi')" > x.js
git add x.js
malamute run pre-commit
# Equivalent: just `git commit -m "..."` — the hook invokes the same pipeline.
```

### Build from source

```bash
git clone https://github.com/your-org/malamute-cli
cd malamute-cli
npm install
npm run build
node dist/cli/index.js --version
```

## Sample Usage

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
```

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

## Supported Events (Foundation)

The foundation ships with the `pre-commit` pipeline wired end-to-end. The CLI accepts all four event names, but `post-commit`, `pre-push`, and `post-merge` are safe no-ops until their dedicated hook scripts and pipelines are added in a follow-up plan. The `init` step installs only the hook files that exist in the bundled `dist/hooks/` directory, so adding `src/hooks/post-commit` (or any sibling) and re-running `npm run build` is enough to make it installable — no further wiring required.

## Requirements

- Node.js >= 20
- A git repository to operate on
- An installed agent CLI (default: `claude` from Claude Code). The foundation refuses to start the pipeline if the provider is not on `PATH` and surfaces a `ProviderError` with a clear message.
