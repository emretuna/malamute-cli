import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DefaultExecutor } from '../../src/action/default.js';

describe('DefaultExecutor', () => {
  let stdout: string;
  let stderr: string;
  let origStdout: typeof process.stdout.write;
  let origStderr: typeof process.stderr.write;

  beforeEach(() => {
    stdout = '';
    stderr = '';
    origStdout = process.stdout.write;
    origStderr = process.stderr.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
  });

  it('allow prints summary to stdout and returns 0', async () => {
    const ex = new DefaultExecutor();
    const code = await ex.execute({ decision: 'allow', summary: 'all good', findings: [] });
    expect(code).toBe(0);
    expect(stdout).toContain('all good');
  });

  it('warn prints WARN to stderr and returns 0', async () => {
    const ex = new DefaultExecutor();
    const code = await ex.execute({
      decision: 'warn',
      summary: 'heads up',
      findings: [{ severity: 'medium', message: 'be careful' }],
    });
    expect(code).toBe(0);
    expect(stderr).toContain('WARN');
    expect(stderr).toContain('be careful');
  });

  it('block prints BLOCK to stderr and returns 1', async () => {
    const ex = new DefaultExecutor();
    const code = await ex.execute({
      decision: 'block',
      summary: 'no good',
      findings: [{ severity: 'high', message: 'terrible', file: 'a.js', line: 5 }],
    });
    expect(code).toBe(1);
    expect(stderr).toContain('BLOCK');
    expect(stderr).toContain('terrible');
    expect(stderr).toContain('a.js');
  });
});
