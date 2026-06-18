import { describe, expect, it, vi } from 'vitest';
import { ClaudeCodeProvider } from '../../src/agent/providers/claude-code.js';
import { ProviderError } from '../../src/errors.js';

describe('ClaudeCodeProvider', () => {
  it('isAvailable returns true when execa returns exit code 0', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '1.0.0', stderr: '' });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never, command: 'claude' });
    expect(await provider.isAvailable()).toBe(true);
  });

  it('isAvailable returns false on non-zero exit', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not found' });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never, command: 'claude' });
    expect(await provider.isAvailable()).toBe(false);
  });

  it('isAvailable returns false when execa throws', async () => {
    const fakeExeca = vi.fn().mockRejectedValue(new Error('spawn failed'));
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never, command: 'claude' });
    expect(await provider.isAvailable()).toBe(false);
  });

  it('run extracts .content from JSON output', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ content: 'review summary', findings: [] }),
      stderr: '',
    });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never });
    const result = await provider.run({ prompt: 'review this' });
    expect(result.provider).toBe('claude-code');
    expect(result.content).toBe('review summary');
  });

  it('run extracts .result from JSON output as fallback', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ result: 'fallback result' }),
      stderr: '',
    });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never });
    const result = await provider.run({ prompt: 'x' });
    expect(result.content).toBe('fallback result');
  });

  it('run falls back to raw stdout when output is not JSON', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'plain text response',
      stderr: '',
    });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never });
    const result = await provider.run({ prompt: 'x' });
    expect(result.content).toBe('plain text response');
  });

  it('run throws ProviderError on non-zero exit', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'auth failed',
    });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never });
    await expect(provider.run({ prompt: 'x' })).rejects.toThrow(ProviderError);
  });

  it('run includes stderr in error message', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 2,
      stdout: '',
      stderr: 'auth failed badly',
    });
    const provider = new ClaudeCodeProvider({ execa: fakeExeca as never });
    try {
      await provider.run({ prompt: 'x' });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('auth failed badly');
    }
  });

  it('passes prompt and flags to execa', async () => {
    const fakeExeca = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '{}',
      stderr: '',
    });
    const provider = new ClaudeCodeProvider({
      execa: fakeExeca as never,
      command: 'claude',
      timeoutMs: 5000,
    });
    await provider.run({ prompt: 'hello', cwd: '/tmp', env: { FOO: 'bar' } });
    expect(fakeExeca).toHaveBeenCalledWith(
      'claude',
      ['-p', 'hello', '--output-format', 'json'],
      expect.objectContaining({ cwd: '/tmp', timeout: 5000 }),
    );
  });
});
