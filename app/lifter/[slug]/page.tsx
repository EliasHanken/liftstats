import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import {
  getLifterBySlug,
  getLifterMeets,
  getLifterAggregates,
  getLifterRivals,
} from '@/lib/db/queries/lifter';
import { LifterHeader } from '@/components/lifter/Header';
import { EqVsRawCard } from '@/components/lifter/EqVsRawCard';
import { GlProgressionChart } from '@/components/lifter/GlProgressionChart';
import { MeetsTable } from '@/components/lifter/MeetsTable';
import { AttemptSuccessCard } from '@/components/lifter/AttemptSuccessCard';
import { RivalsPanel } from '@/components/lifter/RivalsPanel';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24h fallback; cache tags invalidated on weekly ingest

type Params = { params: Promise<{ slug: string }> };

// Using unstable_cache (stable API) rather than 'use cache' + cacheTag, which
// requires experimental.useCache. Tags allow per-lifter invalidation from the
// weekly OPL ingest cron route via revalidateTag('lifter').
const loadProfile = unstable_cache(
  async (slug: string) => {
    const lifter = await getLifterBySlug(db, slug);
    if (!lifter) return null;

    const [meets, agg, rivals] = await Promise.all([
      getLifterMeets(db, lifter.id),
      getLifterAggregates(db, lifter.id),
      getLifterRivals(db, lifter.id, { limit: 5 }),
    ]);

    return { lifter, meets, agg, rivals };
  },
  ['lifter-profile'],
  { revalidate: 86400, tags: ['lifters'] },
);

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const lifter = await getLifterBySlug(db, slug);
  if (!lifter) return { title: 'Lifter not found' };
  return {
    title: `${lifter.name} — Liftstats`,
    description: `Powerlifting profile for ${lifter.name}. Meets, GL progression, equipped vs raw.`,
  };
}

export default async function LifterPage({ params }: Params) {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) notFound();
  const { lifter, meets, agg, rivals } = profile;
  const bestGl =
    agg.bestEqGl && (!agg.bestRawGl || Number(agg.bestEqGl) > Number(agg.bestRawGl))
      ? agg.bestEqGl
      : agg.bestRawGl;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <LifterHeader lifter={lifter} agg={agg} />
        <EqVsRawCard agg={agg} meets={meets} />
        <GlProgressionChart meets={meets} />
        <AttemptSuccessCard meets={meets} />
        <MeetsTable meets={meets} />
        <RivalsPanel rivals={rivals} myBestGl={bestGl} />
      </div>
    </main>
  );
}
