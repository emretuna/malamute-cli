import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DefaultContextBuilder } from '../../src/context/default.js';
import { getStagedFiles, getStagedDiff, getRepoTree } from '../../src/git/diff.js';
import { defaultConfig } from '../../src/config/defaults.js';
import { simpleGit } from 'simple-git';

let tmpDir: string;
let repoDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-ctx-'));
  repoDir = path.join(tmpDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  const git = simpleGit(repoDir);
  await git.init();
  await git.addConfig('user.email', 't@t.com');
  await git.addConfig('user.name', 't');
  await fs.writeFile(path.join(repoDir, 'a.txt'), 'A');
  await fs.writeFile(path.join(repoDir, 'b.txt'), 'B');
  await git.add(['a.txt', 'b.txt']);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('DefaultContextBuilder', () => {
  it('returns staged files and diff for pre-commit', async () => {
    const builder = new DefaultContextBuilder({
      getStagedFiles: getStagedFiles as never,
      getStagedDiff: getStagedDiff as never,
      getRepoTree: getRepoTree as never,
    });
    const out = await builder.build({
      event: {
        event: 'pre-commit',
        cwd: repoDir,
        repoRoot: repoDir,
        env: process.env,
        args: [],
      },
      config: defaultConfig,
    });
    expect(out.event).toBe('pre-commit');
    expect(out.stagedFiles.length).toBeGreaterThan(0);
    expect(out.repoTree).toBeTruthy();
    expect(out.stagedDiff).toBeTruthy();
  });

  it('returns empty staged fields for non-pre-commit', async () => {
    const builder = new DefaultContextBuilder({
      getStagedFiles: getStagedFiles as never,
      getStagedDiff: getStagedDiff as never,
      getRepoTree: getRepoTree as never,
    });
    const out = await builder.build({
      event: {
        event: 'post-commit',
        cwd: repoDir,
        repoRoot: repoDir,
        env: process.env,
        args: [],
      },
      config: defaultConfig,
    });
    expect(out.stagedFiles).toEqual([]);
    expect(out.stagedDiff).toBe('');
  });
});
