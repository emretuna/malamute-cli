# Test coverage analysis

## Summary

109 fundamental behaviors identified across 8 modules. 82 Covered, 4 Partial, 23 Missing. The three most important gaps: (1) exit code 3 (provider unavailable) is never tested, so the `E_PROVIDER` → exit 3 path is unguarded; (2) the 4-layer config merge — specifically the `NODE_ENV` overlay — has unit tests in `config/loader.test.ts` but no end-to-end CLI test (`malamute run` against a `.malamute.prod.yaml`); (3) `getRepoTree` is exercised only as a side effect of context-builder tests and has no direct unit test or explicit assertion.

## Coverage matrix

### CLI

| Behavior | Status | Tests |
|---|---|---|
| `malamute init` installs hooks and sets core.hooksPath | Covered | T1 |
| `malamute init` reports "Already initialized" on second run | Covered | T2, T3 |
| `malamute init` detects complete install (executable pre-commit with sentinel) | Partial | T4 (tests executable bit but not sentinel check) |
| `malamute init` re-installs when pre-commit is missing | Covered | T5 |
| `malamute run <event>` runs pipeline for valid event | Covered | T12, T20, T75, T76 |
| `malamute run` unknown event → exit 2 | Covered | T15 |
| `malamute run` outside git repo → exit 4 | Missing | — |
| `malamute run` with unregistered event → exit 0 "No pipeline registered" | Covered | T14 |
| `malamute run pre-commit` → exit 0 (allow) | Covered | T12, T76 |
| `malamute run pre-commit` → exit 1 (block) | Covered | T13, T75 |
| `malamute run pre-commit` provider unavailable → exit 3 | Missing | — |
| `malamute doctor` runs 5 diagnostic checks | Covered | T9 |
| `malamute doctor` sets exit 1 when any check fails | Covered | T9, T11 |
| `malamute doctor` reports all pass after clean init | Covered | T10 |
| `malamute uninstall` removes hooks and clears core.hooksPath | Covered | T7 |
| `malamute uninstall` reports not installed | Covered | T6 |
| `malamute uninstall` removes stray .malamute/ without core.hooksPath | Covered | T8 |
| `malamute config show` prints YAML | Covered | T17 |
| `malamute config validate` with defaults → "Valid." | Covered | T16 |
| `malamute config validate` with invalid config → exit 2 | Missing | — |
| `malamute config validate` with invalid config prints error | Missing | — |
| `malamute config path` prints "<none>" when absent | Covered | T18 |
| `malamute config path` prints path when present | Missing | — |
| `--version` flag prints version | Missing | — |
| Error handler: ConfigError → exit 2 | Partial | T16/T17 exercise exit 2 only through `loadConfig` error in CLI context (no dedicated handler test) |
| Error handler: ProviderError → exit 3 | Missing | — |
| Error handler: GitError → exit 4 | Missing | — |
| Error handler: HookInstallError → exit 5 | Missing | — |
| Error handler: generic Error → exit 1 with stack trace | Missing | — |
| Error handler: non-Error throw → exit 1 with String() | Missing | — |
| Pre-commit hook script resolves malamute via ancestor walk | Covered | T19 |
| Pre-commit hook script exits 1 when malamute not found | Missing | — |

### Pipeline

| Behavior | Status | Tests |
|---|---|---|
| `runPipeline` runs 7-step flow end-to-end | Covered | T20 |
| `runPipeline` returns 'allow' when no high/medium findings | Covered | T20 |
| `runPipeline` returns 'block' when policy says block | Covered | T21 |
| `runPipeline` short-circuits when event is disabled | Covered | T22 |
| `runPipeline` substitutes placeholders in prompt | Covered | T23 |
| `runPipeline` sets exit code via action executor (1 block, 0 allow) | Covered | T20, T21 |
| `runPipeline` logs summary line at info level | Covered | T24 |
| `runPipeline` reports correct decision and finding count in log | Covered | T25 |
| `runPipeline` provider unavailable → throws ProviderError out to handleError | Missing | — |
| `substitutePlaceholders` replaces `{{stagedFiles}}` and `{{diff}}` | Covered | T23 (exercised indirectly) |
| `runPipeline` non-pre-commit events get no agentPrompt (empty prompt) | Missing | — |
| `createDefaultRegistry` wires all default components | Missing | — |

### Config

| Behavior | Status | Tests |
|---|---|---|
| `loadConfig` returns defaults with no config files | Covered | T28 |
| `loadConfig` uses project `.malamute.yaml` | Covered | T29 |
| `loadConfig` merges user config over defaults | Covered | T30 |
| `loadConfig` project config wins over user config | Covered | T31 |
| `loadConfig` throws ConfigError on invalid YAML | Covered | T32 |
| `loadConfig` throws ConfigError with issue path on validation failure | Covered | T33 |
| `loadConfig` uses env-specific `.malamute.{NODE_ENV}.yaml` | Covered | T34 |
| `loadConfig` env-specific config wins over base project config | Covered | T35 |
| 4-layer merge with `NODE_ENV=prod` via CLI `malamute run` | Missing | — |
| `loadConfig` errors on unreadable files (permission, etc.) | Missing | — |

### Agent

| Behavior | Status | Tests |
|---|---|---|
| `ProviderRegistry.register` and `get` | Covered | T36 |
| `ProviderRegistry.get` returns undefined for unknown name | Covered | T37 |
| `ProviderRegistry.getOrThrow` returns provider | Covered | T38 |
| `ProviderRegistry.getOrThrow` throws ProviderError for unknown name | Covered | T39 |
| `ProviderRegistry.list` returns all providers | Covered | T40 |
| `ClaudeCodeProvider.isAvailable` → true on exit 0 | Covered | T41 |
| `ClaudeCodeProvider.isAvailable` → false on non-zero exit | Covered | T42 |
| `ClaudeCodeProvider.isAvailable` → false when execa throws | Covered | T43 |
| `ClaudeCodeProvider.run` extracts `.content` from JSON | Covered | T44 |
| `ClaudeCodeProvider.run` extracts `.result` as fallback | Covered | T45 |
| `ClaudeCodeProvider.run` uses raw stdout when not JSON | Covered | T46 |
| `ClaudeCodeProvider.run` throws ProviderError on non-zero exit | Covered | T47 |
| `ClaudeCodeProvider.run` includes stderr in error message | Covered | T48 |
| `ClaudeCodeProvider.run` passes prompt, flags, cwd, timeout to execa | Covered | T49 |
| `registerDefaults` registers ClaudeCodeProvider from config | Missing | — |

### Git

| Behavior | Status | Tests |
|---|---|---|
| `getRepoRoot` returns repo root | Covered | T69 |
| `getStagedFiles` returns staged files | Covered | T70 |
| `getStagedDiff` returns diff | Covered | T71 |
| `getStagedDiff` scoped to files | Covered | T72 |
| `getStagedDiff` returns empty for unknown file | Covered | T73 |
| `getRepoRoot` throws GitError for non-repo dir | Covered | T74 |
| `getRepoTree` returns repo file tree | Partial | T65, T66 (exercised, but no explicit assertion on `out.repoTree`) |
| `installHooks` copies files, chmods, sets core.hooksPath | Covered | T67 |
| `uninstallHooks` removes .malamute and unsets core.hooksPath | Covered | T68 |
| `getInstalledHooksPath` returns path or null | Covered | T67, T68 (indirect) |
| `getStagedFiles` throws GitError on git failure | Missing | — |
| `getStagedDiff` throws GitError on git failure | Missing | — |

### Context

| Behavior | Status | Tests |
|---|---|---|
| `DefaultContextBuilder.build` returns staged files and diff for pre-commit | Covered | T65 |
| `DefaultContextBuilder.build` returns empty staged for non-pre-commit | Covered | T66 |

### Router

| Behavior | Status | Tests |
|---|---|---|
| `DefaultRouter.route` routes to preferred provider | Covered | T57 |
| `DefaultRouter.route` routes to claude-code by default | Covered | T58 |
| `DefaultRouter.route` throws ProviderError on unknown provider | Covered | T59 |

### Aggregator

| Behavior | Status | Tests |
|---|---|---|
| `DefaultAggregator.aggregate` handles successful JSON responses | Covered | T53 |
| `DefaultAggregator.aggregate` falls back to content as summary when not JSON | Covered | T54 |
| `DefaultAggregator.aggregate` synthesizes medium finding for failed outcomes | Covered | T55 |
| `DefaultAggregator.aggregate` combines findings from multiple outcomes | Covered | T56 |

### Policy

| Behavior | Status | Tests |
|---|---|---|
| `DefaultPolicyEngine.evaluate` blocks when any finding is high | Covered | T60 |
| `DefaultPolicyEngine.evaluate` blocks when high mixed with medium/low | Covered | T61 |
| `DefaultPolicyEngine.evaluate` warns when any medium (no high) | Covered | T62 |
| `DefaultPolicyEngine.evaluate` allows when no findings | Covered | T63 |
| `DefaultPolicyEngine.evaluate` allows when only low findings | Covered | T64 |

### Action

| Behavior | Status | Tests |
|---|---|---|
| `DefaultExecutor.execute` allow → stdout + return 0 | Covered | T50 |
| `DefaultExecutor.execute` warn → stderr + return 0 | Covered | T51 |
| `DefaultExecutor.execute` block → stderr + return 1 | Covered | T52 |
| `DefaultExecutor.execute` block includes file:line in output | Covered | T52 |

### EventRegistry

| Behavior | Status | Tests |
|---|---|---|
| `EventRegistry.register` + `resolve` a registered event | Covered | T26 |
| `EventRegistry.resolve` throws ConfigError for unregistered event | Covered | T27 |

### Logger

| Behavior | Status | Tests |
|---|---|---|
| `setLevel` changes logging threshold | Partial | T24, T25 (exercised in setup, not directly asserted) |
| Log levels gate output (debug/info/warn/error filter) | Missing | — |
| Error/warn logs → stderr; info/debug → stdout | Missing | — |

### Errors

| Behavior | Status | Tests |
|---|---|---|
| `MalamuteError` base class with code | Covered | T32, T33, T39, T47 (used implicitly) |
| `ConfigError` has code E_CONFIG | Covered | T32, T33 |
| `ProviderError` has code E_PROVIDER | Covered | T39, T47 |
| `GitError` has code E_GIT | Covered | T74 |
| `HookInstallError` has code E_HOOK_INSTALL | Missing | — |

## Gap list

- **exit code 3 (ProviderError → E_PROVIDER)**: Silent if the `claude` binary is missing on a user's machine. The pipeline's `isAvailable` check throws ProviderError, `handleError` maps it to exit 3, but no test covers this path. End users would see a raw error, not a tested UX.
- **exit code 4 (GitError → E_GIT)**: A `malamute run` invocation outside a git repo should exit 4. The only test running outside a git repo is `config validate`/`show`, which call `loadConfig` but not `getRepoRoot`. A user accidentally invoking `malamute run` in a non-repo directory will get an unverified exit code.
- **exit code 5 (HookInstallError → E_HOOK_INSTALL)**: If hook installation or removal fails (permissions, read-only filesystem), the CLI reports `HookInstallError`, but the exit code 5 path is untested.
- **`malamute config validate` with invalid config → exit 2**: The `config validate` command has an exit 2 branch for invalid config, but the CLI test only validates the default-valid case. A regression would silently change exit behavior.
- **`malamute config validate` with invalid config prints error**: The validation error message format for CLI users is unasserted.
- **`malamute config path` when project config exists**: Only the absent-config case is tested; the "present" path returns a file path with no assertion.
- **`malamute run` outside git repo → exit 4**: The `runCommand` function checks `getRepoRoot` and exits 4 on failure. No test exercises this.
- **`malamute run pre-commit` provider unavailable → exit 3**: Pipeline throws ProviderError, `handleError` sets exit 3. Not tested at any level.
- **Error handler: generic Error → exit 1**: If a non-MalamuteError occurs inside any command, `handleError` prints stack trace and exits 1. No test triggers this path.
- **Error handler: non-Error throw → exit 1**: `handleError` catches non-Error throws and calls `String()`. Very unlikely but untested.
- **`--version` flag**: Commander version flag is wired but never tested.
- **Pre-commit hook script exits 1 when malamute not found**: The `pre-commit` bash script prints a message and exits 1 if no `malamute` binary is found. No test verifies this fallback.
- **`runPipeline` non-pre-commit events get no agentPrompt**: The pipeline filters `agentPrompt` for `event !== 'pre-commit'`, resulting in an empty prompt. Not explicitly tested (T14 tests the "no pipeline registered" path for non-pre-commit, not this branch).
- **`getRepoTree` assertion**: `getRepoTree` is called during context building but no assertion verifies its output shape or content.
- **`getStagedFiles` throws GitError**: Error path (non-git dir, broken repo) not tested for `getStagedFiles`.
- **`getStagedDiff` throws GitError**: Error path not tested for `getStagedDiff`.
- **`loadConfig` errors on unreadable files**: If a config file exists but is unreadable (permission error), `loadConfig` throws. No test covers this.
- **`setLevel` / log gating / stderr routing**: Logger stream routing (error/warn to stderr, info/debug to stdout) and level gating are not explicitly tested.
- **`registerDefaults` wiring**: The function that connects config to the `ClaudeCodeProvider` registration is tested only through integration tests; no unit test verifies it reads `config.providers['claude-code']` correctly.
- **`createDefaultRegistry` wiring**: The orchestrator factory function is not unit-tested; only exercised through end-to-end tests.
- **`malamute init` sentinel check**: `isFullyInstalled` checks the hook file contains `# malamute hook`. No test covers the case where the file exists but lacks the sentinel (would cause re-install). Only the executable-bit check is tested (T4).
- **`HookInstallError` behavior**: The error class exists but is never thrown in a test.
- **4-layer config merge end-to-end**: The `NODE_ENV` overlay has thorough unit tests (T34, T35) but no CLI-level scenario (`NODE_ENV=prod malamute run pre-commit` against `.malamute.prod.yaml`).

## Appendix: Test inventory

| ID | Title | File |
|---|---|---|
| T1 | installs hooks and sets core.hooksPath | `tests/cli/init.test.ts` |
| T2 | says "Already initialized" on second run | `tests/cli/init.test.ts` |
| T3 | first init creates the hooks, second init says Already initialized | `tests/cli/init-idempotent.test.ts` |
| T4 | treats install as complete when pre-commit is executable even if other files are not | `tests/cli/init-idempotent.test.ts` |
| T5 | re-installs when pre-commit is missing | `tests/cli/init-idempotent.test.ts` |
| T6 | reports not installed when no hooks are wired | `tests/cli/uninstall.test.ts` |
| T7 | removes the hooks directory and clears core.hooksPath after init | `tests/cli/uninstall.test.ts` |
| T8 | cleans a stray .malamute/ directory even when core.hooksPath is unset | `tests/cli/uninstall.test.ts` |
| T9 | reports all checks failing before init | `tests/cli/doctor.test.ts` |
| T10 | reports all checks passing after a clean init | `tests/cli/doctor.test.ts` |
| T11 | detects a half-broken install (hooks dir removed) | `tests/cli/doctor.test.ts` |
| T12 | exits 0 when provider returns no findings | `tests/cli/run.test.ts` |
| T13 | exits 1 when provider returns high-severity finding | `tests/cli/run.test.ts` |
| T14 | exits 0 for non-pre-commit events (no pipeline registered) | `tests/cli/run.test.ts` |
| T15 | exits 2 for unknown event | `tests/cli/run.test.ts` |
| T16 | validate succeeds with defaults | `tests/cli/config.test.ts` |
| T17 | show prints YAML | `tests/cli/config.test.ts` |
| T18 | path prints <none> when no project config | `tests/cli/config.test.ts` |
| T19 | finds node_modules/.bin/malamute via ancestor walk when invoked from .malamute/hooks | `tests/cli/hook-resolution.test.ts` |
| T20 | runs end-to-end with allow decision and returns allow | `tests/orchestrator/pipeline.test.ts` |
| T21 | returns block when policy says block | `tests/orchestrator/pipeline.test.ts` |
| T22 | short-circuits when event is disabled | `tests/orchestrator/pipeline.test.ts` |
| T23 | substitutes placeholders in prompt | `tests/orchestrator/pipeline.test.ts` |
| T24 | emits a single info line summarizing the run | `tests/orchestrator/pipeline-summary.test.ts` |
| T25 | reports the correct decision and finding count | `tests/orchestrator/pipeline-summary.test.ts` |
| T26 | resolves a registered event | `tests/orchestrator/registry.test.ts` |
| T27 | throws ConfigError for unregistered event | `tests/orchestrator/registry.test.ts` |
| T28 | returns defaults when no config files exist | `tests/config/loader.test.ts` |
| T29 | uses project .malamute.yaml when present | `tests/config/loader.test.ts` |
| T30 | merges user config over defaults | `tests/config/loader.test.ts` |
| T31 | project config wins over user config | `tests/config/loader.test.ts` |
| T32 | throws ConfigError on invalid YAML | `tests/config/loader.test.ts` |
| T33 | throws ConfigError with issue path on validation failure | `tests/config/loader.test.ts` |
| T34 | uses env-specific .malamute.{NODE_ENV}.yaml when set | `tests/config/loader.test.ts` |
| T35 | env-specific config wins over base project config | `tests/config/loader.test.ts` |
| T36 | register and get | `tests/agent/registry.test.ts` |
| T37 | get returns undefined for unknown name | `tests/agent/registry.test.ts` |
| T38 | getOrThrow returns the provider | `tests/agent/registry.test.ts` |
| T39 | getOrThrow throws ProviderError for unknown name | `tests/agent/registry.test.ts` |
| T40 | list returns all registered providers | `tests/agent/registry.test.ts` |
| T41 | isAvailable returns true when execa returns exit code 0 | `tests/agent/claude-code.test.ts` |
| T42 | isAvailable returns false on non-zero exit | `tests/agent/claude-code.test.ts` |
| T43 | isAvailable returns false when execa throws | `tests/agent/claude-code.test.ts` |
| T44 | run extracts .content from JSON output | `tests/agent/claude-code.test.ts` |
| T45 | run extracts .result from JSON output as fallback | `tests/agent/claude-code.test.ts` |
| T46 | run falls back to raw stdout when output is not JSON | `tests/agent/claude-code.test.ts` |
| T47 | run throws ProviderError on non-zero exit | `tests/agent/claude-code.test.ts` |
| T48 | run includes stderr in error message | `tests/agent/claude-code.test.ts` |
| T49 | passes prompt and flags to execa | `tests/agent/claude-code.test.ts` |
| T50 | allow prints summary to stdout and returns 0 | `tests/action/default.test.ts` |
| T51 | warn prints WARN to stderr and returns 0 | `tests/action/default.test.ts` |
| T52 | block prints BLOCK to stderr and returns 1 | `tests/action/default.test.ts` |
| T53 | aggregates successful JSON responses | `tests/aggregator/default.test.ts` |
| T54 | falls back to content as summary when not JSON | `tests/aggregator/default.test.ts` |
| T55 | synthesizes a medium finding for failed outcomes | `tests/aggregator/default.test.ts` |
| T56 | combines findings and summaries from multiple outcomes | `tests/aggregator/default.test.ts` |
| T57 | routes to the preferred provider when registered | `tests/router/default.test.ts` |
| T58 | routes to claude-code by default | `tests/router/default.test.ts` |
| T59 | throws ProviderError on unknown provider | `tests/router/default.test.ts` |
| T60 | block when any finding is high | `tests/policy/default.test.ts` |
| T61 | block when high mixed with medium/low | `tests/policy/default.test.ts` |
| T62 | warn when any finding is medium (no high) | `tests/policy/default.test.ts` |
| T63 | allow when no findings | `tests/policy/default.test.ts` |
| T64 | allow when only low findings | `tests/policy/default.test.ts` |
| T65 | returns staged files and diff for pre-commit | `tests/context/default.test.ts` |
| T66 | returns empty staged fields for non-pre-commit | `tests/context/default.test.ts` |
| T67 | installHooks copies files, chmods, and sets core.hooksPath | `tests/git/hooks.test.ts` |
| T68 | uninstallHooks removes .malamute and unsets core.hooksPath | `tests/git/hooks.test.ts` |
| T69 | getRepoRoot returns the repo root | `tests/git/diff.test.ts` |
| T70 | getStagedFiles returns staged files | `tests/git/diff.test.ts` |
| T71 | getStagedDiff returns the diff | `tests/git/diff.test.ts` |
| T72 | getStagedDiff scoped to files | `tests/git/diff.test.ts` |
| T73 | getStagedDiff returns empty for unknown file | `tests/git/diff.test.ts` |
| T74 | getRepoRoot throws GitError for non-repo dir | `tests/git/diff.test.ts` |
| T75 | blocks commit on high-severity finding | `tests/integration/end-to-end.test.ts` |
| T76 | allows commit when no findings | `tests/integration/end-to-end.test.ts` |
