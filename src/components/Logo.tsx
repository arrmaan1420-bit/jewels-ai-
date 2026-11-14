import { Gem } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-champagne/40 bg-emerald-deep shadow-glow transition-transform duration-300 group-hover:scale-105">
        <Gem className="h-5 w-5 text-champagne" strokeWidth={1.5} />
      </span>
      {!compact && (
        <span className="font-serif text-2xl font-semibold tracking-[0.18em] text-white">
          JEWELS <span className="text-emerald-400">AI</span>
        </span>
      )}
    </Link>
  );
}
