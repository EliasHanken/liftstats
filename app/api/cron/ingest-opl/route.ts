import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { ingestRun } from '@/lib/db/schema';
import { runOplIngest } from '@/lib/ingest/opl/runner';
import { defaultFetchCsv } from '@/lib/ingest/opl/fetcher';
import { eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 800;  // Fluid Compute Pro ceiling

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Record a "running" ingest_run we can later finalize.
  const [run] = await db
    .insert(ingestRun)
    .values({ source: 'opl', status: 'running' })
    .returning({ id: ingestRun.id });

  try {
    const result = await runOplIngest({ db, fetchCsv: defaultFetchCsv });
    await db
      .update(ingestRun)
      .set({
        status: 'ok',
        finishedAt: new Date(),
        rowsAdded: result.rowsAdded,
        rowsUpdated: 0, // we don't distinguish updates from no-ops in this version
      })
      .where(eq(ingestRun.id, run.id));

    // Broad invalidation: weekly cadence, low-cost to flush everything.
    // Next.js 16 requires a second `profile` argument; pass empty config.
    revalidateTag('nations', {});
    revalidateTag('search', {});
    revalidateTag('lifters', {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    await db
      .update(ingestRun)
      .set({ status: 'error', finishedAt: new Date(), error: msg })
      .where(eq(ingestRun.id, run.id));
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
