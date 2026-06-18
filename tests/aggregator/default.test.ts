import { describe, expect, it } from 'vitest';
import { DefaultAggregator } from '../../src/aggregator/default.js';

describe('DefaultAggregator', () => {
  it('aggregates successful JSON responses', () => {
    const agg = new DefaultAggregator();
    const out = agg.aggregate([
      {
        provider: 'p1',
        response: {
          provider: 'p1',
          content: JSON.stringify({ summary: 's1', findings: [{ severity: 'low', message: 'm' }] }),
          raw: null,
        },
      },
    ]);
    expect(out.summary).toBe('s1');
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]?.message).toBe('m');
  });

  it('falls back to content as summary when not JSON', () => {
    const agg = new DefaultAggregator();
    const out = agg.aggregate([
      { provider: 'p1', response: { provider: 'p1', content: 'plain text', raw: 'plain text' } },
    ]);
    expect(out.summary).toBe('plain text');
    expect(out.findings).toHaveLength(0);
  });

  it('synthesizes a medium finding for failed outcomes', () => {
    const agg = new DefaultAggregator();
    const out = agg.aggregate([
      { provider: 'p1', response: { provider: 'p1', content: '', raw: null }, error: new Error('boom') },
    ]);
    expect(out.findings.some((f) => f.severity === 'medium' && f.message.includes('boom'))).toBe(true);
    expect(out.summary).toContain('boom');
  });

  it('combines findings and summaries from multiple outcomes', () => {
    const agg = new DefaultAggregator();
    const out = agg.aggregate([
      {
        provider: 'p1',
        response: {
          provider: 'p1',
          content: JSON.stringify({ summary: 'a', findings: [{ severity: 'low', message: 'x' }] }),
          raw: null,
        },
      },
      {
        provider: 'p2',
        response: {
          provider: 'p2',
          content: JSON.stringify({ summary: 'b', findings: [{ severity: 'high', message: 'y' }] }),
          raw: null,
        },
      },
    ]);
    expect(out.findings).toHaveLength(2);
    expect(out.summary).toContain('a');
    expect(out.summary).toContain('b');
  });
});
