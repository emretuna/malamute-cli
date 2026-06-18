import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { getInstalledHooksPath, installHooks } from '../../git/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();

  const hooksPath = await getInstalledHooksPath(cwd);
  const hooksDir = hooksPath ? path.resolve(cwd, hooksPath) : path.join(cwd, '.malamute', 'hooks');

  if (await isFullyInstalled(hooksDir)) {
    console.log(`Already initialized. Hooks directory: ${hooksDir}`);
    return;
  }

  // Resolve bundled hook scripts.
  // tsup bundles everything into dist/cli/index.js, so __dirname at runtime is
  // <pkg>/dist/cli. Hooks are at <pkg>/dist/hooks.
  const distDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(distDir, 'hooks');

  await installHooks(cwd, sourceDir);
  console.log('Malamute initialized. Hooks installed at .malamute/hooks/.');
}

async function isFullyInstalled(hooksDir: string): Promise<boolean> {
  // A complete install means:
  //   1. The hooks directory exists.
  //   2. core.hooksPath points at it (caller already checked this).
  //   3. At least one of the bundled hook files exists and is executable.
  // We check (1) and (3) here. The caller guarantees (2) before calling.
  try {
    const stat = await fs.stat(hooksDir);
    if (!stat.isDirectory()) return false;
  } catch {
    return false;
  }

  const entries = await fs.readdir(hooksDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(hooksDir, entry.name);
    const fileStat = await fs.stat(fullPath);
    if (!(fileStat.mode & 0o111)) return false;
  }
  return entries.length > 0;
}
