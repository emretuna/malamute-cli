import type { ActionDecision, Finding } from '../types/result.js';

export interface ActionInput {
  decision: ActionDecision;
  findings: Finding[];
  summary: string;
}

export interface ActionExecutor {
  readonly name: string;
  execute(input: ActionInput): Promise<number>;
}
