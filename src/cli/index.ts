import { createRequire } from 'node:module';
import { Command } from 'commander';
import { MalamuteError } from '../errors.js';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { configShowCommand, configValidateCommand, configPathCommand } from './commands/config.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('malamute')
  .version(pkg.version)
  .description('Malamute — repository intelligence for AI-native teams');

// init
program
  .command('init')
  .description('Install Malamute git hooks in this repository')
  .action(() => {
    initCommand().catch(handleError);
  });

// run
program
  .command('run <event>')
  .description('Run the pipeline for a given event (used by hooks)')
  .action((event: string) => {
    runCommand(event).catch(handleError);
  });

// config
const configCmd = program.command('config').description('Inspect and validate Malamute config');

configCmd
  .command('show')
  .description('Print the current configuration as YAML')
  .action(() => {
    configShowCommand().catch(handleError);
  });

configCmd
  .command('validate')
  .description('Validate the configuration')
  .action(() => {
    configValidateCommand().catch(handleError);
  });

configCmd
  .command('path')
  .description('Print the path to the project config file')
  .action(() => {
    configPathCommand().catch(handleError);
  });

function handleError(err: unknown): void {
  if (err instanceof MalamuteError) {
    const exitMap: Record<string, number> = {
      E_CONFIG: 2,
      E_PROVIDER: 3,
      E_GIT: 4,
      E_HOOK_INSTALL: 5,
    };
    console.error(err.message);
    process.exitCode = exitMap[err.code] ?? 1;
  } else if (err instanceof Error) {
    console.error(err.stack ?? err.message);
    process.exitCode = 1;
  } else {
    console.error(String(err));
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
}

main().catch(handleError);
