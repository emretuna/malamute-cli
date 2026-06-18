import { describe, expect, it } from 'vitest';
import { DefaultPolicyEngine } from '../../src/policy/default.js';
import { defaultConfig } from '../../src/config/defaults.js';

const makeResult = (findings: { severity: 'low' | 'medium' | 'high'; message: string }[]) => ({
  provider: 'test',
  summary: '',
  findings,
  raw: null,
});

describe('DefaultPolicyEngine', () => {
  const engine = new DefaultPolicyEngine();

  it('block when any finding is high', () => {
    expect(
      engine.evaluate({ result: makeResult([{ severity: 'high', message: 'x' }]), config: defaultConfig }),
    ).toBe('block');
  });

  it('block when high mixed with medium/low', () => {
    expect(
      engine.evaluate({
        result: makeResult([
          { severity: 'low', message: 'l' },
          { severity: 'medium', message: 'm' },
          { severity: 'high', message: 'h' },
        ]),
        config: defaultConfig,
      }),
    ).toBe('block');
  });

  it('warn when any finding is medium (no high)', () => {
    expect(
      engine.evaluate({
        result: makeResult([
          { severity: 'low', message: 'l' },
          { severity: 'medium', message: 'm' },
        ]),
        config: defaultConfig,
      }),
    ).toBe('warn');
  });

  it('allow when no findings', () => {
    expect(engine.evaluate({ result: makeResult([]), config: defaultConfig })).toBe('allow');
  });

  it('allow when only low findings', () => {
    expect(
      engine.evaluate({ result: makeResult([{ severity: 'low', message: 'l' }]), config: defaultConfig }),
    ).toBe('allow');
  });
});
