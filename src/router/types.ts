import type { AgentProvider, AgentTask } from '../agent/types.js';

export interface RoutingRequest {
  task: AgentTask;
  preferredProvider?: string;
}

export interface RoutingDecision {
  provider: AgentProvider;
}

export interface AgentRouter {
  readonly name: string;
  route(req: RoutingRequest): RoutingDecision;
}
