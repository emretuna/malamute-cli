import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getInstalledHooksPath, installHooks } from '../../git/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  const hooksPath = await getInstalledHooksPath(cwd);
  if (hooksPath?.endsWith('.malamute/hooks')) {
    console.log('Already initialized.');
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
