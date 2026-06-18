import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getInstalledHooksPath, installHooks, uninstallHooks } from '../../src/git/hooks.js';
import { simpleGit } from 'simple-git';

let tmpDir: string;
let repoDir: string;
const fixtureDir = path.resolve('tests/fixtures/hooks');

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-hooks-'));
  repoDir = path.join(tmpDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  const git = simpleGit(repoDir);
  await git.init();
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  // reset
  await fs.rm(path.join(repoDir, '.malamute'), { recursive: true, force: true });
  await simpleGit(repoDir)
    .raw(['config', '--unset', 'core.hooksPath'])
    .catch(() => {});
});

describe('git/hooks', () => {
  it('installHooks copies files, chmods, and sets core.hooksPath', async () => {
    await installHooks(repoDir, fixtureDir);

    const preCommitPath = path.join(repoDir, '.malamute', 'hooks', 'pre-commit');
    const stat = await fs.stat(preCommitPath);
    expect(stat.isFile()).toBe(true);
    // Verify executable bit
    expect(stat.mode & 0o111).toBeGreaterThan(0);

    const hooksPath = await getInstalledHooksPath(repoDir);
    expect(hooksPath).toBeTruthy();
    expect(hooksPath).toMatch(/\.malamute\/hooks$/);
  });

  it('uninstallHooks removes .malamute and unsets core.hooksPath', async () => {
    await installHooks(repoDir, fixtureDir);
    await uninstallHooks(repoDir);

    await expect(fs.stat(path.join(repoDir, '.malamute'))).rejects.toThrow();
    const hooksPath = await getInstalledHooksPath(repoDir);
    expect(hooksPath).toBeNull();
  });
});
