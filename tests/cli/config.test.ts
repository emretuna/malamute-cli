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

describe('malamute config error paths', () => {
  it('validate fails and exits 2 with invalid config', async () => {
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cfg-invalid-')));
    try {
      await fs.writeFile(path.join(tmpDir, '.malamute.yaml'), 'version: 1\nlogLevel: bogus\n');
      try {
        await execFileP('node', [CLI, 'config', 'validate'], { cwd: tmpDir });
        expect.fail('should have exited non-zero');
      } catch (err) {
        const e = err as { code: number; stderr: string };
        expect(e.code).toBe(2);
        expect(e.stderr).toMatch(/logLevel/i);
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('path prints absolute path when project config exists', async () => {
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cfg-path-')));
    try {
      await fs.writeFile(path.join(tmpDir, '.malamute.yaml'), 'version: 1\n');
      const { stdout } = await execFileP('node', [CLI, 'config', 'path'], { cwd: tmpDir });
      expect(stdout.trim()).toMatch(/\.malamute\.yaml$/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
