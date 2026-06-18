import type { ResultAggregator, AgentOutcome, AggregatedResult } from './types.js';
import type { AgentResult, Finding } from '../types/result.js';

export class DefaultAggregator implements ResultAggregator {
  readonly name = 'default';

  aggregate(outcomes: AgentOutcome[]): AggregatedResult {
    const results: AgentResult[] = [];
    const allFindings: Finding[] = [];
    const summaries: string[] = [];

    for (const outcome of outcomes) {
      if (outcome.error) {
        results.push({
          provider: outcome.provider,
          summary: `Provider failed: ${outcome.error.message}`,
          findings: [{ severity: 'medium', message: `Provider error: ${outcome.error.message}` }],
          raw: null,
        });
        summaries.push(`[${outcome.provider}] Provider failed: ${outcome.error.message}`);
        allFindings.push({ severity: 'medium', message: `Provider error: ${outcome.error.message}` });
        continue;
      }

      let parsed: { summary?: string; findings?: Finding[] } | null = null;
      try {
        parsed = JSON.parse(outcome.response.content) as { summary?: string; findings?: Finding[] };
      } catch {
        // Not JSON — treat content as the summary
      }

      if (parsed && typeof parsed === 'object') {
        const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
        const summary = parsed.summary ?? outcome.response.content;
        results.push({ provider: outcome.provider, summary, findings, raw: parsed });
        summaries.push(summary);
        allFindings.push(...findings);
      } else {
        const summary = outcome.response.content;
        results.push({ provider: outcome.provider, summary, findings: [], raw: outcome.response.raw });
        summaries.push(summary);
      }
    }

    return {
      results,
      summary: summaries.join('\n---\n'),
      findings: allFindings,
    };
  }
}
