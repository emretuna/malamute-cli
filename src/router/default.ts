import type { AgentRouter, RoutingRequest, RoutingDecision } from './types.js';
import type { ProviderRegistry } from '../agent/registry.js';

export class DefaultRouter implements AgentRouter {
  readonly name = 'default';

  constructor(private readonly registry: ProviderRegistry) {}

  route(req: RoutingRequest): RoutingDecision {
    const provider = this.registry.getOrThrow(req.preferredProvider ?? 'claude-code');
    return { provider };
  }
}
