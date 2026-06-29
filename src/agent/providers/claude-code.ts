import { execa } from 'execa';
import type { AgentProvider, AgentTask, AgentResponse } from '../types.js';
import { ProviderError } from '../../errors.js';

export interface ClaudeCodeOptions {
  execa?: typeof execa;
  command?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export class ClaudeCodeProvider implements AgentProvider {
  readonly name = 'claude-code';
  private readonly execaFn: typeof execa;
  readonly command: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly timeoutMs: number;

  constructor(opts: ClaudeCodeOptions = {}) {
    this.execaFn = opts.execa ?? execa;
    this.command = opts.command ?? 'claude';
    this.env = opts.env ?? process.env;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.execaFn(this.command, ['--version'], {
        env: this.env,
        reject: false,
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async run(task: AgentTask): Promise<AgentResponse> {
    const result = await this.execaFn(this.command, ['-p', task.prompt, '--output-format', 'json'], {
      cwd: task.cwd,
      env: { ...this.env, ...task.env },
      timeout: this.timeoutMs,
      reject: false,
    });

    if (result.exitCode !== 0) {
      throw new ProviderError(
        `Claude Code CLI exited with code ${result.exitCode}: ${result.stderr || result.stdout}`,
      );
    }

    const stdout = result.stdout.trim();
    let content: string;
    let parsed: unknown;

    try {
      parsed = JSON.parse(stdout);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        content = (obj.content ?? obj.result ?? stdout) as string;
      } else {
        content = stdout;
      }
    } catch {
      content = stdout;
      parsed = stdout;
    }

    return { provider: 'claude-code', content, raw: parsed };
  }
}
