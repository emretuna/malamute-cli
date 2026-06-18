import type { Config, PreCommitEventConfig } from './schema.js';

export const defaultConfig: Config = {
  version: 1,
  logLevel: 'info',
  providers: {
    'claude-code': { command: 'claude', timeoutMs: 60_000 },
  },
  events: {
    'pre-commit': {
      enabled: true,
      agentPrompt: `You are a code review assistant analyzing staged changes.

Review the following staged files and diff for potential issues. Return a JSON object with this exact shape:

{
  "summary": "Overall assessment of the changes",
  "findings": [
    {
      "severity": "low" | "medium" | "high",
      "message": "Description of the issue",
      "file": "filename (optional)",
      "line": 42 (optional)
    }
  ]
}

Focus on:
- Security vulnerabilities
- Logic errors or bugs
- Hardcoded secrets or credentials
- Debugging leftovers (console.log, debugger, TODO that should be addressed)
- Type safety issues
- Error handling gaps

Rules:
- If no issues found, return an empty findings array.
- Be concise and specific in findings.
- Set severity to "high" for blocking issues (security vulnerabilities, hardcoded secrets, logic bugs that would cause runtime failures).
- Set severity to "medium" for significant concerns that should be addressed.
- Set severity to "low" for minor style or documentation suggestions.

Staged files:
{{stagedFiles}}

Diff:
{{diff}}`,
    } satisfies PreCommitEventConfig,
  },
};
