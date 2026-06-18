import { describe, expect, it } from 'vitest';
import { EventRegistry } from '../../src/orchestrator/registry.js';
import { ConfigError } from '../../src/errors.js';
import { defaultConfig } from '../../src/config/defaults.js';
import type { PipelineDeps } from '../../src/orchestrator/pipeline.js';
import type { ContextBuilder } from '../../src/context/types.js';
import type { AgentRouter } from '../../src/router/types.js';
import type { ResultAggregator } from '../../src/aggregator/types.js';
import type { PolicyEngine } from '../../src/policy/types.js';
import type { ActionExecutor } from '../../src/action/types.js';

const fakeDeps: PipelineDeps = {
  config: defaultConfig,
  contextBuilder: {} as ContextBuilder,
  router: {} as AgentRouter,
  aggregator: {} as ResultAggregator,
  policy: {} as PolicyEngine,
  action: {} as ActionExecutor,
};

describe('EventRegistry', () => {
  it('resolves a registered event', () => {
    const r = new EventRegistry();
    r.register('pre-commit', fakeDeps);
    expect(r.resolve('pre-commit')).toBe(fakeDeps);
  });

  it('throws ConfigError for unregistered event', () => {
    const r = new EventRegistry();
    expect(() => r.resolve('post-commit')).toThrow(ConfigError);
  });
});
