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
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cli-run-')));
  repoDir = path.join(tmpDir, 'repo');
  binDir = path.join(tmpDir, 'bin');
  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(binDir, { recursive: true });

  const git = simpleGit(repoDir);
  await git.init();
  await git.addConfig('user.email', 't@t.com');
  await git.addConfig('user.name', 't');
  await git.addConfig('commit.gpgsign', 'false');
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function run(
  event: string,
  claudeResponse: string,
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string; code: number }> {
  // Write fake claude binary
  const claudePath = path.join(binDir, 'claude');
  await fs.writeFile(claudePath, `#!/usr/bin/env bash\necho '${claudeResponse.replace(/'/g, "'\\''")}'\n`);
  await fs.chmod(claudePath, 0o755);

  // Stage something
  await fs.writeFile(path.join(repoDir, 'staged.txt'), 'content');
  await simpleGit(repoDir).add('staged.txt');

  try {
    const { stdout, stderr } = await execFileP('node', [CLI, 'run', event], {
      cwd: repoDir,
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, ...env },
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}

describe('malamute run', () => {
  it('exits 0 when provider returns no findings', async () => {
    const result = await run('pre-commit', '{"summary":"all good","findings":[]}');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('all good');
  });

  it('exits 1 when provider returns high-severity finding', async () => {
    const result = await run(
      'pre-commit',
      '{"summary":"blocking","findings":[{"severity":"high","message":"bad"}]}',
    );
    expect(result.code).toBe(1);
  });

  it('exits 0 for non-pre-commit events (no pipeline registered)', async () => {
    const result = await run('post-commit', '{"summary":"x","findings":[]}');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No pipeline registered');
  });

  it('exits 2 for unknown event', async () => {
    try {
      await execFileP('node', [CLI, 'run', 'bogus-event'], { cwd: repoDir });
      expect.fail('should have exited non-zero');
    } catch (err) {
      const e = err as { code: number; stderr: string };
      expect(e.code).toBe(2);
    }
  });
});

describe('malamute run error codes', () => {
  it('exits 3 when provider binary is not found', async () => {
    // Create a repo with staged files but no claude on PATH
    const tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-run-exit3-')));
    const repo = path.join(tmp, 'repo');
    await fs.mkdir(repo, { recursive: true });
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig('user.email', 't@t.com');
    await git.addConfig('user.name', 't');
    await fs.writeFile(path.join(repo, 'f.txt'), 'x');
    await git.add('f.txt');
    try {
      // PATH with node but no claude binary anywhere
      const nodeDir = path.dirname(process.execPath);
      await execFileP('node', [CLI, 'run', 'pre-commit'], {
        cwd: repo,
        env: { ...process.env, PATH: `${nodeDir}:/usr/bin:/bin` },
      });
      expect.fail('should have exited non-zero');
    } catch (err) {
      const e = err as { code: number; stderr: string; stdout: string };
      expect(e.code).toBe(3);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('exits 4 when not in a git repository', async () => {
    const tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-run-exit4-')));
    const nonRepo = path.join(tmp, 'not-a-repo');
    await fs.mkdir(nonRepo, { recursive: true });

    try {
      await execFileP('node', [CLI, 'run', 'pre-commit'], { cwd: nonRepo });
      expect.fail('should have exited non-zero');
    } catch (err) {
      const e = err as { code: number; stderr: string };
      expect(e.code).toBe(4);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
