import { parse } from 'csv-parse';
import type { Readable } from 'node:stream';
import { and, inArray } from 'drizzle-orm';
import { transformRow } from './transform';
import type { OplRawRow, NormalizedRow, ParsedAttempt } from './types';
import { upsertLifters, upsertMeets, upsertEntries, upsertAttemptsFromOpl, type AttemptBatch } from './upsert';
import { recomputeFlightSizes } from './flight';
import { entry } from '@/lib/db/schema';

export type FetchCsv = () => Promise<Readable>;

export type RunResult = {
  rowsAdded: number;
  rowsSkipped: number;
  lifters: number;
  meets: number;
  durationMs: number;
};

export type RunDeps = {
  db: any;
  fetchCsv: FetchCsv;
  batchSize?: number;
  onProgress?: (rowsRead: number) => void;
};

export async function runOplIngest(deps: RunDeps): Promise<RunResult> {
  const { db, fetchCsv, batchSize = 1000, onProgress } = deps;
  const start = Date.now();

  const stream = await fetchCsv();
  const parser = parse({ columns: true, trim: true, skip_empty_lines: true });
  stream.pipe(parser);

  const allLifters = new Set<string>();
  const allMeets = new Set<string>();
  let rowsAdded = 0;
  let rowsSkipped = 0;
  let rowsRead = 0;
  let batch: NormalizedRow[] = [];

  async function flush() {
    if (batch.length === 0) return;
    const lifterIds = await upsertLifters(db, batch);
    const meetIds = await upsertMeets(db, batch);
    rowsAdded += await upsertEntries(db, batch, lifterIds, meetIds);

    // Collect attempt batches for entries we should populate (date>=2010).
    const ATTEMPT_DATE_CUTOFF = '2010-01-01';
    const wantKeys: { key: string; lifterId: number; meetId: number; equipment: string; weightClassKg: string; attempts: ParsedAttempt[] }[] = [];
    for (const r of batch) {
      if (r.entry.attempts.length === 0) continue;
      if (r.meet.date < ATTEMPT_DATE_CUTOFF) continue;
      const lifterId = lifterIds.get(r.lifter.slug);
      const meetId = meetIds.get(r.meet.sourceMeetId);
      if (lifterId === undefined || meetId === undefined) continue;
      wantKeys.push({
        key: `${lifterId}|${meetId}|${r.entry.equipment}|${r.entry.weightClassKg}`,
        lifterId, meetId,
        equipment: r.entry.equipment,
        weightClassKg: r.entry.weightClassKg,
        attempts: r.entry.attempts,
      });
    }
    if (wantKeys.length > 0) {
      const meetIdsList = Array.from(new Set(wantKeys.map((w) => w.meetId)));
      const lifterIdsList = Array.from(new Set(wantKeys.map((w) => w.lifterId)));
      const entryRows: { id: number; lifterId: number; meetId: number; equipment: string; weightClassKg: string }[] = await db
        .select({
          id: entry.id,
          lifterId: entry.lifterId,
          meetId: entry.meetId,
          equipment: entry.equipment,
          weightClassKg: entry.weightClassKg,
        })
        .from(entry)
        .where(and(inArray(entry.meetId, meetIdsList), inArray(entry.lifterId, lifterIdsList)));
      const idByKey = new Map<string, number>();
      for (const e of entryRows) {
        idByKey.set(`${e.lifterId}|${e.meetId}|${e.equipment}|${e.weightClassKg}`, e.id);
      }
      const batches: AttemptBatch[] = [];
      for (const w of wantKeys) {
        const id = idByKey.get(w.key);
        if (id !== undefined) batches.push({ entryId: id, attempts: w.attempts });
      }
      if (batches.length > 0) {
        await upsertAttemptsFromOpl(db, batches);
      }
    }

    for (const r of batch) {
      allLifters.add(r.lifter.slug);
      allMeets.add(r.meet.sourceMeetId);
    }
    batch = [];
  }

  for await (const raw of parser as AsyncIterable<OplRawRow>) {
    rowsRead++;
    const result = transformRow(raw);
    if (!result.ok) {
      rowsSkipped++;
      continue;
    }
    batch.push(result.row);
    if (batch.length >= batchSize) {
      await flush();
      if (onProgress) onProgress(rowsRead);
    }
  }

  await flush();
  await recomputeFlightSizes(db);

  return {
    rowsAdded,
    rowsSkipped,
    lifters: allLifters.size,
    meets: allMeets.size,
    durationMs: Date.now() - start,
  };
}
