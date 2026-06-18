import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from '../../src/agent/registry.js';
import { ProviderError } from '../../src/errors.js';
import type { AgentProvider } from '../../src/agent/types.js';

const fakeProvider: AgentProvider = {
  name: 'fake',
  isAvailable: async () => true,
  run: async () => ({ provider: 'fake', content: '', raw: null }),
};

describe('ProviderRegistry', () => {
  it('register and get', () => {
    const r = new ProviderRegistry();
    r.register(fakeProvider);
    expect(r.get('fake')).toBe(fakeProvider);
  });

  it('get returns undefined for unknown name', () => {
    const r = new ProviderRegistry();
    expect(r.get('nope')).toBeUndefined();
  });

  it('getOrThrow returns the provider', () => {
    const r = new ProviderRegistry();
    r.register(fakeProvider);
    expect(r.getOrThrow('fake')).toBe(fakeProvider);
  });

  it('getOrThrow throws ProviderError for unknown name', () => {
    const r = new ProviderRegistry();
    expect(() => r.getOrThrow('nope')).toThrow(ProviderError);
  });

  it('list returns all registered providers', () => {
    const r = new ProviderRegistry();
    r.register(fakeProvider);
    r.register({ ...fakeProvider, name: 'other' });
    expect(
      r
        .list()
        .map((p) => p.name)
        .sort(),
    ).toEqual(['fake', 'other']);
  });
});
