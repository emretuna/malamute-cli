export type ActionDecision = 'allow' | 'warn' | 'block';

export interface Finding {
  severity: 'low' | 'medium' | 'high';
  message: string;
  file?: string;
  line?: number;
}

export interface AgentResult {
  provider: string;
  summary: string;
  findings: Finding[];
  raw: unknown;
}

export interface PipelineResult {
  decision: ActionDecision;
  findings: Finding[];
  summary: string;
  durationMs: number;
}
