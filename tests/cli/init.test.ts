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
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cli-init-')));
  repoDir = path.join(tmpDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  await simpleGit(repoDir).init();
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function run(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileP('node', [CLI, ...args], { cwd: opts.cwd ?? repoDir });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}

describe('malamute init', () => {
  it('installs hooks and sets core.hooksPath', async () => {
    const result = await run(['init']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Malamute initialized');

    const hookFile = path.join(repoDir, '.malamute', 'hooks', 'pre-commit');
    const stat = await fs.stat(hookFile);
    expect(stat.isFile()).toBe(true);
    expect(stat.mode & 0o111).toBeGreaterThan(0);

    const configValue = (await simpleGit(repoDir).raw(['config', '--get', 'core.hooksPath'])).trim();
    expect(configValue).toMatch(/\.malamute\/hooks$/);
  });

  it('says "Already initialized" on second run', async () => {
    const result = await run(['init']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Already initialized');
  });
});
