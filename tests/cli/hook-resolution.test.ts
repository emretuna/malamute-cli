import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { simpleGit } from 'simple-git';

const execFileP = promisify(execFile);

const CLI = path.resolve('dist/cli/index.js');
const HOOK = path.resolve('dist/hooks/pre-commit');

let tmpDir: string;
let repoDir: string;
let binDir: string;

beforeAll(async () => {
  tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-hook-ancestor-')));
  repoDir = path.join(tmpDir, 'repo');
  binDir = path.join(tmpDir, 'bin');
  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(binDir, { recursive: true });

  // Stage a file and a fake claude before init so the hook has work to do
  await fs.writeFile(path.join(repoDir, 'a.txt'), 'hi');
  await simpleGit(repoDir).init();
  await simpleGit(repoDir).addConfig('user.email', 't@t.com');
  await simpleGit(repoDir).addConfig('user.name', 't');
  await simpleGit(repoDir).addConfig('commit.gpgsign', 'false');
  await simpleGit(repoDir).add('a.txt');

  const claudePath = path.join(binDir, 'claude');
  await fs.writeFile(claudePath, `#!/usr/bin/env bash\necho '{"summary":"from hook","findings":[]}'\n`);
  await fs.chmod(claudePath, 0o755);

  // Simulate `npm i -D malamute-cli`: place the binary in node_modules/.bin
  // WITHOUT adding it to PATH globally.
  const bin = path.join(repoDir, 'node_modules', '.bin');
  await fs.mkdir(bin, { recursive: true });
  await fs.symlink(CLI, path.join(bin, 'malamute'));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('hook script resolves malamute without it on PATH', () => {
  it('finds node_modules/.bin/malamute via ancestor walk when invoked from .malamute/hooks', async () => {
    await execFileP('node', [CLI, 'init'], { cwd: repoDir });

    // Invoke the hook directly from its install dir (where git actually runs it).
    // Keep `node` on PATH so the symlink's shebang resolves, but exclude any
    // globally-installed `malamute` by stripping the project's own directories.
    const nodeDir = path.dirname(process.execPath);
    const { stdout } = await execFileP('bash', [HOOK], {
      cwd: path.join(repoDir, '.malamute', 'hooks'),
      env: { ...process.env, PATH: `${binDir}:${nodeDir}:/usr/bin:/bin` },
    });
    expect(stdout).toContain('from hook');
  });
});
