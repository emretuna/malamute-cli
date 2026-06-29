import { describe, expect, it, vi, type Mock } from 'vitest';
import { runPipeline } from '../../src/orchestrator/pipeline.js';
import type { PipelineDeps } from '../../src/orchestrator/pipeline.js';
import type { ContextBuilder, BuildInput, BuildOutput } from '../../src/context/types.js';
import type { AgentRouter, RoutingRequest, RoutingDecision } from '../../src/router/types.js';
import type { ResultAggregator, AgentOutcome, AggregatedResult } from '../../src/aggregator/types.js';
import type { PolicyEngine, PolicyInput } from '../../src/policy/types.js';
import type { ActionExecutor, ActionInput } from '../../src/action/types.js';
import { ProviderError } from '../../src/errors.js';
import { defaultConfig } from '../../src/config/defaults.js';
import type { EventContext } from '../../src/types/events.js';
import type { AgentProvider, AgentTask, AgentResponse } from '../../src/agent/types.js';

function makeStubProvider(content: string): AgentProvider {
  return {
    command: 'stub',
    name: 'stub',
    isAvailable: async () => true,
    run: async (): Promise<AgentResponse> => ({ provider: 'stub', content, raw: null }),
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
  overrides: {
    provider?: AgentProvider;
    decision?: 'allow' | 'warn' | 'block';
    actionResult?: number;
  } = {},
): { deps: PipelineDeps; actionExecute: Mock<() => Promise<number>> } {
  const provider = overrides.provider ?? makeStubProvider('{"summary":"ok","findings":[]}');
  const actionExecute = vi.fn().mockResolvedValue(overrides.actionResult ?? 0);
  const contextBuilder: ContextBuilder = {
    name: 'stub',
    build: async (input: BuildInput): Promise<BuildOutput> => ({
      event: input.event.event,
      repoRoot: input.event.repoRoot,
      stagedFiles: ['a.js'],
      stagedDiff: 'diff content',
      repoTree: 'a.js',
    }),
  };
  const router: AgentRouter = {
    name: 'stub',
    route: (_req: RoutingRequest): RoutingDecision => ({ provider }),
  };
  const aggregator: ResultAggregator = {
    name: 'stub',
    aggregate: (outcomes: AgentOutcome[]): AggregatedResult => {
      const outcome = outcomes[0];
      if (outcome?.error) {
        return {
          results: [{ provider: 'stub', summary: 'err', findings: [], raw: null }],
          summary: 'err',
          findings: [],
        };
      }
      let findings: { severity: 'low' | 'medium' | 'high'; message: string }[] = [];
      let summary = outcome?.response.content ?? '';
      try {
        const parsed = JSON.parse(summary) as {
          summary?: string;
          findings?: { severity: 'low' | 'medium' | 'high'; message: string }[];
        };
        if (parsed.summary) summary = parsed.summary;
        if (Array.isArray(parsed.findings)) findings = parsed.findings;
      } catch {}
      return {
        results: [{ provider: 'stub', summary, findings, raw: null }],
        summary,
        findings,
      };
    },
  };
  const policy: PolicyEngine = {
    name: 'stub',
    evaluate: (_input: PolicyInput) => overrides.decision ?? 'allow',
  };
  const action: ActionExecutor = {
    name: 'stub',
    execute: actionExecute as unknown as (i: ActionInput) => Promise<number>,
  };
  return {
    deps: { config: defaultConfig, contextBuilder, router, aggregator, policy, action },
    actionExecute,
  };
}

describe('runPipeline', () => {
  it('runs end-to-end with allow decision and returns allow', async () => {
    const { deps, actionExecute } = makeDeps({ decision: 'allow' });
    const result = await runPipeline(baseEvent, deps);
    expect(result.decision).toBe('allow');
    expect(actionExecute).toHaveBeenCalled();
  });

  it('returns block when policy says block', async () => {
    const { deps } = makeDeps({ decision: 'block', actionResult: 1 });
    const result = await runPipeline(baseEvent, deps);
    expect(result.decision).toBe('block');
  });

  it('short-circuits when event is disabled', async () => {
    const { deps, actionExecute } = makeDeps();
    const cfg = {
      ...defaultConfig,
      events: { ...defaultConfig.events, 'pre-commit': { enabled: false, agentPrompt: 'x' } },
    };
    const result = await runPipeline(baseEvent, { ...deps, config: cfg });
    expect(result.decision).toBe('allow');
    expect(result.summary).toBe('event disabled');
    expect(actionExecute).not.toHaveBeenCalled();
  });

  it('substitutes placeholders in prompt', async () => {
    let captured: AgentTask | undefined;
    const provider: AgentProvider = {
      command: 'stub',
      name: 'stub',
      isAvailable: async () => true,
      run: async (task: AgentTask): Promise<AgentResponse> => {
        captured = task;
        return { provider: 'stub', content: '{"summary":"x","findings":[]}', raw: null };
      },
    };
    const { deps } = makeDeps({ provider, decision: 'allow' });
    await runPipeline(baseEvent, deps);
    expect(captured?.prompt).toContain('a.js');
    expect(captured?.prompt).toContain('diff content');
  });

  it('throws ProviderError when provider is unavailable', async () => {
    const unavailableProvider: AgentProvider = {
      command: 'stub',
      name: 'stub',
      isAvailable: async () => false,
      run: async (): Promise<AgentResponse> => ({ provider: 'stub', content: '', raw: null }),
    };
    const { deps } = makeDeps({ provider: unavailableProvider });
    await expect(runPipeline(baseEvent, deps)).rejects.toThrow(ProviderError);
  });
});
