import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from '../../../src/agent/registry.js';
import { registerDefaults } from '../../../src/agent/providers/index.js';
import { ClaudeCodeProvider } from '../../../src/agent/providers/claude-code.js';
import type { Config } from '../../../src/config/index.js';

describe('registerDefaults', () => {
  it('registers ClaudeCodeProvider from config', () => {
    const config = {
      providers: {
        'claude-code': {
          command: 'my-claude',
          timeoutMs: 30000,
        },
      },
    } as unknown as Config;

    const registry = new ProviderRegistry();
    registerDefaults(registry, config);

    const provider = registry.get('claude-code');
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(ClaudeCodeProvider);
    expect(provider!.command).toBe('my-claude');
  });

  it('uses default command when config omits it', () => {
    const config = { providers: { 'claude-code': {} } } as unknown as Config;

    const registry = new ProviderRegistry();
    registerDefaults(registry, config);

    const provider = registry.get('claude-code');
    expect(provider).toBeDefined();
    expect(provider!.command).toBe('claude');
  });
});
