import { getRepoRoot } from '../../git/index.js';
import { loadConfig } from '../../config/index.js';
import { createDefaultRegistry } from '../../orchestrator/index.js';
import { setLevel } from '../../logger.js';
import type { MalamuteEvent } from '../../types/events.js';
import { ALL_EVENTS } from '../../types/events.js';

export async function runCommand(eventName: string): Promise<void> {
  const cwd = process.cwd();

  // Validate event name
  if (!ALL_EVENTS.includes(eventName as MalamuteEvent)) {
    console.error(`Unknown event: "${eventName}". Valid events: ${ALL_EVENTS.join(', ')}`);
    process.exit(2);
  }
  const event = eventName as MalamuteEvent;

  // Verify git repo
  let repoRoot: string;
  try {
    repoRoot = await getRepoRoot(cwd);
  } catch {
    console.error('Not inside a git repository.');
    process.exit(4);
    return;
  }

  // Load config
  const config = await loadConfig(cwd);

  // Set log level from config
  setLevel(config.logLevel);

  // Build orchestrator
  const orchestrator = createDefaultRegistry(config);

  const eventCtx = {
    event,
    cwd,
    repoRoot,
    env: process.env,
    args: process.argv.slice(3),
  };

  // Check if pipeline registered
  try {
    orchestrator.events.resolve(event);
  } catch {
    console.log(`No pipeline registered for event "${event}", skipping.`);
    return;
  }

  // Run pipeline
  const result = await orchestrator.runPipeline(eventCtx);
  process.exitCode = result.decision === 'block' ? 1 : 0;
}
