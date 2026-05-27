import { desc, eq } from 'drizzle-orm';
import { ingestRun } from './schema';

type AnyDb = {
  select: (...args: unknown[]) => any;
};

export type IngestSummary = {
  status: 'running' | 'ok' | 'error';
  rowsAdded: number;
  rowsUpdated: number;
  finishedAt: string | null;
  error: string | null;
} | null;

export type HealthSummary = {
  opl: IngestSummary;
  goodlift: IngestSummary;
};

async function lastRun(db: AnyDb, source: 'opl' | 'goodlift'): Promise<IngestSummary> {
  const rows = await db
    .select()
    .from(ingestRun)
    .where(eq(ingestRun.source, source))
    .orderBy(desc(ingestRun.startedAt))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    status: r.status,
    rowsAdded: r.rowsAdded,
    rowsUpdated: r.rowsUpdated,
    finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
    error: r.error ?? null,
  };
}

export async function getHealthSummary(db: AnyDb): Promise<HealthSummary> {
  const [opl, goodlift] = await Promise.all([lastRun(db, 'opl'), lastRun(db, 'goodlift')]);
  return { opl, goodlift };
}
