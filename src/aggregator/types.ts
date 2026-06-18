import type { AgentResponse } from '../agent/types.js';
import type { AgentResult, Finding } from '../types/result.js';

export interface AgentOutcome {
  provider: string;
  response: AgentResponse;
  error?: Error;
}

export interface AggregatedResult {
  results: AgentResult[];
  summary: string;
  findings: Finding[];
}

export interface ResultAggregator {
  readonly name: string;
  aggregate(outcomes: AgentOutcome[]): AggregatedResult;
}
