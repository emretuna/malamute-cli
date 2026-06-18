import type { PolicyEngine, PolicyInput } from './types.js';
import type { ActionDecision } from '../types/result.js';

export class DefaultPolicyEngine implements PolicyEngine {
  readonly name = 'default';

  evaluate(input: PolicyInput): ActionDecision {
    const { findings } = input.result;

    for (const f of findings) {
      if (f.severity === 'high') return 'block';
    }
    for (const f of findings) {
      if (f.severity === 'medium') return 'warn';
    }
    return 'allow';
  }
}
