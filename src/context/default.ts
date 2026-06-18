import { getStagedFiles, getStagedDiff, getRepoTree } from '../git/index.js';
import type { ContextBuilder, BuildInput, BuildOutput } from './types.js';

export interface GitDeps {
  getStagedFiles: typeof getStagedFiles;
  getStagedDiff: typeof getStagedDiff;
  getRepoTree: typeof getRepoTree;
}

export class DefaultContextBuilder implements ContextBuilder {
  readonly name = 'default';
  private readonly deps: GitDeps;

  constructor(deps?: Partial<GitDeps>) {
    this.deps = {
      getStagedFiles: deps?.getStagedFiles ?? getStagedFiles,
      getStagedDiff: deps?.getStagedDiff ?? getStagedDiff,
      getRepoTree: deps?.getRepoTree ?? getRepoTree,
    };
  }

  async build(input: BuildInput): Promise<BuildOutput> {
    const { event, config } = input;
    const cwd = event.cwd;
    const repoRoot = config.version === 1 ? event.repoRoot : event.repoRoot;

    const isPreCommit = event.event === 'pre-commit';
    const [stagedFiles, stagedDiff, repoTree] = await Promise.all([
      isPreCommit ? this.deps.getStagedFiles(cwd) : Promise.resolve([] as string[]),
      isPreCommit ? this.deps.getStagedDiff(cwd) : Promise.resolve(''),
      this.deps.getRepoTree(cwd, 3),
    ]);

    return {
      event: event.event,
      repoRoot,
      stagedFiles,
      stagedDiff,
      repoTree,
    };
  }
}
