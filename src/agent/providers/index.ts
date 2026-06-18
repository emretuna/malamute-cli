import type { Config } from '../../config/index.js';
import type { ProviderRegistry } from '../registry.js';
import { ClaudeCodeProvider } from './claude-code.js';

export function registerDefaults(registry: ProviderRegistry, config: Config): void {
  const ccConfig = config.providers['claude-code'];
  registry.register(
    new ClaudeCodeProvider({
      command: ccConfig?.command,
      timeoutMs: ccConfig?.timeoutMs,
    }),
  );
}
