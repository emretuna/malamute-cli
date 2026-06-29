import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPipeline } from '../../src/orchestrator/pipeline.js';
import type { PipelineDeps } from '../../src/orchestrator/pipeline.js';
import type { ContextBuilder, BuildInput, BuildOutput } from '../../src/context/types.js';
import type { AgentRouter, RoutingRequest, RoutingDecision } from '../../src/router/types.js';
import type { ResultAggregator, AgentOutcome, AggregatedResult } from '../../src/aggregator/types.js';
import type { PolicyEngine, PolicyInput } from '../../src/policy/types.js';
import type { ActionExecutor, ActionInput } from '../../src/action/types.js';
import { defaultConfig } from '../../src/config/defaults.js';
import type { EventContext } from '../../src/types/events.js';
import type { AgentProvider, AgentResponse } from '../../src/agent/types.js';
import { logger } from '../../src/logger.js';

function makeProvider(): AgentProvider {
  return {
    command: 'claude',
    name: 'claude-code',
    isAvailable: async () => true,
    run: async (): Promise<AgentResponse> => ({
      provider: 'claude-code',
      content: '{"summary":"ok","findings":[]}',
      raw: null,
    }),
  };
}

const baseEvent: EventContext = {
  event: 'pre-commit',
  cwd: '/tmp/repo',
  repoRoot: '/tmp/repo',
  env: process.env,
  args: [],
};

function makeDeps(
  decision: 'allow' | 'warn' | 'block' = 'allow',
  aggregatorOverride?: ResultAggregator,
): PipelineDeps {
  const contextBuilder: ContextBuilder = {
    name: 'stub',
    build: async (input: BuildInput): Promise<BuildOutput> => ({
      event: input.event.event,
      repoRoot: input.event.repoRoot,
      stagedFiles: ['a.js'],
      stagedDiff: 'diff',
      repoTree: 'a.js',
    }),
  };
  const router: AgentRouter = {
    name: 'stub',
    route: (_req: RoutingRequest): RoutingDecision => ({ provider: makeProvider() }),
  };
  const aggregator: ResultAggregator = aggregatorOverride ?? {
    name: 'stub',
    aggregate: (outcomes: AgentOutcome[]): AggregatedResult => {
      const o = outcomes[0];
      if (o?.error) {
        return { results: [], summary: 'err', findings: [] };
      }
      return { results: [], summary: 'ok', findings: [] };
    },
  };
  const policy: PolicyEngine = {
    name: 'stub',
    evaluate: (_input: PolicyInput) => decision,
  };
  const action: ActionExecutor = {
    name: 'stub',
    execute: async (_input: ActionInput) => 0,
  };
  return { config: defaultConfig, contextBuilder, router, aggregator, policy, action };
}

describe('runPipeline summary log', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.setLevel('info');
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('emits a single info line summarizing the run', async () => {
    const deps = makeDeps('allow');
    await runPipeline(baseEvent, deps);

    const stdoutCalls = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const logLine = stdoutCalls.split('\n').find((line) => line.includes('"level":"info"'));
    expect(logLine).toBeDefined();
    const parsed = JSON.parse(logLine!) as { msg: string };
    expect(parsed.msg).toMatch(/^pre-commit pipeline: allow in \d+ms /);
    expect(parsed.msg).toContain('provider=claude-code');
    expect(parsed.msg).toContain('findings=0');
  });

  it('reports the correct decision and finding count', async () => {
    const aggregator: ResultAggregator = {
      name: 'stub',
      aggregate: () => ({
        results: [],
        summary: 'two',
        findings: [
          { severity: 'medium', message: 'a' },
          { severity: 'low', message: 'b' },
        ],
      }),
    };
    const deps = makeDeps('warn', aggregator);
    await runPipeline(baseEvent, deps);

    const stdoutCalls = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const logLine = stdoutCalls.split('\n').find((line) => line.includes('"level":"info"'));
    expect(logLine).toBeDefined();
    const parsed = JSON.parse(logLine!) as { msg: string };
    expect(parsed.msg).toMatch(/^pre-commit pipeline: warn in \d+ms /);
    expect(parsed.msg).toContain('findings=2');
  });
});
