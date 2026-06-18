import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { simpleGit } from 'simple-git';

const execFileP = promisify(execFile);

const CLI = path.resolve('dist/cli/index.js');

let tmpDir: string;
let repoDir: string;

beforeAll(async () => {
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-uninstall-')));
  repoDir = path.join(tmpDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  const git = simpleGit(repoDir);
  await git.init();
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function run(args: string[]): Promise<{ stdout: string; code: number }> {
  try {
    const { stdout } = await execFileP('node', [CLI, ...args], { cwd: repoDir });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; code: number };
    return { stdout: e.stdout, code: e.code };
  }
}

describe('malamute uninstall', () => {
  it('reports not installed when no hooks are wired', async () => {
    const result = await run(['uninstall']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('not installed');
  });

  it('removes the hooks directory and clears core.hooksPath after init', async () => {
    // First init
    await run(['init']);

    // Verify hooks are wired
    const before = (await simpleGit(repoDir).raw(['config', '--get', 'core.hooksPath'])).trim();
    expect(before).toContain('.malamute/hooks');
    const hookStat = await fs.stat(path.join(repoDir, '.malamute', 'hooks', 'pre-commit'));
    expect(hookStat.isFile()).toBe(true);

    // Then uninstall
    const result = await run(['uninstall']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Malamute uninstalled');

    // Verify hooks are gone
    await expect(fs.stat(path.join(repoDir, '.malamute'))).rejects.toThrow();
    // simpleGit's raw() may not reject on a non-zero exit. Check the value directly.
    const after = await simpleGit(repoDir).raw(['config', '--get', 'core.hooksPath']);
    expect(after.trim()).toBe('');
  });

  it('cleans a stray .malamute/ directory even when core.hooksPath is unset', async () => {
    // Manually drop a .malamute/ directory without setting core.hooksPath
    await fs.mkdir(path.join(repoDir, '.malamute'), { recursive: true });
    await fs.writeFile(path.join(repoDir, '.malamute', 'leftover.txt'), 'stray\n');

    const result = await run(['uninstall']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Removed stray .malamute/ directory');

    await expect(fs.stat(path.join(repoDir, '.malamute'))).rejects.toThrow();
  });
});
