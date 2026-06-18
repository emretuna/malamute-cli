import { simpleGit } from 'simple-git';
import { GitError } from '../errors.js';

export async function getRepoRoot(cwd: string): Promise<string> {
  try {
    return (await simpleGit(cwd).revparse(['--show-toplevel'])).trim();
  } catch (err) {
    throw new GitError(
      `Not a git repository (or unable to detect root): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function getStagedFiles(cwd: string): Promise<string[]> {
  try {
    const status = await simpleGit(cwd).status();
    return status.staged;
  } catch (err) {
    throw new GitError(`Failed to list staged files: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getStagedDiff(cwd: string, files?: string[]): Promise<string> {
  try {
    const args = ['--cached', '--diff-algorithm=minimal'];
    if (files && files.length > 0) {
      args.push('--', ...files);
    }
    return (await simpleGit(cwd).raw(['diff', ...args])).trim();
  } catch (err) {
    throw new GitError(`Failed to get staged diff: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getRepoTree(cwd: string, maxDepth: number): Promise<string> {
  try {
    const raw = await simpleGit(cwd).raw(['ls-files']);
    const paths = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .filter((p) => p.split('/').length <= maxDepth);
    return paths.join('\n');
  } catch (err) {
    throw new GitError(`Failed to list repository tree: ${err instanceof Error ? err.message : String(err)}`);
  }
}
