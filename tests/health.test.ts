import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getHealthSummary } from '@/lib/db/health';
import { ingestRun } from '@/lib/db/schema';

describe('getHealthSummary', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('returns null per source when no runs exist', async () => {
    const result = await getHealthSummary(t.db);
    expect(result).toEqual({ opl: null, goodlift: null });
  });

  it('returns the latest run for each source', async () => {
    // Insert with explicit startedAt to avoid timestamp collision:
    // pglite runs so fast that defaultNow() produces the same value for
    // multiple rows inserted in the same batch. We use explicit timestamps
    // spaced 1 second apart to guarantee deterministic ordering.
    const t1 = new Date('2024-01-01T00:00:00Z');
    const t2 = new Date('2024-01-01T00:00:01Z'); // 1 second later → newer
    await t.db.insert(ingestRun).values([
      { source: 'opl', status: 'ok', rowsAdded: 100, startedAt: t1 },
      { source: 'opl', status: 'ok', rowsAdded: 200, startedAt: t2 }, // newer
      { source: 'goodlift', status: 'error', error: 'boom' },
    ]);
    const result = await getHealthSummary(t.db);
    expect(result.opl).toMatchObject({ status: 'ok', rowsAdded: 200 });
    expect(result.goodlift).toMatchObject({ status: 'error' });
  });
});
