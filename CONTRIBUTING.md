# Contributing to Malamute

Thanks for your interest. This document covers the day-to-day work of cutting a release.

## Development setup

git clone https://github.com/emretuna/malamute-cli
cd malamute-cli
npm install
npm run build
node dist/cli/index.js --version

````

The `npm` scripts you'll use most:

- `npm run typecheck` — `tsc --noEmit`
- `npm test` — `vitest run`
- `npm run lint` — `eslint src tests`
- `npm run format:check` — `prettier --check .`
- `npm run build` — `tsup` (produces `dist/`)

Run all of the above before opening a PR. CI does the same on every push.

## Repository layout

- `src/cli/` — the entrypoint and subcommands (`init`, `run`, `config`, `doctor`)
- `src/agent/` — `AgentProvider` interface, `ProviderRegistry`, and the `ClaudeCodeProvider` reference adapter
- `src/context/`, `src/policy/`, `src/router/`, `src/aggregator/`, `src/action/` — pipeline component defaults; each has a `types.ts` and a `default.ts`
- `src/orchestrator/` — the pipeline that wires the components together
- `src/hooks/` — bash templates copied into user repos on `malamute init`
- `tests/` — mirrors `src/`

## Cutting a release

Releases are tag-driven. CI (`.github/workflows/publish.yml`) runs `typecheck`, `test`, and `build` on every `v*` tag, then publishes to npm with provenance.

### One-time setup

1. Create an npm automation token at https://www.npmjs.com/settings/tokens. **Token type: Automation.** Enable "Bypass 2FA" if the option appears.
2. **2FA mode matters.** If your npm account's 2FA mode is "authorization-and-publishing" (the default for new accounts with 2FA enabled), even an Automation token will fail with `EOTP` at publish time. Switch to "automation-and-publishing" mode at https://www.npmjs.com/settings (or wherever the 2FA settings live in your account) so CI can publish without a one-time password. Without this switch, every publish will fail with `This operation requires a one-time password from your authenticator.`
3. **The `repository` field in `package.json` must match the GitHub URL.** The publish workflow uses `--provenance`, which generates a Sigstore bundle that includes the GitHub repo URL. npm validates that `package.json`'s `repository.url` matches the bundle's URL, and rejects the publish with `E422 — Failed to validate repository information` if they don't. If the repo URL ever changes, update `package.json` to match.
4. In the GitHub repo, go to Settings → Secrets and variables → Actions → New repository secret. Name: `NPM_TOKEN`, value: paste the token.
5. Confirm the package name is available: `npm view malamute-cli`. A 404 means available; a response means taken.

```bash
# On main, with a clean working tree
git checkout main
git pull

# Pick the bump
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (new features, backward compatible)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)

# Push the commit and the tag
git push --follow-tags
````

GitHub Actions picks up the `v*` tag, runs the publish workflow, and the new version lands on npm within ~30 seconds. Watch the run from the Actions tab.

### Recovering from a failed release

If the publish workflow fails after the tag is pushed:

```bash
# Delete the local and remote tag
git tag -d v0.x.y
git push origin :refs/tags/v0.x.y

# Fix the issue, then re-tag
git push --follow-tags
```

The `publish.yml` workflow runs on tag push, so the re-tag will trigger a fresh publish attempt.

If a version was already published to npm and you need to fix it, you cannot overwrite it. Publish a new patch version that contains the fix and yank the broken one (`npm unpublish malamute-cli@0.x.y` — only allowed within 72 hours, only for versions published less than 24h ago).

## CI

`ci.yml` runs on every PR and every push to `main`. It runs the same checks as a local pre-commit should. The publish workflow only runs on tag pushes (and on manual `workflow_dispatch` from the Actions UI), so a failed PR cannot publish to npm.

## Adding a new agent provider

1. Implement `AgentProvider` in `src/agent/providers/<name>.ts` (use `claude-code.ts` as the template).
2. Register it in `registerDefaults` inside `src/agent/providers/index.ts`.
3. Add a config block in `src/config/schema.ts` under `providers` for any provider-specific options.
4. Add tests in `tests/agent/<name>.test.ts`. The existing `claude-code.test.ts` is the template.
5. Update `malamute.example.yaml` with the new field.

## Adding a new event hook

1. Create `src/hooks/<event-name>` (bash, executable). Use `src/hooks/pre-commit` as the template.
2. tsup's inline plugin copies every file in `src/hooks/` to `dist/hooks/` on each build.
3. Wire the pipeline for the event in `src/orchestrator/index.ts` (add `events.register('<event-name>', { ... })`).
4. Update `src/types/events.ts` and `src/config/schema.ts` if the schema needs a new event block.
5. Add integration tests under `tests/integration/`.

## Reporting issues

Open a GitHub issue with:

- What you ran (command + flags + working directory)
- What you expected
- What happened (full output, including any `malamute doctor` output)
- `malamute --version` and `node --version`
