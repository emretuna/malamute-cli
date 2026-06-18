import type { MalamuteEvent } from '../types/events.js';
import type { PipelineDeps } from './pipeline.js';
import { ConfigError } from '../errors.js';

export class EventRegistry {
  private readonly pipelines = new Map<string, PipelineDeps>();

  register(event: MalamuteEvent, deps: PipelineDeps): void {
    this.pipelines.set(event, deps);
  }

  resolve(event: MalamuteEvent): PipelineDeps {
    const deps = this.pipelines.get(event);
    if (!deps) {
      throw new ConfigError(`no pipeline registered for event: ${event}`);
    }
    return deps;
  }
}
