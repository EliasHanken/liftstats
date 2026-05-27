import { parse } from 'csv-parse';
import type { Readable } from 'node:stream';
import { transformRow } from './transform';
import type { OplRawRow, NormalizedRow } from './types';
import { upsertLifters, upsertMeets, upsertEntries } from './upsert';
import { recomputeFlightSizes } from './flight';

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
