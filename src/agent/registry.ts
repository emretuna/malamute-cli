import type { AgentProvider } from './types.js';
import { ProviderError } from '../errors.js';

export class ProviderRegistry {
  private readonly providers = new Map<string, AgentProvider>();

  register(provider: AgentProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): AgentProvider | undefined {
    return this.providers.get(name);
  }

  getOrThrow(name: string): AgentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderError(
        `Provider not found: "${name}". Available: ${
          this.list()
            .map((p) => p.name)
            .join(', ') || 'none'
        }`,
      );
    }
    return provider;
  }

  list(): AgentProvider[] {
    return Array.from(this.providers.values());
  }
}
