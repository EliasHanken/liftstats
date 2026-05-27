import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHealthSummary } from '@/lib/db/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ingest = await getHealthSummary(db);
    return NextResponse.json({ status: 'ok', ingest });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
