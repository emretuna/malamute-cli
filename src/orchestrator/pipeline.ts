import type { EventContext } from '../types/events.js';
import type { Config } from '../config/index.js';
import type { ContextBuilder } from '../context/types.js';
import type { AgentRouter } from '../router/types.js';
import type { ResultAggregator } from '../aggregator/types.js';
import type { PolicyEngine } from '../policy/types.js';
import type { ActionExecutor } from '../action/types.js';
import type { PipelineResult } from '../types/result.js';
import { substitutePlaceholders } from './prompt.js';
import { ProviderError } from '../errors.js';
import { logger } from '../logger.js';

export interface PipelineDeps {
  config: Config;
  contextBuilder: ContextBuilder;
  router: AgentRouter;
  aggregator: ResultAggregator;
  policy: PolicyEngine;
  action: ActionExecutor;
}

export async function runPipeline(event: EventContext, deps: PipelineDeps): Promise<PipelineResult> {
  const startMs = performance.now();

  const eventCfg = deps.config.events?.[event.event];
  if (!eventCfg || eventCfg.enabled === false) {
    logger.info(`event "${event.event}" disabled, skipping`);
    return { decision: 'allow', findings: [], summary: 'event disabled', durationMs: 0 };
  }

  // Build context
  const ctx = await deps.contextBuilder.build({ event, config: deps.config });

  // Only pre-commit has agentPrompt wired in the schema
  if (event.event !== 'pre-commit') {
    logger.info(`no pipeline registered for event "${event.event}", skipping`);
    return { decision: 'allow', findings: [], summary: 'event not wired', durationMs: 0 };
  }

  // Substitute placeholders into the prompt
  const prompt = substitutePlaceholders((eventCfg as { agentPrompt?: string }).agentPrompt ?? '', ctx);

  // Route to provider
  const { provider } = deps.router.route({ task: { prompt, cwd: event.cwd, env: event.env } });

  // Check provider availability before running
  const available = await provider.isAvailable();
  if (!available) {
    throw new ProviderError(
      `Provider "${provider.name}" is not available. ` +
      `Check that the "${provider.command}" command is on PATH or install the provider.`,
    );
  }

  // Run agent
  const outcomes = await Promise.allSettled([
    provider.run({ prompt, cwd: event.cwd, env: event.env }).then(
      (response) => ({ provider: provider.name, response, error: undefined as Error | undefined }),
      (error: Error) => ({
        provider: provider.name,
        response: { provider: provider.name, content: '', raw: null },
        error,
      }),
    ),
  ]);

  const agentOutcomes = outcomes.map((o) =>
    o.status === 'fulfilled'
      ? o.value
      : {
          provider: 'unknown',
          response: { provider: 'unknown', content: '', raw: null },
          error: new Error(o.reason?.toString() ?? 'unknown'),
        },
  );

  // Aggregate
  const agg = deps.aggregator.aggregate(agentOutcomes);

  // Policy evaluation
  const firstResult = agg.results[0];
  const agentResult = firstResult ?? {
    provider: 'unknown',
    summary: agg.summary,
    findings: agg.findings,
    raw: null,
  };
  const decision = deps.policy.evaluate({ result: agentResult, config: deps.config });

  // Execute action
  const exitCode = await deps.action.execute({ decision, findings: agg.findings, summary: agg.summary });
  logger.debug(`action exit code: ${exitCode}`);

  const durationMs = Math.round(performance.now() - startMs);

  const providerName = outcomes[0]?.status === 'fulfilled' ? outcomes[0].value.provider : 'unknown';
  logger.info(
    `${event.event} pipeline: ${decision} in ${durationMs}ms (provider=${providerName}, findings=${agg.findings.length})`,
  );

  return { decision, findings: agg.findings, summary: agg.summary, durationMs };
}
