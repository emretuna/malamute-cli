import type { AgentResult } from '../types/result.js';
import type { Config } from '../config/index.js';

export interface PolicyInput {
  result: AgentResult;
  config: Config;
}

export interface PolicyEngine {
  readonly name: string;
  evaluate(input: PolicyInput): 'allow' | 'warn' | 'block';
}
