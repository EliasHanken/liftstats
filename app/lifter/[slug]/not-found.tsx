import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-3">Lifter not found</h1>
      <p className="text-zinc-400 mb-6">No lifter exists with that slug.</p>
      <Link href="/search" className="text-cyan-400 hover:text-cyan-300">Search lifters →</Link>
    </main>
  );
}
