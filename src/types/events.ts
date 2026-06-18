export type MalamuteEvent = 'pre-commit' | 'post-commit' | 'pre-push' | 'post-merge';

export interface EventContext {
  event: MalamuteEvent;
  cwd: string;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  args: string[];
}

export const ALL_EVENTS: MalamuteEvent[] = ['pre-commit', 'post-commit', 'pre-push', 'post-merge'];
