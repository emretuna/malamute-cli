import { describe, expect, it } from 'vitest';
import { DefaultRouter } from '../../src/router/default.js';
import { ProviderRegistry } from '../../src/agent/registry.js';
import { ProviderError } from '../../src/errors.js';
import type { AgentProvider } from '../../src/agent/types.js';

const fake: AgentProvider = {
  name: 'fake',
  isAvailable: async () => true,
  run: async () => ({ provider: 'fake', content: '', raw: null }),
};

describe('DefaultRouter', () => {
  it('routes to the preferred provider when registered', () => {
    const r = new ProviderRegistry();
    r.register(fake);
    const router = new DefaultRouter(r);
    const decision = router.route({ task: { prompt: 'x' }, preferredProvider: 'fake' });
    expect(decision.provider).toBe(fake);
  });

  it('routes to claude-code by default', () => {
    const r = new ProviderRegistry();
    const cc: AgentProvider = { ...fake, name: 'claude-code' };
    r.register(cc);
    const router = new DefaultRouter(r);
    const decision = router.route({ task: { prompt: 'x' } });
    expect(decision.provider.name).toBe('claude-code');
  });

  it('throws ProviderError on unknown provider', () => {
    const r = new ProviderRegistry();
    const router = new DefaultRouter(r);
    expect(() => router.route({ task: { prompt: 'x' }, preferredProvider: 'nope' })).toThrow(ProviderError);
  });
});
