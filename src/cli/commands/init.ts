import path from 'node:path';
import fs from 'node:fs/promises';
import { getInstalledHooksPath, installHooks } from '../../git/index.js';

// Resolve the dist/ directory relative to the running script.
// The CLI is bundled into <pkg>/dist/cli/index.js; hooks live at <pkg>/dist/hooks/.
// Using process.argv[1] (the script path) avoids ESM-specific syntax that
// conflicts with TypeScript's DTS generation.
const distDir = path.resolve(path.dirname(process.argv[1] || ''), '..');

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();

  const hooksPath = await getInstalledHooksPath(cwd);
  const hooksDir = hooksPath ? path.resolve(cwd, hooksPath) : path.join(cwd, '.malamute', 'hooks');

  if (await isFullyInstalled(hooksDir)) {
    console.log(`Already initialized. Hooks directory: ${hooksDir}`);
    return;
  }

  const sourceDir = path.join(distDir, 'hooks');
  await installHooks(cwd, sourceDir);
  console.log('Malamute initialized. Hooks installed at .malamute/hooks/.');
}

async function isFullyInstalled(hooksDir: string): Promise<boolean> {
  // A complete install means:
  //   1. The hooks directory exists as a directory.
  //   2. core.hooksPath points at it (caller guarantees this).
  //   3. The `pre-commit` hook file exists and is executable.
  // We intentionally do NOT require every file in the directory to be executable
  // — the directory may contain non-hook files (README, future hook variants)
  // that git never invokes.
  try {
    const stat = await fs.stat(hooksDir);
    if (!stat.isDirectory()) return false;
  } catch {
    return false;
  }

  try {
    const stat = await fs.stat(path.join(hooksDir, 'pre-commit'));
    if (!stat.isFile()) return false;
    if (!(stat.mode & 0o111)) return false;

    // Verify the hook file is actually a malamute hook by checking for the sentinel
    const content = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    if (!content.includes('# malamute hook')) return false;

    return true;
  } catch {
    return false;
  }
}
