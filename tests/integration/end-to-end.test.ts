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
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-integ-')));
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
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileP('node', [CLI, ...args], {
      cwd: opts.cwd ?? repoDir,
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, ...opts.env },
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}

async function writeFakeClaude(response: string): Promise<void> {
  const claudePath = path.join(binDir, 'claude');
  await fs.writeFile(claudePath, `#!/usr/bin/env bash\necho '${response.replace(/'/g, "'\\''")}'\n`);
  await fs.chmod(claudePath, 0o755);
}

async function stageFile(name: string, content: string): Promise<void> {
  await fs.writeFile(path.join(repoDir, name), content);
  await simpleGit(repoDir).add(name);
}

describe('end-to-end: malamute init + run pre-commit', () => {
  it('blocks commit on high-severity finding', async () => {
    await writeFakeClaude('{"summary":"blocking","findings":[{"severity":"high","message":"danger"}]}');
    await stageFile('x.js', 'console.log("DEBUG")');

    const result = await run(['run', 'pre-commit']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('BLOCK');
  });

  it('allows commit when no findings', async () => {
    await writeFakeClaude('{"summary":"all good","findings":[]}');
    await stageFile('y.js', 'export const x = 1;');

    const result = await run(['run', 'pre-commit']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('all good');
  });
});
