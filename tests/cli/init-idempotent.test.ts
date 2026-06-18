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
let binDir: string;

beforeAll(async () => {
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-init-idempotent-')));
  repoDir = path.join(tmpDir, 'repo');
  binDir = path.join(tmpDir, 'bin');
  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(binDir, { recursive: true });

  const git = simpleGit(repoDir);
  await git.init();
  await git.addConfig('user.email', 't@t.com');
  await git.addConfig('user.name', 't');
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function runInit(): Promise<{ stdout: string; code: number }> {
  try {
    const { stdout } = await execFileP('node', [CLI, 'init'], { cwd: repoDir });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; code: number };
    return { stdout: e.stdout, code: e.code };
  }
}

describe('malamute init idempotency', () => {
  it('first init creates the hooks, second init says Already initialized', async () => {
    // Place a malamute binary the hook can resolve
    const bin = path.join(repoDir, 'node_modules', '.bin');
    await fs.mkdir(bin, { recursive: true });
    await fs.symlink(CLI, path.join(bin, 'malamute'));

    const first = await runInit();
    expect(first.code).toBe(0);
    expect(first.stdout).toContain('Malamute initialized');

    const second = await runInit();
    expect(second.code).toBe(0);
    expect(second.stdout).toContain('Already initialized');
  });

  it('treats install as complete when pre-commit is executable even if other files are not', async () => {
    // Drop a non-executable file alongside the hook. The hook itself is intact.
    const hooksDir = path.join(repoDir, '.malamute', 'hooks');
    await fs.writeFile(path.join(hooksDir, 'README.md'), 'extra file, not a hook\n');
    await fs.chmod(path.join(hooksDir, 'README.md'), 0o644);

    const result = await runInit();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Already initialized');

    // pre-commit must remain executable and unmodified
    const stat = await fs.stat(path.join(hooksDir, 'pre-commit'));
    expect(stat.mode & 0o111).toBeGreaterThan(0);
  });

  it('re-installs when pre-commit is missing', async () => {
    // Remove pre-commit
    const hooksDir = path.join(repoDir, '.malamute', 'hooks');
    await fs.rm(path.join(hooksDir, 'pre-commit'), { force: true });

    const result = await runInit();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Malamute initialized');

    // pre-commit is back
    const stat = await fs.stat(path.join(hooksDir, 'pre-commit'));
    expect(stat.isFile()).toBe(true);
    expect(stat.mode & 0o111).toBeGreaterThan(0);
  });
});
