import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../../config/index.js';
import { ConfigError } from '../../errors.js';
import { dump } from 'js-yaml';

export async function configShowCommand(): Promise<void> {
  const cwd = process.cwd();
  try {
    const config = await loadConfig(cwd);
    console.log(dump(config as unknown as Record<string, unknown>));
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}

export async function configValidateCommand(): Promise<void> {
  const cwd = process.cwd();
  try {
    await loadConfig(cwd);
    console.log('Valid.');
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}

export async function configPathCommand(): Promise<void> {
  const cwd = process.cwd();
  const projectConfig = path.join(cwd, '.malamute.yaml');
  try {
    await fs.access(projectConfig);
    console.log(projectConfig);
  } catch {
    console.log('<none>');
  }
}
