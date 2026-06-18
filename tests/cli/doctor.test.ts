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
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-doctor-')));
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

async function runDoctor(): Promise<{ stdout: string; code: number }> {
  try {
    const { stdout } = await execFileP('node', [CLI, 'doctor'], { cwd: repoDir });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; code: number };
    return { stdout: e.stdout, code: e.code };
  }
}

describe('malamute doctor', () => {
  it('reports all checks failing before init', async () => {
    const result = await runDoctor();
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('In a git repository');
    expect(result.stdout).toContain('core.hooksPath is set');
    expect(result.stdout).toMatch(/\[FAIL\] core\.hooksPath is set/);
  });

  it('reports all checks passing after a clean init', async () => {
    // Place a malamute binary the hook can resolve
    const bin = path.join(repoDir, 'node_modules', '.bin');
    await fs.mkdir(bin, { recursive: true });
    await fs.symlink(CLI, path.join(bin, 'malamute'));

    // Run init via the CLI
    await execFileP('node', [CLI, 'init'], { cwd: repoDir });

    const result = await runDoctor();
    expect(result.stdout).toMatch(/All checks passed/);
  });

  it('detects a half-broken install (hooks dir removed)', async () => {
    // Remove the hooks directory but leave the git config in place
    await fs.rm(path.join(repoDir, '.malamute'), { recursive: true, force: true });

    const result = await runDoctor();
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/\[FAIL\] Hooks directory exists/);
  });
});
