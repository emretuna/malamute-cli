import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { load } from 'js-yaml';
import { ConfigSchema, type Config } from './schema.js';
import { defaultConfig } from './defaults.js';
import { ConfigError } from '../errors.js';

export async function loadConfig(cwd: string): Promise<Config> {
  const userRaw = await readRawConfig(
    path.join(os.homedir(), '.config', 'malamute', 'config.yaml'),
  );
  const projectRaw = await readRawConfig(path.join(cwd, '.malamute.yaml'));

  // Environment-specific overlay: .malamute.{NODE_ENV}.yaml wins over base
  const env = process.env['NODE_ENV'];
  const envRaw = env ? await readRawConfig(path.join(cwd, `.malamute.${env}.yaml`)) : null;

  // Start from defaults, overlay user → project → env-specific
  const config = structuredClone(defaultConfig);
  for (const raw of [userRaw, projectRaw, envRaw]) {
    if (!raw) continue;
    mergeInto(config, raw);
  }

  // Validate (catches invalid values from YAML)
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ConfigError(`Config validation failed: ${issues}`);
  }

  return result.data;
}

function mergeInto(config: Config, raw: Record<string, unknown>): void {
  if (raw.logLevel && typeof raw.logLevel === 'string') {
    config.logLevel = raw.logLevel as Config['logLevel'];
  }
  if (raw.providers && typeof raw.providers === 'object') {
    const p = raw.providers as Record<string, unknown>;
    if (p['claude-code'] && typeof p['claude-code'] === 'object') {
      const cc = p['claude-code'] as Record<string, unknown>;
      if (typeof cc.command === 'string') config.providers['claude-code'].command = cc.command;
      if (typeof cc.timeoutMs === 'number') config.providers['claude-code'].timeoutMs = cc.timeoutMs;
    }
  }
  if (raw.events && typeof raw.events === 'object') {
    const rawEvents = raw.events as Record<string, unknown>;
    const cfgEvents = config.events as Record<string, unknown>;
    for (const key of ['pre-commit', 'post-commit', 'pre-push', 'post-merge'] as const) {
      const ev = rawEvents[key];
      if (ev && typeof ev === 'object') {
        const e = ev as Record<string, unknown>;
        if (!cfgEvents[key]) {
          cfgEvents[key] = {};
        }
        if (typeof e.enabled === 'boolean') {
          (cfgEvents[key] as Record<string, unknown>)!['enabled'] = e.enabled;
        }
        if (typeof e.agentPrompt === 'string') {
          (cfgEvents[key] as Record<string, unknown>)!['agentPrompt'] = e.agentPrompt;
        }
      }
    }
  }
}

async function readRawConfig(filePath: string): Promise<Record<string, unknown> | null> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new ConfigError(
      `Failed to read config file ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = load(content);
  } catch (err) {
    throw new ConfigError(
      `Invalid YAML in ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return null;
}

