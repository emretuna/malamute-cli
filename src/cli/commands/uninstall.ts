import { getInstalledHooksPath, uninstallHooks } from '../../git/index.js';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function uninstallCommand(): Promise<void> {
  const cwd = process.cwd();

  const hooksPath = await getInstalledHooksPath(cwd);
  if (!hooksPath) {
    // Nothing to do, but verify there's no .malamute/ directory lingering.
    const stray = path.join(cwd, '.malamute');
    try {
      const stat = await fs.stat(stray);
      if (stat.isDirectory()) {
        await fs.rm(stray, { recursive: true, force: true });
        console.log('Removed stray .malamute/ directory.');
      }
    } catch {
      // nothing to do
    }
    console.log('Malamute is not installed in this repository.');
    return;
  }

  await uninstallHooks(cwd);
  console.log('Malamute uninstalled. Hooks removed and core.hooksPath cleared.');
}
