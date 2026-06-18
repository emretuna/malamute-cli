import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileP = promisify(execFile);

const CLI = path.resolve('dist/cli/index.js');

async function run(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileP('node', [CLI, ...args], { cwd });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}

describe('malamute config', () => {
  it('validate succeeds with defaults', async () => {
    const result = await run(['config', 'validate']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Valid');
  });

  it('show prints YAML', async () => {
    const result = await run(['config', 'show']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('version');
  });

  it('path prints <none> when no project config', async () => {
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cfg-cmd-')));
    try {
      const result = await run(['config', 'path'], tmpDir);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('<none>');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
