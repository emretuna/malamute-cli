import type { Config } from '../config/index.js';
import type { ProviderRegistry } from '../agent/registry.js';
import { ProviderRegistry as ProviderRegistryClass } from '../agent/registry.js';
import { registerDefaults } from '../agent/providers/index.js';
import { DefaultRouter } from '../router/index.js';
import { DefaultContextBuilder } from '../context/index.js';
import { DefaultAggregator } from '../aggregator/index.js';
import { DefaultPolicyEngine } from '../policy/index.js';
import { DefaultExecutor } from '../action/index.js';
import { EventRegistry } from './registry.js';
import { runPipeline } from './pipeline.js';
import type { EventContext } from '../types/events.js';
import type { PipelineResult } from '../types/result.js';

export interface Orchestrator {
  providers: ProviderRegistry;
  events: EventRegistry;
  runPipeline: (event: EventContext) => Promise<PipelineResult>;
}

export function createDefaultRegistry(config: Config): Orchestrator {
  const providers = new ProviderRegistryClass();
  registerDefaults(providers, config);

  const router = new DefaultRouter(providers);
  const events = new EventRegistry();

  events.register('pre-commit', {
    config,
    contextBuilder: new DefaultContextBuilder(),
    router,
    aggregator: new DefaultAggregator(),
    policy: new DefaultPolicyEngine(),
    action: new DefaultExecutor(),
  });

  return {
    providers,
    events,
    runPipeline: (eventCtx) => runPipeline(eventCtx, events.resolve(eventCtx.event)),
  };
}
