import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

interface ComingSoonPageProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  requirements: string[];
}

export function ComingSoonPage({ eyebrow, title, description, icon: Icon, requirements }: ComingSoonPageProps) {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <section className="glass grid gap-10 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-12">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-champagne/30 bg-emerald-deep shadow-glow">
          <Icon className="h-9 w-9 text-champagne" strokeWidth={1.3} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Setup required</p>
          <h2 className="mt-3 font-serif text-3xl">This studio is not connected yet</h2>
          <p className="mt-3 max-w-xl text-sm text-slate-400">
            Nothing here is simulated. This feature will become available once the following is in place:
          </p>
          <ul className="mt-5 space-y-2.5">
            {requirements.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/products" className="btn-secondary mt-8">
            Go to My Products
          </Link>
        </div>
      </section>
    </div>
  );
}
