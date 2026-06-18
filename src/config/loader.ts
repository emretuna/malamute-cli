import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { load } from 'js-yaml';
import { ConfigSchema, type Config } from './schema.js';
import { defaultConfig } from './defaults.js';
import { ConfigError } from '../errors.js';

export async function loadConfig(cwd: string): Promise<Config> {
  let config: Config = { ...defaultConfig };

  // 1. Try user-level config
  const userConfigPath = path.join(os.homedir(), '.config', 'malamute', 'config.yaml');
  await readAndMerge(userConfigPath, (raw) => {
    config = mergeConfig(config, raw);
  });

  // 2. Try project-level config
  const projectConfigPath = path.join(cwd, '.malamute.yaml');
  await readAndMerge(projectConfigPath, (raw) => {
    config = mergeConfig(config, raw);
  });

  // Validate
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ConfigError(`Config validation failed: ${issues}`);
  }

  // Apply env overrides
  if (process.env['MalamUTE_CLAUDE_COMMAND']) {
    result.data.providers['claude-code'].command = process.env['MalamUTE_CLAUDE_COMMAND'];
  }
  if (process.env['MalamUTE_LOG_LEVEL']) {
    const level = process.env['MalamUTE_LOG_LEVEL'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      result.data.logLevel = level as Config['logLevel'];
    }
  }

  return result.data;
}

async function readAndMerge(filePath: string, merge: (raw: Record<string, unknown>) => void): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; // file not found, skip
    throw new ConfigError(
      `Failed to read config file ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = load(content);
  } catch (err) {
    throw new ConfigError(`Invalid YAML in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    merge(parsed as Record<string, unknown>);
  }
}

function mergeConfig(base: Config, raw: Record<string, unknown>): Config {
  const merged = structuredClone(base);

  if (raw.logLevel && typeof raw.logLevel === 'string') {
    merged.logLevel = raw.logLevel as Config['logLevel'];
  }
  if (raw.providers && typeof raw.providers === 'object') {
    const providers = raw.providers as Record<string, unknown>;
    if (providers['claude-code'] && typeof providers['claude-code'] === 'object') {
      const cc = providers['claude-code'] as Record<string, unknown>;
      if (cc.command && typeof cc.command === 'string') merged.providers['claude-code'].command = cc.command;
      if (cc.timeoutMs && typeof cc.timeoutMs === 'number')
        merged.providers['claude-code'].timeoutMs = cc.timeoutMs;
    }
  }
  if (raw.events && typeof raw.events === 'object') {
    const events = raw.events as Record<string, unknown>;
    for (const key of ['pre-commit', 'post-commit', 'pre-push', 'post-merge'] as const) {
      const ev = events[key];
      if (ev && typeof ev === 'object') {
        const e = ev as Record<string, unknown>;
        if (!merged.events[key]) {
          merged.events[key] = {} as never;
        }
        if (e.enabled !== undefined && typeof e.enabled === 'boolean') {
          (merged.events[key] as Record<string, unknown>)!['enabled'] = e.enabled;
        }
        if (e.agentPrompt && typeof e.agentPrompt === 'string') {
          (merged.events[key] as Record<string, unknown>)!['agentPrompt'] = e.agentPrompt;
        }
      }
    }
  }

  return merged;
}
