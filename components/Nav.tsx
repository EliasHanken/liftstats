import Link from 'next/link';

export function Nav() {
  return (
    <nav className="border-b border-zinc-900 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-baseline gap-6 text-sm">
        <Link href="/" className="text-zinc-50 font-semibold tracking-tight">Liftstats</Link>
        <Link href="/rankings" className="text-zinc-400 hover:text-zinc-100">Rankings</Link>
        <Link href="/nations"  className="text-zinc-400 hover:text-zinc-100">Nations</Link>
        <Link href="/search"   className="text-zinc-400 hover:text-zinc-100">Search</Link>
      </div>
    </nav>
  );
}
