import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { searchLifters, searchLiftersRelaxed } from '@/lib/db/queries/search';
import { lifter } from '@/lib/db/schema';

describe('searchLifters', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    await t.db.insert(lifter).values([
      { slug: 'jesus-olivares', name: 'Jesus Olivares', sex: 'M', country: 'USA' },
      { slug: 'john-haack', name: 'John Haack', sex: 'M', country: 'USA' },
      { slug: 'jessica-buettner-f', name: 'Jessica Buettner', sex: 'F', country: 'CAN' },
      { slug: 'sonita-muluh-f', name: 'Sonita Muluh', sex: 'F', country: 'GBR' },
      { slug: 'taylor-atwood', name: 'Taylor Atwood', sex: 'M', country: 'USA' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('returns exact-match lifter at the top', async () => {
    const results = await searchLifters(t.db, { q: 'John Haack', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('john-haack');
  });

  it('matches partial fuzzy queries', async () => {
    const results = await searchLifters(t.db, { q: 'haack', limit: 5 });
    expect(results.some((r) => r.slug === 'john-haack')).toBe(true);
  });

  it('tolerates minor typos', async () => {
    const results = await searchLifters(t.db, { q: 'olivers', limit: 5 });
    expect(results.some((r) => r.slug === 'jesus-olivares')).toBe(true);
  });

  it('returns empty array for nonsense query', async () => {
    const results = await searchLifters(t.db, { q: 'zzzzzzzzz', limit: 5 });
    expect(results).toHaveLength(0);
  });

  it('respects the limit', async () => {
    const results = await searchLifters(t.db, { q: 'j', limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns slug, name, sex, country', async () => {
    const results = await searchLifters(t.db, { q: 'John', limit: 5 });
    expect(results[0]).toMatchObject({
      slug: expect.any(String),
      name: expect.any(String),
      sex: expect.stringMatching(/^[MF]$|^Mx$/),
    });
  });

  it('searchLiftersRelaxed returns hits even for low-similarity queries', async () => {
    const r = await searchLiftersRelaxed(t.db, { q: 'jhn', limit: 3 });
    expect(r.length).toBeGreaterThan(0);
    // 'jhn' is a low-similarity prefix of 'John Haack'
    expect(r.some((h) => h.slug === 'john-haack')).toBe(true);
  });

  it('searchLiftersRelaxed still returns empty for utterly nonsense queries', async () => {
    const r = await searchLiftersRelaxed(t.db, { q: 'xqzpw', limit: 3 });
    expect(r).toHaveLength(0);
  });
});
