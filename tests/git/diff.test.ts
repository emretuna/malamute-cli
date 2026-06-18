import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getStagedDiff, getStagedFiles, getRepoRoot } from '../../src/git/diff.js';
import { simpleGit } from 'simple-git';

let tmpDir: string;
let repoDir: string;

beforeAll(async () => {
  // On macOS, /var/folders is a symlink to /private/var/folders. Resolve to canonical.
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-git-')));
  repoDir = path.join(tmpDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  const git = simpleGit(repoDir);
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test');
  await fs.writeFile(path.join(repoDir, 'hello.txt'), 'hello world\n');
  await git.add('hello.txt');
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('git/diff', () => {
  it('getRepoRoot returns the repo root', async () => {
    const root = await getRepoRoot(repoDir);
    expect(root).toBe(repoDir);
  });

  it('getStagedFiles returns staged files', async () => {
    const files = await getStagedFiles(repoDir);
    expect(files).toContain('hello.txt');
  });

  it('getStagedDiff returns the diff', async () => {
    const diff = await getStagedDiff(repoDir);
    expect(diff).toContain('hello world');
  });

  it('getStagedDiff scoped to files', async () => {
    const diff = await getStagedDiff(repoDir, ['hello.txt']);
    expect(diff).toContain('hello world');
  });

  it('getStagedDiff returns empty for unknown file', async () => {
    const diff = await getStagedDiff(repoDir, ['nonexistent.txt']);
    expect(diff).toBe('');
  });

  it('getRepoRoot throws GitError for non-repo dir', async () => {
    const nonRepo = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-norepo-')));
    try {
      await expect(getRepoRoot(nonRepo)).rejects.toThrow(/git/i);
    } finally {
      await fs.rm(nonRepo, { recursive: true, force: true });
    }
  });
});
