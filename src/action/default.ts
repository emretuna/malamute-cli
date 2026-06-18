import type { ActionExecutor, ActionInput } from './types.js';

export class DefaultExecutor implements ActionExecutor {
  readonly name = 'default';

  async execute(input: ActionInput): Promise<number> {
    const { decision, findings, summary } = input;

    switch (decision) {
      case 'allow':
        process.stdout.write(summary + '\n');
        return 0;

      case 'warn': {
        process.stderr.write(`WARN: ${summary}\n`);
        for (const f of findings) {
          const location = f.file ? ` [${f.file}${f.line ? `:${f.line}` : ''}]` : '';
          process.stderr.write(`  WARN:${location} ${f.message}\n`);
        }
        return 0;
      }

      case 'block': {
        process.stderr.write(`BLOCK: ${summary}\n`);
        for (const f of findings) {
          const location = f.file ? ` [${f.file}${f.line ? `:${f.line}` : ''}]` : '';
          process.stderr.write(`  BLOCK:${location} ${f.message}\n`);
        }
        return 1;
      }
    }
  }
}
