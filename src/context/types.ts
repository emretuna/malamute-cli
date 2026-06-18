import type { EventContext } from '../types/events.js';
import type { Config } from '../config/index.js';

export interface BuildInput {
  event: EventContext;
  config: Config;
}

export interface BuildOutput {
  event: string;
  repoRoot: string;
  stagedFiles: string[];
  stagedDiff: string;
  repoTree: string;
}

export interface ContextBuilder {
  readonly name: string;
  build(input: BuildInput): Promise<BuildOutput>;
}
