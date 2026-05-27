import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { runOplIngest } from '@/lib/ingest/opl/runner';
import { lifter, meet, entry } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const FIXTURE = path.resolve('tests/ingest/opl/fixtures/sample-opl.csv');

function fixtureFetcher() {
  return async () => Readable.from(fs.createReadStream(FIXTURE));
}

describe('runOplIngest', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('ingests the fixture, skipping unsupported rows', async () => {
    const result = await runOplIngest({ db: t.db, fetchCsv: fixtureFetcher(), batchSize: 4 });
    expect(result.rowsAdded).toBe(9);             // 11 rows - 2 skipped (Straps, missing-name)
    expect(result.rowsSkipped).toBe(2);
    expect(result.lifters).toBe(7);               // John, Jesus, Sonita, Carola, Anna B, Beth K, DQ Lifter
    expect(result.meets).toBe(4);                 // WRPF Showdown, USAPL Open, IPF Worlds, Brit Open

    const allEntries = await t.db.select().from(entry);
    expect(allEntries).toHaveLength(9);

    // Jesus Olivares should have 2 entries (Raw + Single-ply)
    const jesus = await t.db.select().from(lifter).where(eq(lifter.slug, 'jesus-olivares'));
    const jesusEntries = await t.db.select().from(entry).where(eq(entry.lifterId, jesus[0].id));
    expect(jesusEntries).toHaveLength(2);
    const equipments = jesusEntries.map((e) => e.equipment).sort();
    expect(equipments).toEqual(['Raw', 'Single']);

    // flight_size for IPF Worlds women -76 Single-ply should be 3 (Carola, Anna B, Beth K)
    const carola = await t.db.select().from(lifter).where(eq(lifter.slug, 'carola-garra-f'));
    const carolaEntry = await t.db.select().from(entry).where(eq(entry.lifterId, carola[0].id));
    expect(carolaEntry[0].flightSize).toBe(3);

    // DQ row produces an entry with place=null
    const dqLifter = await t.db.select().from(lifter).where(eq(lifter.slug, 'dq-lifter'));
    const dqEntry = await t.db.select().from(entry).where(eq(entry.lifterId, dqLifter[0].id));
    expect(dqEntry[0].place).toBeNull();
  });

  it('is idempotent — running twice yields the same row counts', async () => {
    const r1 = await runOplIngest({ db: t.db, fetchCsv: fixtureFetcher(), batchSize: 4 });
    // second run: nothing new
    expect(r1.rowsAdded).toBe(0);
    expect(r1.rowsSkipped).toBe(2);
    const allEntries = await t.db.select().from(entry);
    expect(allEntries).toHaveLength(9);
  });
});
