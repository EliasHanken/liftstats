import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getFederationsForFilter } from '@/lib/db/queries/federations';
import { meet } from '@/lib/db/schema';

describe('getFederationsForFilter', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    const seed: { source: 'opl'; sourceMeetId: string; federation: string; date: string; name: string }[] = [];
    for (let i = 0; i < 100; i++) seed.push({ source: 'opl', sourceMeetId: `usapl-${i}`, federation: 'USAPL', date: '2024-01-01', name: `M${i}` });
    for (let i = 0; i < 50;  i++) seed.push({ source: 'opl', sourceMeetId: `ipf-${i}`,   federation: 'IPF',   date: '2024-01-01', name: `M${i}` });
    for (let i = 0; i < 30;  i++) seed.push({ source: 'opl', sourceMeetId: `epf-${i}`,   federation: 'EPF',   date: '2024-01-01', name: `M${i}` });
    for (let i = 0; i < 5;   i++) seed.push({ source: 'opl', sourceMeetId: `obs-${i}`,   federation: 'OBSCURE', date: '2024-01-01', name: `M${i}` });
    await t.db.insert(meet).values(seed);
  });
  afterAll(async () => { await t.close(); });

  it('returns pinned federations at the top, then ranked by count', async () => {
    const r = await getFederationsForFilter(t.db, { limit: 10 });
    expect(r[0]).toBe('IPF');
    expect(r[1]).toBe('EPF');
    expect(r.includes('USAPL')).toBe(true);
  });

  it('respects the limit', async () => {
    const r = await getFederationsForFilter(t.db, { limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });
});
