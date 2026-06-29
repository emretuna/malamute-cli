import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { ConfigError } from '../../src/errors.js';

let tmpRoot: string;
let cwd: string;
let originalHome: string | undefined;
let originalNodeEnv: string | undefined;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'malamute-cfg-'));
  cwd = path.join(tmpRoot, 'project');
  await fs.mkdir(cwd, { recursive: true });
  originalHome = process.env['HOME'];
  originalNodeEnv = process.env['NODE_ENV'];
  process.env['HOME'] = tmpRoot;
  delete process.env['NODE_ENV'];
});

afterEach(async () => {
  if (originalHome) process.env['HOME'] = originalHome;
  if (originalNodeEnv !== undefined) process.env['NODE_ENV'] = originalNodeEnv;
  else delete process.env['NODE_ENV'];
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when no config files exist', async () => {
    const config = await loadConfig(cwd);
    expect(config.version).toBe(1);
    expect(config.logLevel).toBe('info');
    expect(config.providers['claude-code']?.command).toBe('claude');
    expect(config.providers['claude-code']?.timeoutMs).toBe(60_000);
    expect(config.events['pre-commit']?.enabled).toBe(true);
  });

  it('uses project .malamute.yaml when present', async () => {
    const yaml = `
version: 1
logLevel: debug
providers:
  claude-code:
    command: /usr/local/bin/claude
    timeoutMs: 30000
events:
  pre-commit:
    enabled: false
`;
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), yaml);
    const config = await loadConfig(cwd);
    expect(config.logLevel).toBe('debug');
    expect(config.providers['claude-code']?.command).toBe('/usr/local/bin/claude');
    expect(config.providers['claude-code']?.timeoutMs).toBe(30_000);
    expect(config.events['pre-commit']?.enabled).toBe(false);
  });

  it('merges user config over defaults', async () => {
    const userCfgDir = path.join(tmpRoot, '.config', 'malamute');
    await fs.mkdir(userCfgDir, { recursive: true });
    await fs.writeFile(path.join(userCfgDir, 'config.yaml'), 'version: 1\nlogLevel: warn\n');
    const config = await loadConfig(cwd);
    expect(config.logLevel).toBe('warn');
  });

  it('project config wins over user config', async () => {
    const userCfgDir = path.join(tmpRoot, '.config', 'malamute');
    await fs.mkdir(userCfgDir, { recursive: true });
    await fs.writeFile(path.join(userCfgDir, 'config.yaml'), 'version: 1\nlogLevel: warn\n');
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), 'version: 1\nlogLevel: debug\n');
    const config = await loadConfig(cwd);
    expect(config.logLevel).toBe('debug');
  });

  it('throws ConfigError on invalid YAML', async () => {
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), 'version: 1\nproviders: [unclosed');
    await expect(loadConfig(cwd)).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError with issue path on validation failure', async () => {
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), 'version: 1\nlogLevel: bogus\n');
    try {
      await loadConfig(cwd);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as Error).message).toMatch(/logLevel/);
    }
  });

  it('uses env-specific .malamute.{NODE_ENV}.yaml when set', async () => {
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), 'version: 1\nlogLevel: info\n');
    process.env['NODE_ENV'] = 'prod';
    await fs.writeFile(path.join(cwd, '.malamute.prod.yaml'), 'version: 1\nlogLevel: error\n');
    const config = await loadConfig(cwd);
    expect(config.logLevel).toBe('error');
  });

  it('env-specific config wins over base project config', async () => {
    await fs.writeFile(
      path.join(cwd, '.malamute.yaml'),
      'version: 1\nlogLevel: warn\nproviders:\n  claude-code:\n    command: base\n',
    );
    process.env['NODE_ENV'] = 'prod';
    await fs.writeFile(
      path.join(cwd, '.malamute.prod.yaml'),
      'version: 1\nlogLevel: error\nproviders:\n  claude-code:\n    command: prod-version\n',
    );
    const config = await loadConfig(cwd);
    expect(config.logLevel).toBe('error');
    expect(config.providers['claude-code']?.command).toBe('prod-version');
    expect(config.providers['claude-code']?.timeoutMs).toBe(60_000);
  });

  it('throws ConfigError when project config file is unreadable', async () => {
    await fs.writeFile(path.join(cwd, '.malamute.yaml'), 'version: 1\nlogLevel: info\n');
    // Remove read permission so the file exists but cannot be read
    await fs.chmod(path.join(cwd, '.malamute.yaml'), 0o200);
    await expect(loadConfig(cwd)).rejects.toThrow(ConfigError);
  });
});
