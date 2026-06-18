import fs from 'node:fs/promises';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { HookInstallError } from '../errors.js';

const SIMPLE_GIT_UNSAFE_OPTS = { unsafe: { allowUnsafeHooksPath: true } };

export async function installHooks(cwd: string, sourceDir: string): Promise<void> {
  try {
    const hooksDir = path.join(cwd, '.malamute', 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const src = path.join(sourceDir, entry.name);
      const dst = path.join(hooksDir, entry.name);
      await fs.copyFile(src, dst);
      await fs.chmod(dst, 0o755);
    }

    const absoluteHooksPath = path.join(cwd, '.malamute', 'hooks');
    await simpleGit(cwd, SIMPLE_GIT_UNSAFE_OPTS).raw(['config', 'core.hooksPath', absoluteHooksPath]);
  } catch (err) {
    throw new HookInstallError(
      `Failed to install hooks: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function uninstallHooks(cwd: string): Promise<void> {
  try {
    const git = simpleGit(cwd, SIMPLE_GIT_UNSAFE_OPTS);
    await git.raw(['config', '--unset', 'core.hooksPath']).catch(() => {
      // ignore if not set
    });
    await fs.rm(path.join(cwd, '.malamute'), { recursive: true, force: true });
  } catch (err) {
    throw new HookInstallError(
      `Failed to uninstall hooks: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function getInstalledHooksPath(cwd: string): Promise<string | null> {
  try {
    const result = await simpleGit(cwd, SIMPLE_GIT_UNSAFE_OPTS).raw(['config', '--get', 'core.hooksPath']);
    return result.trim() || null;
  } catch {
    return null;
  }
}
