import { describe, it, expect, beforeAll } from 'vitest';
import { parseCompetitionDetail } from '@/lib/ingest/goodlift/parse-detail';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('parseCompetitionDetail', () => {
  let html: string;
  beforeAll(async () => {
    html = await fs.readFile(
      path.resolve('tests/ingest/goodlift/fixtures/onecompetition-dtl-1046.html'),
      'utf8',
    );
  });

  it('returns lifter rows', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    expect(lifters.length).toBeGreaterThan(20);
  });

  it('each lifter has exactly 9 attempts (3 lifts × 3 attempts)', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    for (const l of lifters) {
      expect(l.attempts).toHaveLength(9);
      const liftCounts = { SQ: 0, BP: 0, DL: 0 };
      for (const a of l.attempts) liftCounts[a.lift]++;
      expect(liftCounts).toEqual({ SQ: 3, BP: 3, DL: 3 });
      const nos = new Set(l.attempts.map((a) => a.attemptNo));
      expect(nos.size).toBeLessThanOrEqual(3);
    }
  });

  it('captures made/missed correctly', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    // The first lifter in -59kg of IPF Worlds 2024 is Campano Diaz Ivan with
    // all three squats made: 200/210/215.
    const ivan = lifters.find((l) => l.name.includes('Campano Diaz'));
    expect(ivan).toBeDefined();
    const sqs = ivan!.attempts.filter((a) => a.lift === 'SQ').sort((a, b) => a.attemptNo - b.attemptNo);
    expect(sqs[0]).toMatchObject({ lift: 'SQ', attemptNo: 1, result: 'good' });
    expect(sqs[1]).toMatchObject({ lift: 'SQ', attemptNo: 2, result: 'good' });
    expect(sqs[2]).toMatchObject({ lift: 'SQ', attemptNo: 3, result: 'good' });
    expect(sqs[0].weightKg).toBeCloseTo(200.0, 1);
    expect(sqs[2].weightKg).toBeCloseTo(215.0, 1);
  });

  it('captures weight class as a string with +/- prefix', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    const ivan = lifters.find((l) => l.name.includes('Campano Diaz'));
    expect(ivan!.weightClassKg).toBe('-59');
  });

  it('captures country ISO-3 code', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    const ivan = lifters.find((l) => l.name.includes('Campano Diaz'));
    expect(ivan!.countryIso3).toBe('ESP');
  });

  it('captures totalKg and place', () => {
    const lifters = parseCompetitionDetail(html, { equipmentHint: 'Raw' });
    const ivan = lifters.find((l) => l.name.includes('Campano Diaz'));
    expect(ivan!.totalKg).toBeCloseTo(637.5, 1);
    expect(ivan!.place).toBe(2);
  });
});
