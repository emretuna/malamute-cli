import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { simpleGit } from 'simple-git';
import { getInstalledHooksPath } from '../../git/index.js';

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  const checks: Check[] = [];

  // 1. Inside a git repository?
  let repoRoot: string | null = null;
  try {
    repoRoot = (await simpleGit(cwd).revparse(['--show-toplevel'])).trim();
    checks.push({ name: 'In a git repository', pass: true, detail: repoRoot });
  } catch {
    checks.push({
      name: 'In a git repository',
      pass: false,
      detail: 'No git repository found at ' + cwd,
    });
  }

  // 2. core.hooksPath set?
  const hooksPathRaw = repoRoot ? await getInstalledHooksPath(repoRoot) : null;
  const hooksPath = hooksPathRaw
    ? path.isAbsolute(hooksPathRaw)
      ? hooksPathRaw
      : path.join(repoRoot ?? cwd, hooksPathRaw)
    : null;
  checks.push({
    name: 'core.hooksPath is set',
    pass: hooksPath !== null,
    detail: hooksPath ?? 'git config core.hooksPath is unset. Run `malamute init`.',
  });

  // 3. The directory exists?
  let hooksDirExists = false;
  if (hooksPath) {
    try {
      const stat = await fsp.stat(hooksPath);
      hooksDirExists = stat.isDirectory();
      checks.push({
        name: 'Hooks directory exists',
        pass: hooksDirExists,
        detail: hooksPath,
      });
    } catch {
      checks.push({
        name: 'Hooks directory exists',
        pass: false,
        detail: `${hooksPath} not found. Run \`malamute init\`.`,
      });
    }
  } else {
    checks.push({
      name: 'Hooks directory exists',
      pass: false,
      detail: 'Skipped: core.hooksPath is not set.',
    });
  }

  // 4. Files present + executable?
  if (hooksDirExists && hooksPath) {
    const entries = await fsp.readdir(hooksPath, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile());
    if (files.length === 0) {
      checks.push({
        name: 'Hook files present',
        pass: false,
        detail: `${hooksPath} is empty. Run \`malamute init\`.`,
      });
    } else {
      for (const file of files) {
        const fullPath = path.join(hooksPath, file.name);
        const stat = await fsp.stat(fullPath);
        const isExec = (stat.mode & 0o111) !== 0;
        checks.push({
          name: `Hook file executable: ${file.name}`,
          pass: isExec,
          detail: isExec ? fullPath : `${fullPath} is not executable. Run \`malamute init\` to fix.`,
        });
      }
    }
  } else {
    checks.push({
      name: 'Hook files present',
      pass: false,
      detail: 'Skipped: hooks directory is missing.',
    });
  }

  // 5. malamute binary resolvable from the hook's vantage point?
  if (hooksPath) {
    const search = findMalamute(hooksPath);
    checks.push({
      name: 'malamute binary resolvable from hook',
      pass: search.found,
      detail: search.found
        ? (search.path ?? 'on PATH')
        : 'No `malamute` on PATH and no ancestor node_modules/.bin/malamute. Run `npm i -D malamute-cli` or `npm link`.',
    });
  } else {
    checks.push({
      name: 'malamute binary resolvable from hook',
      pass: false,
      detail: 'Skipped: hook not installed.',
    });
  }

  console.log('Malamute doctor\n');
  for (const check of checks) {
    const mark = check.pass ? 'OK' : 'FAIL';
    console.log(`[${mark}] ${check.name}`);
    console.log(`        ${check.detail}`);
  }

  const failed = checks.filter((c) => !c.pass);
  console.log();
  if (failed.length === 0) {
    console.log('All checks passed. The pre-commit hook should run on `git commit`.');
  } else {
    console.log(`${failed.length} check(s) failed.`);
  }

  if (failed.length > 0) process.exitCode = 1;
}

function findMalamute(startDir: string): { found: boolean; path: string | null } {
  // Same logic the hook script uses, ported to TypeScript for the doctor.
  try {
    const which = execFileSync('sh', ['-c', 'command -v malamute'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (which.trim()) return { found: true, path: null };
  } catch {
    // not on PATH
  }

  let dir = startDir;
  // Bound the search to a reasonable depth to avoid an infinite loop on weird FSes.
  for (let i = 0; i < 64; i++) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'malamute');
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && (stat.mode & 0o111) !== 0) {
        return { found: true, path: candidate };
      }
    } catch {
      // not here
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { found: false, path: null };
}
