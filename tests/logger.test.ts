import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debug, info, warn, error, logger } from '../src/logger.js';

describe('logger', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.setLevel('info');
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('info writes to stdout and includes the message', () => {
    info('hello info');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('hello info'));
  });

  it('warn writes to stderr and includes the message', () => {
    warn('hello warn');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('hello warn'));
  });

  it('error writes to stderr and includes the message', () => {
    error('hello error');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('hello error'));
  });

  it('debug writes to stdout when level is debug', () => {
    logger.setLevel('debug');
    debug('hello debug');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('hello debug'));
  });

  it('setLevel("error") suppresses info output', () => {
    logger.setLevel('error');
    info('should be silent');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('setLevel("error") suppresses warn output', () => {
    logger.setLevel('error');
    warn('should be silent');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('setLevel("error") still allows error output', () => {
    logger.setLevel('error');
    error('visible error');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('visible error'));
  });
});
